-- DonateLink — NGO applications table
-- Run this in the Supabase SQL Editor.

create table if not exists public.ngos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  org_name       text not null,
  reg_number     text not null,
  contact_person text not null,
  phone          text not null,
  email          text not null,
  country        text not null,
  website        text,
  category       text not null,
  description    text not null,
  status         text not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected')),
  slug           text unique,
  created_at     timestamptz not null default now()
);

alter table public.ngos enable row level security;

-- Anyone can submit an NGO application (from the register page).
create policy "anyone can apply"
  on public.ngos for insert
  with check (true);

-- Approved NGOs are publicly viewable (powers the /ngo/[slug] page).
create policy "approved ngos are public"
  on public.ngos for select
  using (status = 'approved');

-- An NGO can view their own application.
create policy "ngo views own application"
  on public.ngos for select
  using (auth.uid() = user_id);

-- Admins can view every application.
create policy "admin views all ngos"
  on public.ngos for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Admins can approve / reject applications.
create policy "admin updates ngos"
  on public.ngos for update
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );
