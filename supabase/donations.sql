-- DonateLink — donations table
-- Run this in the Supabase SQL Editor (after ngos.sql).

create table if not exists public.donations (
  id            uuid primary key default gen_random_uuid(),
  donor_id      uuid references auth.users(id) on delete set null,
  ngo_id        uuid references public.ngos(id) on delete cascade,
  amount        numeric not null check (amount > 0),
  donation_type text not null default 'Others',
  stage         int not null default 1 check (stage between 1 and 5),
  note          text,
  donor_name    text,
  donor_email   text,
  ngo_name      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.donations enable row level security;

-- Donor creates their own donation
create policy "donor inserts own donation" on public.donations
  for insert with check (donor_id = auth.uid());

-- Donor sees their own donations
create policy "donor views own donations" on public.donations
  for select using (donor_id = auth.uid());

-- NGO sees donations made to them
create policy "ngo views its donations" on public.donations
  for select using (
    exists (select 1 from public.ngos
            where ngos.id = donations.ngo_id and ngos.user_id = auth.uid())
  );

-- NGO updates the stage of its own donations
create policy "ngo updates its donations" on public.donations
  for update using (
    exists (select 1 from public.ngos
            where ngos.id = donations.ngo_id and ngos.user_id = auth.uid())
  );

-- Admin sees and manages everything
create policy "admin views all donations" on public.donations
  for select using (
    exists (select 1 from public.users
            where users.id = auth.uid() and users.role = 'admin')
  );
create policy "admin updates all donations" on public.donations
  for update using (
    exists (select 1 from public.users
            where users.id = auth.uid() and users.role = 'admin')
  );
