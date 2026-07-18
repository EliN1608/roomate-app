-- Run once in Supabase SQL Editor.
-- 1) Read all apartment balances (bypasses per-user RLS SELECT)
-- 2) Settlements table so "הסדרת תשלום" updates per-roommate breakdown
--
-- Membership table in this project is public.members (not apartment_members).

-- ---------------------------------------------------------------------------
-- get_apartment_balances — SECURITY DEFINER, same pattern as get_apartment_members
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_apartment_balances(apt_id uuid)
RETURNS TABLE (user_id uuid, amount numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.user_id, b.amount
  FROM public.balances b
  WHERE b.apartment_id = apt_id
    AND EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.apartment_id = apt_id
        AND m.user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_apartment_balances(uuid) TO authenticated;

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
  WHERE p.user_id IN (
      SELECT m.user_id
      FROM public.members m
      WHERE m.apartment_id = apt_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.apartment_id = apt_id
        AND m.user_id = auth.uid()
    );
$$;

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

-- Members of the apartment can read settlements
DROP POLICY IF EXISTS settlements_select_members ON public.settlements;
CREATE POLICY settlements_select_members ON public.settlements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.apartment_id = settlements.apartment_id
        AND m.user_id = auth.uid()
    )
  );

-- Members can insert settlements for their apartment (payer or receiver must be self)
DROP POLICY IF EXISTS settlements_insert_members ON public.settlements;
CREATE POLICY settlements_insert_members ON public.settlements
  FOR INSERT TO authenticated
  WITH CHECK (
    (from_user = auth.uid() OR to_user = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.apartment_id = settlements.apartment_id
        AND m.user_id = auth.uid()
    )
  );

-- Optional RPC if direct SELECT is still blocked by RLS quirks
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
        AND m.user_id = auth.uid()
    )
  ORDER BY s.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_apartment_settlements(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- settle_with_member — update both balances + audit row (bypasses RLS)
-- i_am_owed = true  → partner pays me  (my balance −amount, partner +amount)
-- i_am_owed = false → I pay partner    (my balance +amount, partner −amount)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_with_member(
  apt_id uuid,
  partner_id uuid,
  settle_amount numeric,
  i_am_owed boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_from uuid;
  v_to uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'יש להתחבר';
  END IF;

  IF settle_amount IS NULL OR settle_amount <= 0 THEN
    RAISE EXCEPTION 'סכום ההסדרה חייב להיות חיובי';
  END IF;

  IF partner_id IS NULL OR partner_id = v_uid THEN
    RAISE EXCEPTION 'נא לבחור שותף להסדרה';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.members
    WHERE apartment_id = apt_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'אינכם חברים בדירה זו';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.members
    WHERE apartment_id = apt_id AND user_id = partner_id
  ) THEN
    RAISE EXCEPTION 'השותף אינו חבר בדירה זו';
  END IF;

  IF i_am_owed THEN
    v_from := partner_id;
    v_to := v_uid;
    -- Partner's debt decreases (balance rises toward 0), my credit decreases
    PERFORM public._balances_apply_delta(apt_id, v_uid, -settle_amount);
    PERFORM public._balances_apply_delta(apt_id, partner_id, settle_amount);
  ELSE
    v_from := v_uid;
    v_to := partner_id;
    PERFORM public._balances_apply_delta(apt_id, v_uid, settle_amount);
    PERFORM public._balances_apply_delta(apt_id, partner_id, -settle_amount);
  END IF;

  INSERT INTO public.settlements (apartment_id, from_user, to_user, amount)
  VALUES (apt_id, v_from, v_to, settle_amount);
END;
$$;

-- Internal helper used by settle_with_member
CREATE OR REPLACE FUNCTION public._balances_apply_delta(
  apt_id uuid,
  target_user uuid,
  delta numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_amount numeric;
BEGIN
  SELECT id, amount INTO v_id, v_amount
  FROM public.balances
  WHERE apartment_id = apt_id
    AND user_id = target_user
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.balances (apartment_id, user_id, amount)
    VALUES (apt_id, target_user, delta);
  ELSE
    UPDATE public.balances
    SET amount = v_amount + delta,
        updated_at = now()
    WHERE id = v_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._balances_apply_delta(uuid, uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_with_member(uuid, uuid, numeric, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_with_member(uuid, uuid, numeric, boolean) TO authenticated;
