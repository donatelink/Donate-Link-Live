-- DonateLink — cause pools + automatic allocation (FYP-2)
-- Run this in the Supabase SQL Editor, AFTER stripe.sql. Safe to re-run.
--
-- Donations flow into one pool per (NGO, cause). The NGO records spending
-- from a pool with ONE receipt; the database splits that spending across the
-- pool's donations, oldest first, and moves each donation's stage forward on
-- its own. The money maths happens here, in the database, so it is exact and
-- cannot be bypassed from the browser.

-- ───────────────────────────────────────────────────────────── 1. Columns
alter table public.donations
  add column if not exists net_amount       numeric,  -- what the NGO actually received (card: after Stripe fee); null = amount
  add column if not exists allocated_amount numeric not null default 0,
  add column if not exists manual_stages    boolean not null default false;

-- Donations an NGO already advanced by hand (stage 3+) keep their manual
-- proofs and are counted as already spent, so they never enter a pool twice.
update public.donations
   set allocated_amount = coalesce(net_amount, amount),
       manual_stages    = true
 where stage >= 3 and allocated_amount = 0 and manual_stages = false;

-- ───────────────────────────────────────────────────────────── 2. Tables
create table if not exists public.ngo_expenses (
  id                     uuid primary key default gen_random_uuid(),
  ngo_id                 uuid not null references public.ngos(id) on delete cascade,
  cause                  text not null,
  title                  text not null check (length(trim(title)) > 0),
  amount                 numeric not null check (amount > 0),
  beneficiary_request_id uuid references public.beneficiary_requests(id) on delete set null,
  receipt_url            text not null,
  delivery_proof_url     text,
  status                 text not null default 'transferred'
                           check (status in ('transferred', 'completed')),
  spent_on               date not null default current_date,
  created_at             timestamptz not null default now(),
  completed_at           timestamptz
);

create index if not exists ngo_expenses_ngo_idx on public.ngo_expenses (ngo_id);
create index if not exists ngo_expenses_request_idx on public.ngo_expenses (beneficiary_request_id);

create table if not exists public.donation_allocations (
  id          uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations(id) on delete cascade,
  expense_id  uuid not null references public.ngo_expenses(id) on delete cascade,
  amount      numeric not null check (amount > 0),
  created_at  timestamptz not null default now(),
  unique (donation_id, expense_id)
);

create index if not exists donation_allocations_expense_idx on public.donation_allocations (expense_id);

-- ───────────────────────────────────────────────────────────── 3. Donation guard
-- Replaces the version from stripe.sql. Adds: net_amount / allocated_amount /
-- manual_stages are server-only too, and the pool functions below may update
-- donations by raising the 'donatelink.system' flag for their own transaction.
create or replace function public.donations_guard()
returns trigger
language plpgsql
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or coalesce(current_setting('donatelink.system', true), '') = 'on' then
    return new; -- server-side (service role) or a pool function: trusted
  end if;

  if tg_op = 'INSERT' then
    -- A new donation always starts unpaid at Stage 1, whatever the client sent.
    new.stage := 1;
    new.stripe_session_id := null;
    new.stripe_payment_intent := null;
    new.payment_status := case when new.payment_method = 'stripe' then 'pending' else null end;
    new.net_amount := null;
    new.allocated_amount := 0;
    new.manual_stages := false;
    return new;
  end if;

  if new.payment_status        is distinct from old.payment_status
  or new.stripe_session_id     is distinct from old.stripe_session_id
  or new.stripe_payment_intent is distinct from old.stripe_payment_intent
  or new.payment_method        is distinct from old.payment_method
  or new.amount                is distinct from old.amount
  or new.ngo_id                is distinct from old.ngo_id
  or new.donor_id              is distinct from old.donor_id
  or new.net_amount            is distinct from old.net_amount
  or new.allocated_amount      is distinct from old.allocated_amount
  or new.manual_stages         is distinct from old.manual_stages then
    raise exception 'Payment details of a donation can only be changed by the server';
  end if;

  -- An unpaid card donation cannot be confirmed by hand — Stripe must confirm it.
  if old.payment_method = 'stripe'
     and old.payment_status in ('pending', 'failed')
     and new.stage is distinct from old.stage then
    raise exception 'This card donation has not been paid yet';
  end if;

  -- Past Stage 2, a pooled donation moves only through recorded spending.
  if not old.manual_stages and old.stage >= 2 and new.stage is distinct from old.stage then
    raise exception 'This donation advances automatically when its cause pool is spent';
  end if;

  -- The donor may only move their own donation 1 -> 2, and only with an on-chain tx.
  if old.donor_id = uid
     and new.stage is distinct from old.stage
     and not (old.stage = 1 and new.stage = 2 and new.tx_hash is not null)
     and not exists (select 1 from public.ngos
                     where ngos.id = old.ngo_id and ngos.user_id = uid) then
    raise exception 'Only the NGO can advance a donation''s stage';
  end if;

  return new;
end;
$$;

drop trigger if exists donations_guard on public.donations;
create trigger donations_guard
  before insert or update on public.donations
  for each row execute function public.donations_guard();

-- ───────────────────────────────────────────────────────────── 4. Stage engine
-- Moves one donation forward from its allocations:
--   partly spent -> 3 Allocated, fully spent -> 4 Transferred,
--   fully spent and every expense it funded delivered -> 5 Completed.
-- Each stage passed gets a timeline entry so the donor's lifecycle view fills in.
create or replace function public.recompute_donation_stage(d_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d          public.donations%rowtype;
  net        numeric;
  all_done   boolean;
  target     int;
  s          int;
  titles     text;
  last_proof text;
begin
  select * into d from public.donations where id = d_id for update;
  if not found or d.manual_stages or d.allocated_amount <= 0 then
    return;
  end if;

  net := coalesce(d.net_amount, d.amount);
  if d.allocated_amount < net then
    target := 3;
  else
    select bool_and(e.status = 'completed') into all_done
      from public.donation_allocations a
      join public.ngo_expenses e on e.id = a.expense_id
     where a.donation_id = d_id;
    target := case when all_done then 5 else 4 end;
  end if;

  if target <= d.stage then
    return; -- stages only move forward
  end if;

  select string_agg(e.title, '; ' order by a.created_at) into titles
    from public.donation_allocations a
    join public.ngo_expenses e on e.id = a.expense_id
   where a.donation_id = d_id;

  perform set_config('donatelink.system', 'on', true);

  update public.donations set stage = target, updated_at = now() where id = d_id;

  for s in (d.stage + 1) .. target loop
    if s = 3 then
      insert into public.donation_updates (donation_id, stage, note)
      values (d_id, 3, 'Allocated from the ' || d.donation_type || ' pool to: ' || titles);
    elsif s = 4 then
      select e.receipt_url into last_proof
        from public.donation_allocations a
        join public.ngo_expenses e on e.id = a.expense_id
       where a.donation_id = d_id
       order by a.created_at desc limit 1;
      insert into public.donation_updates (donation_id, stage, note, proof_url)
      values (d_id, 4, 'Your full donation has been spent: ' || titles, last_proof);
    elsif s = 5 then
      select e.delivery_proof_url into last_proof
        from public.donation_allocations a
        join public.ngo_expenses e on e.id = a.expense_id
       where a.donation_id = d_id and e.delivery_proof_url is not null
       order by e.completed_at desc nulls last limit 1;
      insert into public.donation_updates (donation_id, stage, note, proof_url)
      values (d_id, 5, 'Everything your donation funded has been delivered.', last_proof);
    end if;
  end loop;

  perform set_config('donatelink.system', 'off', true);
end;
$$;

revoke execute on function public.recompute_donation_stage(uuid) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────── 5. Recording spending
-- BEFORE INSERT: validate and normalise what the NGO sent.
create or replace function public.ngo_expenses_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.beneficiary_requests%rowtype;
begin
  if auth.uid() is not null and not exists (
    select 1 from public.ngos where id = new.ngo_id and user_id = auth.uid()
  ) then
    raise exception 'You can only record spending for your own NGO';
  end if;

  if new.beneficiary_request_id is not null then
    select * into req from public.beneficiary_requests where id = new.beneficiary_request_id;
    if not found or req.ngo_id <> new.ngo_id then
      raise exception 'That beneficiary request does not belong to your NGO';
    end if;
    if req.status <> 'verified' or req.stage >= 4 then
      raise exception 'Only a verified request that has not been paid yet can be paid from a pool';
    end if;
    new.amount := req.amount; -- a payout always covers the full requested amount
  end if;

  new.amount := round(new.amount, 2);
  new.title := trim(new.title);
  new.status := 'transferred';
  new.delivery_proof_url := null;
  new.completed_at := null;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists ngo_expenses_before_insert on public.ngo_expenses;
create trigger ngo_expenses_before_insert
  before insert on public.ngo_expenses
  for each row execute function public.ngo_expenses_before_insert();

-- AFTER INSERT: draw the money from the pool, oldest donations first.
-- If the pool cannot cover it, the exception rolls the whole expense back.
create or replace function public.ngo_expenses_allocate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining numeric := new.amount;
  take      numeric;
  d         record;
begin
  for d in
    select id, coalesce(net_amount, amount) - allocated_amount as free
      from public.donations
     where ngo_id = new.ngo_id
       and donation_type = new.cause
       and stage >= 2
       and not manual_stages
       and coalesce(payment_status, 'paid') = 'paid'
       and coalesce(onchain_status, 'confirmed') = 'confirmed'
       and allocated_amount < coalesce(net_amount, amount)
     order by created_at, id
     for update
  loop
    exit when remaining <= 0;
    take := least(d.free, remaining);

    insert into public.donation_allocations (donation_id, expense_id, amount)
    values (d.id, new.id, take);

    perform set_config('donatelink.system', 'on', true);
    update public.donations
       set allocated_amount = allocated_amount + take, updated_at = now()
     where id = d.id;
    perform set_config('donatelink.system', 'off', true);

    remaining := remaining - take;
  end loop;

  if remaining > 0 then
    raise exception 'Not enough money in the % pool — short by $%', new.cause, round(remaining, 2);
  end if;

  -- Stages are recomputed after all rows are written, so each donation sees
  -- every allocation it received from this expense.
  for d in select donation_id from public.donation_allocations where expense_id = new.id loop
    perform public.recompute_donation_stage(d.donation_id);
  end loop;

  -- Paying a beneficiary request IS its transfer: move it to Stage 4 with this receipt.
  if new.beneficiary_request_id is not null then
    update public.beneficiary_requests
       set stage = 4, status = 'funded', updated_at = now()
     where id = new.beneficiary_request_id;
    insert into public.beneficiary_request_updates (request_id, stage, note, proof_url)
    values (new.beneficiary_request_id, 4,
            'Paid from the ' || new.cause || ' pool: ' || new.title, new.receipt_url);
  end if;

  return new;
end;
$$;

drop trigger if exists ngo_expenses_allocate on public.ngo_expenses;
create trigger ngo_expenses_allocate
  after insert on public.ngo_expenses
  for each row execute function public.ngo_expenses_allocate();

-- ───────────────────────────────────────────────────────────── 6. Delivery
-- Marks an expense delivered (with proof) and advances the donations it used.
create or replace function public.finish_expense(e_id uuid, proof text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
begin
  update public.ngo_expenses
     set status = 'completed', delivery_proof_url = coalesce(proof, delivery_proof_url), completed_at = now()
   where id = e_id and status = 'transferred';
  for a in select donation_id from public.donation_allocations where expense_id = e_id loop
    perform public.recompute_donation_stage(a.donation_id);
  end loop;
end;
$$;

revoke execute on function public.finish_expense(uuid, text) from public, anon, authenticated;

-- Called from the NGO dashboard for spending that is not a beneficiary payout.
create or replace function public.complete_expense(p_expense uuid, p_proof_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.ngo_expenses%rowtype;
begin
  select * into e from public.ngo_expenses where id = p_expense;
  if not found or not exists (
    select 1 from public.ngos where id = e.ngo_id and user_id = auth.uid()
  ) then
    raise exception 'Spending record not found';
  end if;
  if e.beneficiary_request_id is not null then
    raise exception 'A beneficiary payout completes when the beneficiary''s payout reaches Stage 5';
  end if;
  if coalesce(trim(p_proof_url), '') = '' then
    raise exception 'Delivery proof is required';
  end if;
  perform public.finish_expense(p_expense, p_proof_url);
end;
$$;

revoke execute on function public.complete_expense(uuid, text) from public, anon;
grant execute on function public.complete_expense(uuid, text) to authenticated;

-- Beneficiary payouts: Stage 4 can only be reached by paying from a pool, and
-- reaching Stage 5 (delivery proof) completes the expense that paid it.
create or replace function public.beneficiary_requests_pool_guard()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
     and old.stage < 4 and new.stage >= 4
     and not exists (select 1 from public.ngo_expenses where beneficiary_request_id = new.id) then
    raise exception 'Pay this request from a cause pool (Spending tab) to move it to Stage 4';
  end if;
  return new;
end;
$$;

drop trigger if exists beneficiary_requests_pool_guard on public.beneficiary_requests;
create trigger beneficiary_requests_pool_guard
  before update on public.beneficiary_requests
  for each row execute function public.beneficiary_requests_pool_guard();

create or replace function public.beneficiary_requests_on_delivered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  e     record;
  proof text;
begin
  if new.stage = 5 and old.stage < 5 then
    select proof_url into proof
      from public.beneficiary_request_updates
     where request_id = new.id and stage = 5 and proof_url is not null
     order by created_at desc limit 1;
    for e in select id from public.ngo_expenses
              where beneficiary_request_id = new.id and status = 'transferred' loop
      perform public.finish_expense(e.id, proof);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists beneficiary_requests_on_delivered on public.beneficiary_requests;
create trigger beneficiary_requests_on_delivered
  after update on public.beneficiary_requests
  for each row execute function public.beneficiary_requests_on_delivered();

-- ───────────────────────────────────────────────────────────── 7. Who can see what
-- All cross-table checks go through SECURITY DEFINER helpers so policies never
-- read each other's tables under RLS (that recursion broke the app once before).
create or replace function public.is_my_ngo(n_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ngos where id = n_id and user_id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_donation_funded_expense(e_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.donation_allocations a
    join public.donations d on d.id = a.donation_id
    where a.expense_id = e_id and d.donor_id = auth.uid()
  );
$$;

create or replace function public.expense_visible_to_me(e_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.ngo_expenses e
    left join public.beneficiary_requests br on br.id = e.beneficiary_request_id
    where e.id = e_id
      and (public.is_my_ngo(e.ngo_id) or br.beneficiary_id = auth.uid())
  ) or public.my_donation_funded_expense(e_id) or public.is_admin();
$$;

create or replace function public.owns_donation(d_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.donations where id = d_id and donor_id = auth.uid());
$$;

alter table public.ngo_expenses enable row level security;
alter table public.donation_allocations enable row level security;

drop policy if exists "view expenses" on public.ngo_expenses;
create policy "view expenses" on public.ngo_expenses
  for select using (public.expense_visible_to_me(id));

drop policy if exists "ngo records expenses" on public.ngo_expenses;
create policy "ngo records expenses" on public.ngo_expenses
  for insert with check (public.is_my_ngo(ngo_id));
-- No update/delete policies: spending records are permanent.

drop policy if exists "view allocations" on public.donation_allocations;
create policy "view allocations" on public.donation_allocations
  for select using (
    public.owns_donation(donation_id) or public.expense_visible_to_me(expense_id)
  );
-- No insert/update/delete policies: only the allocation trigger writes here.

-- A donor can also see the beneficiary request their donation reached through
-- a pool (extends the helper from donor_views_beneficiary_proof.sql).
create or replace function public.donor_can_view_request(req_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.donations d
    where d.beneficiary_request_id = req_id
      and d.donor_id = auth.uid()
  ) or exists (
    select 1 from public.donation_allocations a
    join public.ngo_expenses e on e.id = a.expense_id
    join public.donations d on d.id = a.donation_id
    where e.beneficiary_request_id = req_id
      and d.donor_id = auth.uid()
  );
$$;
