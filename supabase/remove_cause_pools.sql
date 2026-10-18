-- DonateLink — remove cause pools / spending (back to manual stages)
-- Run this ONCE in the Supabase SQL Editor. Safe to re-run.
--
-- Undoes cause_pools.sql: NGOs advance each donation by hand with proof again,
-- and link a beneficiary payout at Stage 4. Campaigns are kept.
-- Existing donations keep whatever stage they are at; spending records are deleted.

-- 1. Donors see a beneficiary's proof only through a direct Stage-4 link again.
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
  );
$$;

-- 2. Beneficiary payouts can reach Stage 4/5 by hand again.
drop trigger if exists beneficiary_requests_pool_guard on public.beneficiary_requests;
drop trigger if exists beneficiary_requests_on_delivered on public.beneficiary_requests;

-- 3. Spending tables (their triggers and policies go with them).
drop table if exists public.donation_allocations cascade;
drop table if exists public.ngo_expenses cascade;

drop function if exists public.ngo_expenses_before_insert();
drop function if exists public.ngo_expenses_allocate();
drop function if exists public.finish_expense(uuid, text);
drop function if exists public.complete_expense(uuid, text);
drop function if exists public.recompute_donation_stage(uuid);
drop function if exists public.beneficiary_requests_pool_guard();
drop function if exists public.beneficiary_requests_on_delivered();
drop function if exists public.expense_visible_to_me(uuid);
drop function if exists public.my_donation_funded_expense(uuid);
drop function if exists public.owns_donation(uuid);

-- 4. Donation guard without the pool rules. Keeps the Stripe protections:
--    only the server sets payment fields, unpaid card donations can't be
--    advanced, and a donor can only move their own donation 1 -> 2 with a tx.
create or replace function public.donations_guard()
returns trigger
language plpgsql
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return new; -- server-side (service role): trusted
  end if;

  if tg_op = 'INSERT' then
    new.stage := 1;
    new.stripe_session_id := null;
    new.stripe_payment_intent := null;
    new.payment_status := case when new.payment_method = 'stripe' then 'pending' else null end;
    new.net_amount := null;
    return new;
  end if;

  if new.payment_status        is distinct from old.payment_status
  or new.stripe_session_id     is distinct from old.stripe_session_id
  or new.stripe_payment_intent is distinct from old.stripe_payment_intent
  or new.payment_method        is distinct from old.payment_method
  or new.amount                is distinct from old.amount
  or new.ngo_id                is distinct from old.ngo_id
  or new.donor_id              is distinct from old.donor_id
  or new.net_amount            is distinct from old.net_amount then
    raise exception 'Payment details of a donation can only be changed by the server';
  end if;

  if old.payment_method = 'stripe'
     and old.payment_status in ('pending', 'failed')
     and new.stage is distinct from old.stage then
    raise exception 'This card donation has not been paid yet';
  end if;

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

-- 5. Pool bookkeeping columns. net_amount stays: it records what the NGO
--    received after the card fee.
alter table public.donations drop column if exists allocated_amount;
alter table public.donations drop column if exists manual_stages;

-- 6. Campaign lock no longer needs the pool system flag.
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
