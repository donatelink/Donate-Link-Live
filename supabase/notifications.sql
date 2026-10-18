-- DonateLink — in-app notifications (FYP-2)
-- Run this in the Supabase SQL Editor, AFTER donation_payouts.sql. Safe to re-run.
--
-- Notifications are written by database triggers, so every event is captured no
-- matter which screen (or the Stripe webhook) caused it. Nobody is notified
-- about their own action.

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "mark own notifications read" on public.notifications;
create policy "mark own notifications read" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- No insert policy: only the triggers below create notifications.

-- ───────────────────────────────────────────── Helpers
create or replace function public.notify(p_user uuid, p_title text, p_body text, p_link text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Skip missing recipients and the person who caused the event.
  if p_user is null or p_user = auth.uid() then
    return;
  end if;
  insert into public.notifications (user_id, title, body, link)
  values (p_user, p_title, p_body, p_link);
end;
$$;

revoke execute on function public.notify(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.usd(n numeric)
returns text
language sql
immutable
as $$
  select '$' || to_char(coalesce(n, 0), 'FM999999990.00');
$$;

create or replace function public.stage_label(n int)
returns text
language sql
immutable
as $$
  select (array['Pending', 'Confirmed', 'Allocated', 'Transferred', 'Completed'])[n];
$$;

-- ───────────────────────────────────────────── Donations
create or replace function public.notify_donation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ngo_user uuid;
begin
  if new.stage is not distinct from old.stage then
    return new;
  end if;

  -- Donor: every stage their donation reaches (NGO action or payment confirmed).
  perform public.notify(
    new.donor_id,
    'Your donation is now at Stage ' || new.stage || ' — ' || public.stage_label(new.stage),
    public.usd(new.amount) || ' to ' || coalesce(new.ngo_name, 'the NGO') ||
      case when new.stage = 2 then ': payment confirmed.' else '.' end,
    '/donor/track/' || new.id
  );

  -- NGO: a donation has just been paid.
  if old.stage = 1 and new.stage = 2 then
    select user_id into ngo_user from public.ngos where id = new.ngo_id;
    perform public.notify(
      ngo_user,
      'New donation: ' || public.usd(new.amount),
      coalesce(new.donor_name, 'A donor') || ' · ' || new.donation_type,
      '/ngo/dashboard?view=donations'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_donation_change on public.donations;
create trigger notify_donation_change
  after update on public.donations
  for each row execute function public.notify_donation_change();

-- ───────────────────────────────────────────── Payouts (donation -> beneficiary)
create or replace function public.notify_payout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.donations%rowtype;
  r public.beneficiary_requests%rowtype;
begin
  select * into d from public.donations where id = new.donation_id;
  select * into r from public.beneficiary_requests where id = new.beneficiary_request_id;

  perform public.notify(
    d.donor_id,
    '💸 ' || public.usd(new.amount) || ' of your donation reached ' || coalesce(r.beneficiary_name, 'a beneficiary'),
    coalesce(d.ngo_name, 'The NGO') || ' sent it with a transfer receipt.',
    '/donor/track/' || d.id
  );

  perform public.notify(
    r.beneficiary_id,
    '🎉 You received ' || public.usd(new.amount),
    'From ' || coalesce(r.ngo_name, 'the NGO') || '. The transfer receipt is on your request.',
    '/beneficiary/request/' || r.id
  );

  return new;
end;
$$;

drop trigger if exists notify_payout on public.donation_payouts;
create trigger notify_payout
  after insert on public.donation_payouts
  for each row execute function public.notify_payout();

-- ───────────────────────────────────────────── Beneficiary requests
create or replace function public.notify_request_new()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ngo_user uuid;
begin
  select user_id into ngo_user from public.ngos where id = new.ngo_id;
  perform public.notify(
    ngo_user,
    'New request from ' || coalesce(new.beneficiary_name, 'a beneficiary'),
    public.usd(new.amount) || ' · review it in Beneficiary Requests.',
    '/ngo/dashboard?view=requests'
  );
  return new;
end;
$$;

drop trigger if exists notify_request_new on public.beneficiary_requests;
create trigger notify_request_new
  after insert on public.beneficiary_requests
  for each row execute function public.notify_request_new();

create or replace function public.notify_request_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  link text := '/beneficiary/request/' || new.id;
begin
  if new.status is distinct from old.status then
    if new.status = 'verified' then
      perform public.notify(new.beneficiary_id, '✅ Your request was verified',
        coalesce(new.ngo_name, 'The NGO') || ' approved your request for ' || public.usd(new.amount) || '.', link);
    elsif new.status = 'rejected' then
      perform public.notify(new.beneficiary_id, '❌ Your request was rejected',
        coalesce(nullif(new.ngo_note, ''), 'See your request for details.'), link);
    end if;
  end if;

  -- Stage moves. Becoming fully funded is already announced by the payout notice.
  if new.stage is distinct from old.stage
     and not (new.status = 'funded' and old.status is distinct from 'funded') then
    perform public.notify(new.beneficiary_id,
      'Your request is now at Stage ' || new.stage || ' — ' || public.stage_label(new.stage),
      public.usd(new.amount) || ' from ' || coalesce(new.ngo_name, 'the NGO') || '.', link);
  end if;

  return new;
end;
$$;

drop trigger if exists notify_request_change on public.beneficiary_requests;
create trigger notify_request_change
  after update on public.beneficiary_requests
  for each row execute function public.notify_request_change();
