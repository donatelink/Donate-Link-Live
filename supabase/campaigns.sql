-- DonateLink — fundraising campaigns (FYP-2)
-- Run this in the Supabase SQL Editor, AFTER stripe.sql. Safe to re-run.
--
-- An NGO asks for a fixed amount ("$5,000 for school supplies"). Donors give
-- small amounts; once paid donations reach the goal the campaign closes on its
-- own.

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

-- ───────────────────────────────────────────────────────────── 2. Creating a campaign
create or replace function public.campaigns_before_insert()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not exists (
    select 1 from public.ngos where id = new.ngo_id and user_id = auth.uid()
  ) then
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
  for insert with check (
    exists (select 1 from public.ngos where id = ngo_id and user_id = auth.uid())
  );
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
  if not found or not exists (
    select 1 from public.ngos where id = c.ngo_id and user_id = auth.uid()
  ) then
    raise exception 'Campaign not found';
  end if;
  update public.campaigns
     set status = 'closed', ended_at = now()
   where id = p_campaign and status = 'active';
end;
$$;

revoke execute on function public.close_campaign(uuid) from public, anon;
grant execute on function public.close_campaign(uuid) to authenticated;

-- ───────────────────────────────────────────────────────────── 4. Lock the link
-- Once written, a donation's campaign cannot be changed from the browser, so
-- money can't be moved between campaigns after the fact.
create or replace function public.donations_campaign_lock()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and new.campaign_id is distinct from old.campaign_id then
    raise exception 'A donation''s campaign cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists donations_campaign_lock on public.donations;
create trigger donations_campaign_lock
  before update on public.donations
  for each row execute function public.donations_campaign_lock();
