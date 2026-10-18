-- DonateLink — split one donation across several beneficiaries (FYP-2)
-- Run this in the Supabase SQL Editor, AFTER remove_cause_pools.sql. Safe to re-run.
--
-- At Stage 4 the NGO gives parts of a donation to verified beneficiaries, each
-- with its own transfer receipt: Jack's $150 -> Asad $100 + Sara $50. One
-- beneficiary can also be funded by several donations. The database checks the
-- totals so no donation is over-assigned and no beneficiary is over-paid.

create table if not exists public.donation_payouts (
  id                     uuid primary key default gen_random_uuid(),
  donation_id            uuid not null references public.donations(id) on delete cascade,
  beneficiary_request_id uuid not null references public.beneficiary_requests(id) on delete cascade,
  ngo_id                 uuid not null references public.ngos(id) on delete cascade,
  amount                 numeric not null check (amount > 0),
  receipt_url            text not null,
  created_at             timestamptz not null default now()
);

create index if not exists donation_payouts_donation_idx on public.donation_payouts (donation_id);
create index if not exists donation_payouts_request_idx on public.donation_payouts (beneficiary_request_id);

-- ───────────────────────────────────────────── Checks before a payout is saved
create or replace function public.donation_payouts_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d          public.donations%rowtype;
  r          public.beneficiary_requests%rowtype;
  given      numeric;
  received   numeric;
  assignable numeric;
begin
  -- Lock both rows so two payouts saved at once are checked one after the other.
  select * into d from public.donations where id = new.donation_id for update;
  select * into r from public.beneficiary_requests where id = new.beneficiary_request_id for update;
  if d.id is null or r.id is null then
    raise exception 'Donation or beneficiary request not found';
  end if;

  if auth.uid() is not null and not exists (
    select 1 from public.ngos where id = d.ngo_id and user_id = auth.uid()
  ) then
    raise exception 'You can only assign your own NGO''s donations';
  end if;
  if r.ngo_id <> d.ngo_id then
    raise exception 'That beneficiary request belongs to a different NGO';
  end if;
  if r.status not in ('verified', 'funded') then
    raise exception 'Only verified beneficiary requests can receive money';
  end if;
  if d.stage < 2
     or coalesce(d.payment_status, 'paid') <> 'paid'
     or coalesce(d.onchain_status, 'confirmed') <> 'confirmed' then
    raise exception 'This donation has not been paid yet';
  end if;

  new.amount := round(new.amount, 2);
  new.ngo_id := d.ngo_id;
  new.created_at := now();

  -- What the NGO actually received (card donations: after the Stripe fee).
  assignable := coalesce(d.net_amount, d.amount);
  select coalesce(sum(amount), 0) into given from public.donation_payouts where donation_id = d.id;
  if given + new.amount > assignable then
    raise exception 'Only $% of this donation is left to give', round(assignable - given, 2);
  end if;

  select coalesce(sum(amount), 0) into received
    from public.donation_payouts where beneficiary_request_id = r.id;
  if received + new.amount > r.amount then
    raise exception '% only needs $% more', r.beneficiary_name, round(r.amount - received, 2);
  end if;

  return new;
end;
$$;

drop trigger if exists donation_payouts_before_insert on public.donation_payouts;
create trigger donation_payouts_before_insert
  before insert on public.donation_payouts
  for each row execute function public.donation_payouts_before_insert();

-- ───────────────────────────────────────────── Beneficiary fully funded
-- Once payouts cover what the beneficiary asked for, their request is Funded and
-- moves to Stage 4 (Transferred) with the latest receipt as proof.
create or replace function public.donation_payouts_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r        public.beneficiary_requests%rowtype;
  received numeric;
  givers   int;
begin
  select * into r from public.beneficiary_requests where id = new.beneficiary_request_id;
  select coalesce(sum(amount), 0), count(distinct donation_id) into received, givers
    from public.donation_payouts where beneficiary_request_id = r.id;

  if received >= r.amount and r.status <> 'funded' then
    update public.beneficiary_requests
       set status = 'funded', stage = greatest(stage, 4), updated_at = now()
     where id = r.id;
    if r.stage < 4 then
      insert into public.beneficiary_request_updates (request_id, stage, note, proof_url)
      values (r.id, 4,
              'You received the full $' || r.amount || ' from ' || givers ||
              case when givers = 1 then ' donation.' else ' donations.' end,
              new.receipt_url);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists donation_payouts_after_insert on public.donation_payouts;
create trigger donation_payouts_after_insert
  after insert on public.donation_payouts
  for each row execute function public.donation_payouts_after_insert();

-- ───────────────────────────────────────────── Stage 5 needs the full amount
-- A donation that was (partly) given to beneficiaries can only be Completed once
-- all of it has been given. Donations spent generally are not affected.
create or replace function public.donations_payout_complete_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  given numeric;
begin
  if new.stage = 5 and old.stage < 5 then
    select coalesce(sum(amount), 0) into given from public.donation_payouts where donation_id = new.id;
    if given > 0 and given < coalesce(new.net_amount, new.amount) then
      raise exception 'Give the remaining $% to beneficiaries before completing this donation',
        round(coalesce(new.net_amount, new.amount) - given, 2);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists donations_payout_complete_guard on public.donations;
create trigger donations_payout_complete_guard
  before update on public.donations
  for each row execute function public.donations_payout_complete_guard();

-- ───────────────────────────────────────────── Who can see payouts
create or replace function public.payout_visible_to_me(p_donation uuid, p_request uuid, p_ngo uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.ngos where id = p_ngo and user_id = auth.uid())
      or exists (select 1 from public.donations where id = p_donation and donor_id = auth.uid())
      or exists (select 1 from public.beneficiary_requests where id = p_request and beneficiary_id = auth.uid())
      or exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

alter table public.donation_payouts enable row level security;

drop policy if exists "view payouts" on public.donation_payouts;
create policy "view payouts" on public.donation_payouts
  for select using (public.payout_visible_to_me(donation_id, beneficiary_request_id, ngo_id));

drop policy if exists "ngo records payouts" on public.donation_payouts;
create policy "ngo records payouts" on public.donation_payouts
  for insert with check (
    exists (select 1 from public.ngos where id = ngo_id and user_id = auth.uid())
  );
-- No update/delete policies: payouts are permanent.

-- Donors can open the payout track (and proof) of every beneficiary their
-- donation reached — through the old single link or through payouts.
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
    select 1 from public.donation_payouts p
    join public.donations d on d.id = p.donation_id
    where p.beneficiary_request_id = req_id
      and d.donor_id = auth.uid()
  );
$$;
