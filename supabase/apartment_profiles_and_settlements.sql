-- Run in Supabase SQL Editor (safe to re-run).
-- Roommate display names + settlements ledger (no balances table).
-- settle_with_member lives in 002_expense_rpcs.sql (settlements-only).

-- ---------------------------------------------------------------------------
-- get_apartment_profiles — roommate display names (profiles often RLS-locked)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_apartment_profiles(apt_id uuid)
RETURNS TABLE (user_id uuid, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM public.profiles p
  INNER JOIN public.members m ON m.user_id = p.user_id
  WHERE m.apartment_id = apt_id
    AND EXISTS (
      SELECT 1
      FROM public.members me
      WHERE me.apartment_id = apt_id
        AND me.user_id = (select auth.uid())
    );
$$;

REVOKE ALL ON FUNCTION public.get_apartment_profiles(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_apartment_profiles(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_apartment_profiles(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- settlements — who paid whom (from_user → to_user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  from_user uuid NOT NULL REFERENCES auth.users(id),
  to_user uuid NOT NULL REFERENCES auth.users(id),
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS settlements_apartment_idx
  ON public.settlements (apartment_id);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS settlements_select_members ON public.settlements;
CREATE POLICY settlements_select_members ON public.settlements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.apartment_id = settlements.apartment_id
        AND m.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS settlements_insert_members ON public.settlements;
CREATE POLICY settlements_insert_members ON public.settlements
  FOR INSERT TO authenticated
  WITH CHECK (
    (from_user = (select auth.uid()) OR to_user = (select auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.apartment_id = settlements.apartment_id
        AND m.user_id = (select auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.get_apartment_settlements(apt_id uuid)
RETURNS TABLE (
  id uuid,
  from_user uuid,
  to_user uuid,
  amount numeric,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.from_user, s.to_user, s.amount, s.created_at
  FROM public.settlements s
  WHERE s.apartment_id = apt_id
    AND EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.apartment_id = apt_id
        AND m.user_id = (select auth.uid())
    )
  ORDER BY s.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_apartment_settlements(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_apartment_settlements(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_apartment_settlements(uuid) TO authenticated;
