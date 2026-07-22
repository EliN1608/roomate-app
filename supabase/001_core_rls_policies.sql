-- Run in Supabase SQL Editor (safe to re-run).
-- Core RLS for apartments, members, expenses, shopping_items.
-- Prerequisite: base tables exist (apartments, members, expenses, shopping_items).
-- Note: public.balances was dropped — see 008_optimize_rls_and_drop_balances.sql.
-- Requires: public.is_apartment_admin(uuid) from profile_apartment_management.sql

-- ---------------------------------------------------------------------------
-- Helpers
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
REVOKE ALL ON FUNCTION public.is_apartment_member(uuid) FROM anon;
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
REVOKE ALL ON FUNCTION public.apartment_exists(uuid) FROM anon;
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
REVOKE ALL ON FUNCTION public.is_member_of_apartment(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_member_of_apartment(uuid, uuid) TO authenticated;

-- Lookup apartment by invite code (join flow — avoids exposing all apartments)
CREATE OR REPLACE FUNCTION public.find_apartment_by_invite(p_invite text)
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.name
  FROM public.apartments a
  WHERE a.invite_code = upper(btrim(p_invite))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_apartment_by_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_apartment_by_invite(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_apartment_by_invite(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- apartments
-- ---------------------------------------------------------------------------
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS apartments_select_member ON public.apartments;
CREATE POLICY apartments_select_member ON public.apartments
  FOR SELECT TO authenticated
  USING (
    public.is_apartment_member(id)
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS apartments_insert_creator ON public.apartments;
CREATE POLICY apartments_insert_creator ON public.apartments
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Direct UPDATE blocked — use update_apartment_details / update_apartment_shopping_settings RPCs
DROP POLICY IF EXISTS apartments_update_admin ON public.apartments;
DROP POLICY IF EXISTS apartments_update_members ON public.apartments;

-- ---------------------------------------------------------------------------
-- members
-- ---------------------------------------------------------------------------
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

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

-- UPDATE/DELETE only via RPCs (leave_apartment, remove_apartment_member, transfer_apartment_admin)

-- ---------------------------------------------------------------------------
-- expenses — SELECT + INSERT (RPCs preferred; policies are defense in depth)
-- UPDATE/DELETE: expenses_rls.sql
-- ---------------------------------------------------------------------------
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expenses_select_members ON public.expenses;
CREATE POLICY expenses_select_members ON public.expenses
  FOR SELECT TO authenticated
  USING (public.is_apartment_member(apartment_id));

DROP POLICY IF EXISTS expenses_insert_members ON public.expenses;
CREATE POLICY expenses_insert_members ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_apartment_member(apartment_id)
    AND public.is_member_of_apartment(apartment_id, paid_by)
  );

-- ---------------------------------------------------------------------------
-- shopping_items — full CRUD for apartment members
-- ---------------------------------------------------------------------------
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shopping_items_select_members ON public.shopping_items;
CREATE POLICY shopping_items_select_members ON public.shopping_items
  FOR SELECT TO authenticated
  USING (public.is_apartment_member(apartment_id));

DROP POLICY IF EXISTS shopping_items_insert_members ON public.shopping_items;
CREATE POLICY shopping_items_insert_members ON public.shopping_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_apartment_member(apartment_id));

DROP POLICY IF EXISTS shopping_items_update_members ON public.shopping_items;
CREATE POLICY shopping_items_update_members ON public.shopping_items
  FOR UPDATE TO authenticated
  USING (public.is_apartment_member(apartment_id))
  WITH CHECK (public.is_apartment_member(apartment_id));

-- DELETE policy: shopping_items_features.sql

-- ---------------------------------------------------------------------------
-- settlements — read only from client; writes via settle_with_member RPC
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS settlements_insert_members ON public.settlements;
