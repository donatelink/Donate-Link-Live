-- DonateLink — card donations via Stripe Connect (FYP-2)
-- Run this in the Supabase SQL Editor, after blockchain.sql. Safe to re-run.

-- 1. Each NGO links its own Stripe account; card donations are paid straight to it.
alter table public.ngos
  add column if not exists stripe_account_id      text,
  add column if not exists stripe_charges_enabled boolean not null default false;

-- 2. Card donations record their Stripe session and payment outcome.
alter table public.donations
  add column if not exists stripe_session_id     text,
  add column if not exists stripe_payment_intent text,
  add column if not exists payment_status        text;

alter table public.donations
  drop constraint if exists donations_payment_status_check;
alter table public.donations
  add constraint donations_payment_status_check
  check (payment_status is null or payment_status in ('pending', 'paid', 'failed'));

create unique index if not exists donations_stripe_session_id_key
  on public.donations (stripe_session_id)
  where stripe_session_id is not null;

-- 3. Guard the payment fields. Only the server (service role, where auth.uid()
--    is null) may mark a donation paid or touch Stripe ids. Without this, the
--    "donor updates own donation" policy would let a donor set stage = 2 on a
--    donation they never paid for.
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
    -- A new donation always starts unpaid at Stage 1, whatever the client sent.
    new.stage := 1;
    new.stripe_session_id := null;
    new.stripe_payment_intent := null;
    new.payment_status := case when new.payment_method = 'stripe' then 'pending' else null end;
    return new;
  end if;

  -- UPDATE from a browser session (donor, NGO or admin).
  if new.payment_status        is distinct from old.payment_status
  or new.stripe_session_id     is distinct from old.stripe_session_id
  or new.stripe_payment_intent is distinct from old.stripe_payment_intent
  or new.payment_method        is distinct from old.payment_method
  or new.amount                is distinct from old.amount
  or new.ngo_id                is distinct from old.ngo_id
  or new.donor_id              is distinct from old.donor_id then
    raise exception 'Payment details of a donation can only be changed by the server';
  end if;

  -- An unpaid card donation cannot be confirmed by hand — Stripe must confirm it.
  -- (payment_status is null on older demo rows, which stay unaffected.)
  if old.payment_method = 'stripe'
     and old.payment_status in ('pending', 'failed')
     and new.stage is distinct from old.stage then
    raise exception 'This card donation has not been paid yet';
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

-- 4. Same idea for NGOs: the Stripe account link is written only by the server,
--    so an NGO cannot point its card donations at some other Stripe account.
create or replace function public.ngos_stripe_guard()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.stripe_account_id := null;
    new.stripe_charges_enabled := false;
    return new;
  end if;
  if new.stripe_account_id      is distinct from old.stripe_account_id
  or new.stripe_charges_enabled is distinct from old.stripe_charges_enabled then
    raise exception 'Stripe account details can only be changed by the server';
  end if;
  return new;
end;
$$;

drop trigger if exists ngos_stripe_guard on public.ngos;
create trigger ngos_stripe_guard
  before insert or update on public.ngos
  for each row execute function public.ngos_stripe_guard();
