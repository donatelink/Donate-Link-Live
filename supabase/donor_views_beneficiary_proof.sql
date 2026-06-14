-- DonateLink — let donors see the beneficiary payout linked to their donation
-- Run this in the Supabase SQL Editor AFTER beneficiaries.sql.
-- Closes the loop: donor -> NGO -> beneficiary, so the donor can view the
-- NGO's transfer/delivery proof for the beneficiary their donation funded.
--
-- NOTE: the donor's access to beneficiary_requests is granted via a
-- SECURITY DEFINER helper, NOT a direct subquery on donations. A direct
-- subquery caused infinite recursion because donations already has a policy
-- that reads beneficiary_requests (beneficiary_requests -> donations ->
-- beneficiary_requests). The definer function reads donations without
-- re-applying RLS, breaking the cycle.

-- Helper: does the current donor own a donation linked to this request?
-- Runs as owner (security definer), so reading donations here does not
-- re-trigger donations' RLS.
create or replace function public.donor_can_view_request(req_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.donations d
    where d.beneficiary_request_id = req_id
      and d.donor_id = auth.uid()
  );
$$;

-- A donor can read the beneficiary_request row linked to one of their donations.
drop policy if exists "donor views requests linked to their donations"
  on public.beneficiary_requests;
create policy "donor views requests linked to their donations"
  on public.beneficiary_requests
  for select using (public.donor_can_view_request(id));

-- ...and the per-stage proof updates for that linked request.
drop policy if exists "donor views updates of linked requests"
  on public.beneficiary_request_updates;
create policy "donor views updates of linked requests"
  on public.beneficiary_request_updates
  for select using (public.donor_can_view_request(request_id));
