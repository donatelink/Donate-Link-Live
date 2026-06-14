-- DonateLink — beneficiary profiles
-- Run this in the Supabase SQL Editor AFTER beneficiaries.sql.
-- A beneficiary must complete this profile before they can request funding.

create table if not exists public.beneficiary_profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  first_name      text not null,
  last_name       text not null,
  father_name     text not null,
  gov_id          text not null,
  phone           text not null,
  email           text not null,
  address         text not null,
  family_members  int  not null check (family_members >= 1),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.beneficiary_profiles enable row level security;

-- Beneficiary can insert/select/update/delete their own profile.
-- `with check` is required so INSERT and UPDATE actually persist (without it,
-- RLS silently drops the write and returns no error).
create policy "beneficiary manages own profile" on public.beneficiary_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- An NGO can view the profile of any beneficiary who has requested from it
-- (powers verification of the requester's identity).
create policy "ngo views profiles that requested from it" on public.beneficiary_profiles
  for select using (
    exists (select 1 from public.beneficiary_requests br
            join public.ngos n on n.id = br.ngo_id
            where br.beneficiary_id = beneficiary_profiles.user_id
              and n.user_id = auth.uid())
  );

create policy "admin views all profiles" on public.beneficiary_profiles
  for select using (
    exists (select 1 from public.users
            where users.id = auth.uid() and users.role = 'admin')
  );
