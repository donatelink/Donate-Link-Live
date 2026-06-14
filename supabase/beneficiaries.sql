-- DonateLink — beneficiary requests
-- Run this in the Supabase SQL Editor AFTER ngos.sql + donations.sql.

-- 1. If your public.users.role has a CHECK constraint that lists only
--    ('donor','ngo','admin'), drop and re-add it to include 'beneficiary':
--
--    alter table public.users drop constraint <constraint_name>;
--    alter table public.users
--      add constraint users_role_check
--      check (role in ('donor','ngo','admin','beneficiary'));

create table if not exists public.beneficiary_requests (
  id                 uuid primary key default gen_random_uuid(),
  beneficiary_id     uuid references auth.users(id) on delete cascade,
  ngo_id             uuid references public.ngos(id) on delete cascade,
  amount             numeric not null check (amount > 0),
  reason             text not null,
  proof_url          text,
  status             text not null default 'pending'
                       check (status in ('pending','verified','rejected','funded')),
  stage              int not null default 1 check (stage between 1 and 5),
  ngo_note           text,
  beneficiary_name   text,
  beneficiary_email  text,
  ngo_name           text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.beneficiary_request_updates (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid references public.beneficiary_requests(id) on delete cascade,
  stage        int not null check (stage between 1 and 5),
  note         text,
  proof_url    text,
  created_at   timestamptz not null default now()
);

alter table public.beneficiary_request_updates enable row level security;

create policy "beneficiary views own request updates"
  on public.beneficiary_request_updates
  for select using (
    exists (select 1 from public.beneficiary_requests
            where beneficiary_requests.id = beneficiary_request_updates.request_id
              and beneficiary_requests.beneficiary_id = auth.uid())
  );

create policy "ngo views its request updates"
  on public.beneficiary_request_updates
  for select using (
    exists (select 1 from public.beneficiary_requests br
            join public.ngos n on n.id = br.ngo_id
            where br.id = beneficiary_request_updates.request_id
              and n.user_id = auth.uid())
  );

create policy "ngo inserts request updates"
  on public.beneficiary_request_updates
  for insert with check (
    exists (select 1 from public.beneficiary_requests br
            join public.ngos n on n.id = br.ngo_id
            where br.id = beneficiary_request_updates.request_id
              and n.user_id = auth.uid())
  );

create policy "admin views all request updates"
  on public.beneficiary_request_updates
  for select using (
    exists (select 1 from public.users
            where users.id = auth.uid() and users.role = 'admin')
  );

create index if not exists beneficiary_requests_beneficiary_idx
  on public.beneficiary_requests(beneficiary_id);
create index if not exists beneficiary_requests_ngo_idx
  on public.beneficiary_requests(ngo_id);

alter table public.beneficiary_requests enable row level security;

create policy "beneficiary inserts own request" on public.beneficiary_requests
  for insert with check (beneficiary_id = auth.uid());

create policy "beneficiary views own requests" on public.beneficiary_requests
  for select using (beneficiary_id = auth.uid());

create policy "ngo views its requests" on public.beneficiary_requests
  for select using (
    exists (select 1 from public.ngos
            where ngos.id = beneficiary_requests.ngo_id and ngos.user_id = auth.uid())
  );

create policy "ngo updates its requests" on public.beneficiary_requests
  for update using (
    exists (select 1 from public.ngos
            where ngos.id = beneficiary_requests.ngo_id and ngos.user_id = auth.uid())
  );

create policy "admin views all requests" on public.beneficiary_requests
  for select using (
    exists (select 1 from public.users
            where users.id = auth.uid() and users.role = 'admin')
  );

create policy "admin updates all requests" on public.beneficiary_requests
  for update using (
    exists (select 1 from public.users
            where users.id = auth.uid() and users.role = 'admin')
  );

-- 2. Link a donation to the beneficiary request it funded (set at stage 4).
alter table public.donations
  add column if not exists beneficiary_request_id uuid
    references public.beneficiary_requests(id) on delete set null;

create index if not exists donations_beneficiary_request_idx
  on public.donations(beneficiary_request_id);

-- Beneficiary can view donations linked to their own request (powers the
-- "Total received from N donors" panel on the beneficiary tracking page).
create policy "beneficiary views linked donations" on public.donations
  for select using (
    exists (
      select 1 from public.beneficiary_requests
      where beneficiary_requests.id = donations.beneficiary_request_id
        and beneficiary_requests.beneficiary_id = auth.uid()
    )
  );
