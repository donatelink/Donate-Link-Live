-- DonateLink — on-chain donation support (FYP-2)
-- Run this in the Supabase SQL Editor. Safe to re-run.

-- 1. NGOs need a payout wallet for on-chain donations to have a destination.
alter table public.ngos
  add column if not exists wallet_address text;

-- Basic shape check: an EVM address is 0x + 40 hex chars. NULL stays allowed
-- so existing NGOs are unaffected until they fill it in.
alter table public.ngos
  drop constraint if exists ngos_wallet_address_format;
alter table public.ngos
  add constraint ngos_wallet_address_format
  check (wallet_address is null or wallet_address ~ '^0x[a-fA-F0-9]{40}$');

-- 2. Donations record how they were paid and, for crypto, their on-chain proof.
alter table public.donations
  add column if not exists payment_method      text,
  add column if not exists chain               text,
  add column if not exists tx_hash             text,
  add column if not exists from_address        text,
  add column if not exists contract_address    text,
  add column if not exists onchain_donation_id bigint,
  add column if not exists onchain_status      text;

alter table public.donations
  drop constraint if exists donations_onchain_status_check;
alter table public.donations
  add constraint donations_onchain_status_check
  check (onchain_status is null or onchain_status in ('pending', 'confirmed', 'failed'));

-- A transaction hash is unique per chain — stops the same tx being recorded twice.
create unique index if not exists donations_tx_hash_key
  on public.donations (tx_hash)
  where tx_hash is not null;

-- 3. The donor must be able to update their OWN donation right after the
--    transaction confirms (to write tx_hash / stage 2). Without this policy the
--    update silently persists nothing -- RLS returns no error on a no-match UPDATE.
drop policy if exists "donor updates own donation" on public.donations;
create policy "donor updates own donation" on public.donations
  for update using (donor_id = auth.uid())
  with check (donor_id = auth.uid());
