-- DonateLink — NGO ratings
-- Run this in the Supabase SQL Editor AFTER ngos.sql.

create table if not exists public.ngo_ratings (
  id            uuid primary key default gen_random_uuid(),
  ngo_id        uuid references public.ngos(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  stars         int not null check (stars between 1 and 5),
  review        text,
  reviewer_name text,
  reviewer_role text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (ngo_id, user_id)
);

create index if not exists ngo_ratings_ngo_idx on public.ngo_ratings(ngo_id);

alter table public.ngo_ratings enable row level security;

-- Reviews are public so cards/pages can show them to anyone.
create policy "ratings public read"
  on public.ngo_ratings for select using (true);

-- A signed-in user can write their own rating. App enforces eligibility
-- (donor must have donated, beneficiary must have a funded request) client-side.
create policy "user inserts own rating"
  on public.ngo_ratings for insert with check (user_id = auth.uid());

create policy "user updates own rating"
  on public.ngo_ratings for update using (user_id = auth.uid());

create policy "user deletes own rating"
  on public.ngo_ratings for delete using (user_id = auth.uid());
