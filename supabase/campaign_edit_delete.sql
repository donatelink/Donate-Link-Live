-- DonateLink — NGO edits / deletes its own campaigns (FYP-2)
-- Run this in the Supabase SQL Editor, AFTER campaigns.sql. Safe to re-run.
--
-- Rules (enforced here, not just in the UI):
--   * Title and description can be edited any time.
--   * Goal can only change while the campaign is active, and never below what is
--     already raised or reserved by unfinished payments. Reaching the new goal
--     closes the campaign as completed.
--   * Cause can only change before the campaign has any donations.
--   * A campaign can only be deleted if it has no donations at all; otherwise
--     the NGO closes it early, so donors' money stays linked to it.

create or replace function public.update_campaign(
  p_campaign    uuid,
  p_title       text,
  p_cause       text,
  p_goal        numeric,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c         public.campaigns%rowtype;
  committed numeric;
  has_dons  boolean;
begin
  select * into c from public.campaigns where id = p_campaign for update;
  if not found or not exists (
    select 1 from public.ngos where id = c.ngo_id and user_id = auth.uid()
  ) then
    raise exception 'Campaign not found';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Give the campaign a title';
  end if;

  has_dons := exists (select 1 from public.donations where campaign_id = c.id);

  if p_cause is distinct from c.cause and has_dons then
    raise exception 'The cause cannot change once the campaign has donations';
  end if;

  if round(p_goal, 2) is distinct from c.goal then
    if c.status <> 'active' then
      raise exception 'Only an active campaign''s goal can be changed';
    end if;
    if p_goal is null or p_goal < 1 then
      raise exception 'Set a goal of at least $1';
    end if;
    select coalesce(sum(amount), 0) into committed
      from public.donations
     where campaign_id = c.id
       and coalesce(payment_status, '') <> 'failed'
       and coalesce(onchain_status, '') <> 'failed'
       and (stage >= 2 or payment_status = 'pending' or onchain_status = 'pending');
    if p_goal < committed then
      raise exception 'The goal cannot be lower than the $% already raised or in progress', round(committed, 2);
    end if;
  end if;

  update public.campaigns
     set title       = trim(p_title),
         cause       = p_cause,
         goal        = round(p_goal, 2),
         description = nullif(trim(coalesce(p_description, '')), '')
   where id = c.id;

  -- Closes the campaign as completed if the new goal is already met.
  perform public.recompute_campaign(c.id);
end;
$$;

revoke execute on function public.update_campaign(uuid, text, text, numeric, text) from public, anon;
grant execute on function public.update_campaign(uuid, text, text, numeric, text) to authenticated;

create or replace function public.delete_campaign(p_campaign uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.campaigns%rowtype;
begin
  select * into c from public.campaigns where id = p_campaign for update;
  if not found or not exists (
    select 1 from public.ngos where id = c.ngo_id and user_id = auth.uid()
  ) then
    raise exception 'Campaign not found';
  end if;
  if exists (select 1 from public.donations where campaign_id = c.id) then
    raise exception 'This campaign has donations, so it cannot be deleted. Close it instead.';
  end if;
  delete from public.campaigns where id = c.id;
end;
$$;

revoke execute on function public.delete_campaign(uuid) from public, anon;
grant execute on function public.delete_campaign(uuid) to authenticated;
