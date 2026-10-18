-- DonateLink — fundraising campaigns (FYP-2)
-- Run this in the Supabase SQL Editor, AFTER cause_pools.sql. Safe to re-run.
--
-- An NGO asks for a fixed amount ("$5,000 for school supplies"). Donors give
-- small amounts; once paid donations reach the goal the campaign closes on its
-- own. Campaign money is ring-fenced: it forms its own pool and can only be
-- spent on that campaign.

-- ───────────────────────────────────────────────────────────── 1. Tables
create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  ngo_id      uuid not null references public.ngos(id) on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  cause       text not null,
  goal        numeric not null check (goal > 0),
  description text,
  raised      numeric not null default 0,   -- paid donations only
  donor_count int not null default 0,
  status      text not null default 'active'
                check (status in ('active', 'completed', 'closed')),
  created_at  timestamptz not null default now(),
  ended_at    timestamptz
);

create index if not exists campaigns_ngo_idx on public.campaigns (ngo_id);
create index if not exists campaigns_status_idx on public.campaigns (status);

alter table public.donations
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
create index if not exists donations_campaign_idx on public.donations (campaign_id);

alter table public.ngo_expenses
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

-- ───────────────────────────────────────────────────────────── 2. Creating a campaign
create or replace function public.campaigns_before_insert()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_my_ngo(new.ngo_id) then
    raise exception 'You can only create campaigns for your own NGO';
  end if;
  new.title := trim(new.title);
  new.goal := round(new.goal, 2);
  new.raised := 0;
  new.donor_count := 0;
  new.status := 'active';
  new.created_at := now();
  new.ended_at := null;
  return new;
end;
$$;

drop trigger if exists campaigns_before_insert on public.campaigns;
create trigger campaigns_before_insert
  before insert on public.campaigns
  for each row execute function public.campaigns_before_insert();

alter table public.campaigns enable row level security;

drop policy if exists "anyone views campaigns" on public.campaigns;
create policy "anyone views campaigns" on public.campaigns
  for select using (true);

drop policy if exists "ngo creates campaigns" on public.campaigns;
create policy "ngo creates campaigns" on public.campaigns
  for insert with check (public.is_my_ngo(ngo_id));
-- No update/delete policies: progress is maintained by triggers, and closing
-- goes through close_campaign() below.

-- ───────────────────────────────────────────────────────────── 3. Donating to a campaign
-- Before a donation row is written: the campaign must be open, belong to the
-- same NGO, and have room left. Unfinished payments (card checkout open, MetaMask
-- pending) reserve their amount so two donors can't both take the last $40.
-- The campaign row is locked, so concurrent donations are checked one at a time.
create or replace function public.donations_campaign_reserve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c         public.campaigns%rowtype;
  committed numeric;
begin
  if new.campaign_id is null then
    return new;
  end if;

  select * into c from public.campaigns where id = new.campaign_id for update;
  if not found then
    raise exception 'Campaign not found';
  end if;
  if c.ngo_id <> new.ngo_id then
    raise exception 'That campaign belongs to a different NGO';
  end if;
  if c.status <> 'active' then
    raise exception 'This campaign is no longer accepting donations';
  end if;

  new.donation_type := c.cause;

  select coalesce(sum(amount), 0) into committed
    from public.donations
   where campaign_id = c.id
     and coalesce(payment_status, '') <> 'failed'
     and coalesce(onchain_status, '') <> 'failed'
     and (stage >= 2 or payment_status = 'pending' or onchain_status = 'pending');

  if committed + new.amount > c.goal then
    raise exception 'Only $% is left to reach this campaign''s goal', round(greatest(c.goal - committed, 0), 2);
  end if;

  return new;
end;
$$;

drop trigger if exists donations_campaign_reserve on public.donations;
create trigger donations_campaign_reserve
  before insert on public.donations
  for each row execute function public.donations_campaign_reserve();

-- Refreshes raised / donor_count from paid donations and closes the campaign
-- once the goal is met.
create or replace function public.recompute_campaign(c_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total  numeric;
  donors int;
begin
  select coalesce(sum(amount), 0), count(distinct donor_id)
    into total, donors
    from public.donations
   where campaign_id = c_id
     and stage >= 2
     and coalesce(payment_status, 'paid') = 'paid'
     and coalesce(onchain_status, 'confirmed') = 'confirmed';

  update public.campaigns
     set raised = total,
         donor_count = donors,
         status = case when status = 'active' and total >= goal then 'completed' else status end,
         ended_at = case when status = 'active' and total >= goal then now() else ended_at end
   where id = c_id;
end;
$$;

revoke execute on function public.recompute_campaign(uuid) from public, anon, authenticated;

create or replace function public.donations_campaign_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.campaign_id is not null
     and (new.stage is distinct from old.stage
          or new.payment_status is distinct from old.payment_status
          or new.onchain_status is distinct from old.onchain_status) then
    perform public.recompute_campaign(new.campaign_id);
  end if;
  return new;
end;
$$;

drop trigger if exists donations_campaign_progress on public.donations;
create trigger donations_campaign_progress
  after update on public.donations
  for each row execute function public.donations_campaign_progress();

-- The NGO may stop a campaign early. Donations already paid stay in its pool.
create or replace function public.close_campaign(p_campaign uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.campaigns%rowtype;
begin
  select * into c from public.campaigns where id = p_campaign;
  if not found or not public.is_my_ngo(c.ngo_id) then
    raise exception 'Campaign not found';
  end if;
  update public.campaigns
     set status = 'closed', ended_at = now()
   where id = p_campaign and status = 'active';
end;
$$;

revoke execute on function public.close_campaign(uuid) from public, anon;
grant execute on function public.close_campaign(uuid) to authenticated;

-- ───────────────────────────────────────────────────────────── 4. Ring-fenced pools
-- Replaces the versions from cause_pools.sql. Spending with a campaign_id draws
-- only from that campaign's donations; spending without one draws only from the
-- general cause pool (donations that are not part of any campaign).
create or replace function public.ngo_expenses_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.beneficiary_requests%rowtype;
  c   public.campaigns%rowtype;
begin
  if auth.uid() is not null and not exists (
    select 1 from public.ngos where id = new.ngo_id and user_id = auth.uid()
  ) then
    raise exception 'You can only record spending for your own NGO';
  end if;

  if new.campaign_id is not null then
    select * into c from public.campaigns where id = new.campaign_id;
    if not found or c.ngo_id <> new.ngo_id then
      raise exception 'That campaign does not belong to your NGO';
    end if;
    new.cause := c.cause;
  end if;

  if new.beneficiary_request_id is not null then
    select * into req from public.beneficiary_requests where id = new.beneficiary_request_id;
    if not found or req.ngo_id <> new.ngo_id then
      raise exception 'That beneficiary request does not belong to your NGO';
    end if;
    if req.status <> 'verified' or req.stage >= 4 then
      raise exception 'Only a verified request that has not been paid yet can be paid from a pool';
    end if;
    new.amount := req.amount;
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
  pool_name text;
begin
  for d in
    select id, coalesce(net_amount, amount) - allocated_amount as free
      from public.donations
     where ngo_id = new.ngo_id
       and (
             (new.campaign_id is null and campaign_id is null and donation_type = new.cause)
          or (new.campaign_id is not null and campaign_id = new.campaign_id)
           )
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
    if new.campaign_id is not null then
      select 'campaign "' || title || '"' into pool_name from public.campaigns where id = new.campaign_id;
    else
      pool_name := new.cause || ' pool';
    end if;
    raise exception 'Not enough money in the % — short by $%', pool_name, round(remaining, 2);
  end if;

  for d in select donation_id from public.donation_allocations where expense_id = new.id loop
    perform public.recompute_donation_stage(d.donation_id);
  end loop;

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

-- Timeline note names the campaign for campaign donations.
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
  source     text;
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
    return;
  end if;

  select string_agg(e.title, '; ' order by a.created_at) into titles
    from public.donation_allocations a
    join public.ngo_expenses e on e.id = a.expense_id
   where a.donation_id = d_id;

  if d.campaign_id is not null then
    select 'campaign "' || title || '"' into source from public.campaigns where id = d.campaign_id;
  else
    source := d.donation_type || ' pool';
  end if;

  perform set_config('donatelink.system', 'on', true);

  update public.donations set stage = target, updated_at = now() where id = d_id;

  for s in (d.stage + 1) .. target loop
    if s = 3 then
      insert into public.donation_updates (donation_id, stage, note)
      values (d_id, 3, 'Allocated from the ' || source || ' to: ' || titles);
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

-- ───────────────────────────────────────────────────────────── 5. Lock the link
-- Once written, a donation's campaign cannot be changed from the browser, so
-- money can't be moved between campaigns after the fact.
create or replace function public.donations_campaign_lock()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('donatelink.system', true), '') <> 'on'
     and new.campaign_id is distinct from old.campaign_id then
    raise exception 'A donation''s campaign cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists donations_campaign_lock on public.donations;
create trigger donations_campaign_lock
  before update on public.donations
  for each row execute function public.donations_campaign_lock();
