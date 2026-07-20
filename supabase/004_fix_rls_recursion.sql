-- Run in Supabase SQL Editor (safe to re-run).
-- Fixes: infinite recursion in members RLS + creator cannot read new apartment.
-- Run this after 001_core_rls_policies.sql if you already applied it.

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER bypasses RLS — safe inside policies)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_apartment_member(apt_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.apartment_id = apt_id
      AND m.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_apartment_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_apartment_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.apartment_exists(apt_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.apartments a
    WHERE a.id = apt_id
  );
$$;

REVOKE ALL ON FUNCTION public.apartment_exists(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apartment_exists(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_member_of_apartment(apt_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.apartment_id = apt_id
      AND m.user_id = uid
  );
$$;

REVOKE ALL ON FUNCTION public.is_member_of_apartment(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_member_of_apartment(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- apartments SELECT — members OR creator (needed right after insert, before members row)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS apartments_select_member ON public.apartments;
CREATE POLICY apartments_select_member ON public.apartments
  FOR SELECT TO authenticated
  USING (
    public.is_apartment_member(id)
    OR created_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- members — no self-referential subquery
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS members_select_same_apartment ON public.members;
CREATE POLICY members_select_same_apartment ON public.members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_apartment_member(apartment_id)
  );

DROP POLICY IF EXISTS members_insert_self ON public.members;
CREATE POLICY members_insert_self ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.apartment_exists(apartment_id)
  );

-- ---------------------------------------------------------------------------
-- expenses INSERT — avoid direct members subquery in policy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS expenses_insert_members ON public.expenses;
CREATE POLICY expenses_insert_members ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_apartment_member(apartment_id)
    AND public.is_member_of_apartment(apartment_id, paid_by)
  );
