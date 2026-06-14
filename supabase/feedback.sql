-- DonateLink — user feedback
-- Run this in the Supabase SQL Editor. Donors, beneficiaries, and NGOs submit
-- feedback; only admins can read all of it.

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  role        text not null check (role in ('donor','beneficiary','ngo','admin')),
  name        text,
  email       text,
  category    text not null check (category in ('General','Bug','Suggestion','Complaint')),
  message     text not null,
  created_at  timestamptz not null default now()
);

alter table public.feedback enable row level security;

create index if not exists feedback_created_idx on public.feedback(created_at desc);

create policy "user submits own feedback" on public.feedback
  for insert with check (user_id = auth.uid());

create policy "user views own feedback" on public.feedback
  for select using (user_id = auth.uid());

create policy "admin views all feedback" on public.feedback
  for select using (
    exists (select 1 from public.users where users.id = auth.uid() and users.role = 'admin')
  );
