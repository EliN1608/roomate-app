-- Run in Supabase SQL Editor (safe to re-run).
-- Atomic expense CRUD + settlement fix (settlements-only ledger).
-- Prerequisite: 001_core_rls_policies.sql, expenses_advanced_fields.sql,
--               apartment_profiles_and_settlements.sql

-- ---------------------------------------------------------------------------
-- Lock down generate_recurring_expenses_for_month (cron / service_role only)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.generate_recurring_expenses_for_month(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_recurring_expenses_for_month(date) FROM anon;
REVOKE ALL ON FUNCTION public.generate_recurring_expenses_for_month(date) FROM authenticated;

-- ---------------------------------------------------------------------------
-- Share validation helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._validate_expense_shares(
  p_apartment_id uuid,
  p_amount numeric,
  p_shares jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  elem jsonb;
  v_uid uuid;
  share_amt numeric;
  total numeric := 0;
  cnt int := 0;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'הסכום חייב להיות מספר גדול מ-0';
  END IF;

  IF p_shares IS NULL
     OR jsonb_typeof(p_shares) <> 'array'
     OR jsonb_array_length(p_shares) = 0 THEN
    RAISE EXCEPTION 'נא לבחור לפחות שותף אחד לחלוקה';
  END IF;

  FOR elem IN SELECT value FROM jsonb_array_elements(p_shares) AS t(value)
  LOOP
    v_uid := (elem->>'user_id')::uuid;
    share_amt := (elem->>'amount')::numeric;

    IF v_uid IS NULL OR share_amt IS NULL OR share_amt < 0 THEN
      RAISE EXCEPTION 'נתוני חלוקה לא תקינים';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.apartment_id = p_apartment_id
        AND m.user_id = v_uid
    ) THEN
      RAISE EXCEPTION 'משתתף אינו חבר בדירה';
    END IF;

    total := total + share_amt;
    cnt := cnt + 1;
  END LOOP;

  IF cnt = 0 THEN
    RAISE EXCEPTION 'נא לבחור לפחות שותף אחד לחלוקה';
  END IF;

  IF abs(total - p_amount) > 0.02 THEN
    RAISE EXCEPTION 'סכום החלוקה חייב להסתכם לסכום ההוצאה';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._validate_expense_shares(uuid, numeric, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._validate_expense_shares(uuid, numeric, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public._validate_expense_shares(uuid, numeric, jsonb) FROM authenticated;

-- ---------------------------------------------------------------------------
-- create_expense — atomic insert expense + shares
-- p_shares: [{"user_id":"uuid","amount":12.5}, ...]
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_expense(
  p_apartment_id uuid,
  p_paid_by uuid,
  p_description text,
  p_amount numeric,
  p_date date,
  p_category text DEFAULT 'other',
  p_is_recurring boolean DEFAULT false,
  p_split_method text DEFAULT 'equal',
  p_shares jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_expense_id uuid;
  elem jsonb;
  v_user uuid;
  v_amt numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'יש להתחבר';
  END IF;

  IF NOT public.is_apartment_member(p_apartment_id) THEN
    RAISE EXCEPTION 'אינכם חברים בדירה זו';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.apartment_id = p_apartment_id AND m.user_id = p_paid_by
  ) THEN
    RAISE EXCEPTION 'המשלם אינו חבר בדירה';
  END IF;

  IF p_description IS NULL OR btrim(p_description) = '' THEN
    RAISE EXCEPTION 'נא להזין תיאור';
  END IF;

  IF p_split_method NOT IN ('equal', 'percent', 'fixed') THEN
    RAISE EXCEPTION 'אופן חלוקה לא תקין';
  END IF;

  PERFORM public._validate_expense_shares(p_apartment_id, p_amount, p_shares);

  INSERT INTO public.expenses (
    apartment_id,
    paid_by,
    description,
    amount,
    date,
    category,
    is_recurring,
    split_method
  ) VALUES (
    p_apartment_id,
    p_paid_by,
    btrim(p_description),
    p_amount,
    p_date,
    COALESCE(p_category, 'other'),
    COALESCE(p_is_recurring, false),
    p_split_method
  )
  RETURNING id INTO v_expense_id;

  FOR elem IN SELECT value FROM jsonb_array_elements(p_shares) AS t(value)
  LOOP
    v_user := (elem->>'user_id')::uuid;
    v_amt := (elem->>'amount')::numeric;
    INSERT INTO public.expense_shares (expense_id, user_id, amount)
    VALUES (v_expense_id, v_user, v_amt);
  END LOOP;

  RETURN v_expense_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_expense(uuid, uuid, text, numeric, date, text, boolean, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_expense(uuid, uuid, text, numeric, date, text, boolean, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_expense(uuid, uuid, text, numeric, date, text, boolean, text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- update_expense — atomic update + replace shares
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_expense(
  p_expense_id uuid,
  p_description text,
  p_amount numeric,
  p_paid_by uuid,
  p_date date,
  p_split_method text,
  p_shares jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_apt uuid;
  elem jsonb;
  v_user uuid;
  v_amt numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'יש להתחבר';
  END IF;

  SELECT e.apartment_id INTO v_apt
  FROM public.expenses e
  WHERE e.id = p_expense_id;

  IF v_apt IS NULL THEN
    RAISE EXCEPTION 'הוצאה לא נמצאה';
  END IF;

  IF NOT public.is_apartment_member(v_apt) THEN
    RAISE EXCEPTION 'אינכם חברים בדירה זו';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.apartment_id = v_apt AND m.user_id = p_paid_by
  ) THEN
    RAISE EXCEPTION 'המשלם אינו חבר בדירה';
  END IF;

  IF p_description IS NULL OR btrim(p_description) = '' THEN
    RAISE EXCEPTION 'נא להזין תיאור';
  END IF;

  IF p_split_method NOT IN ('equal', 'percent', 'fixed') THEN
    RAISE EXCEPTION 'אופן חלוקה לא תקין';
  END IF;

  PERFORM public._validate_expense_shares(v_apt, p_amount, p_shares);

  UPDATE public.expenses
  SET
    description = btrim(p_description),
    amount = p_amount,
    paid_by = p_paid_by,
    date = p_date,
    split_method = p_split_method
  WHERE id = p_expense_id;

  DELETE FROM public.expense_shares WHERE expense_id = p_expense_id;

  FOR elem IN SELECT value FROM jsonb_array_elements(p_shares) AS t(value)
  LOOP
    v_user := (elem->>'user_id')::uuid;
    v_amt := (elem->>'amount')::numeric;
    INSERT INTO public.expense_shares (expense_id, user_id, amount)
    VALUES (p_expense_id, v_user, v_amt);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.update_expense(uuid, text, numeric, uuid, date, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_expense(uuid, text, numeric, uuid, date, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_expense(uuid, text, numeric, uuid, date, text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- clear_settlements_if_no_expenses
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clear_settlements_if_no_expenses(p_apartment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_apartment_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.expenses e WHERE e.apartment_id = p_apartment_id
  ) THEN
    DELETE FROM public.settlements s WHERE s.apartment_id = p_apartment_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_settlements_if_no_expenses(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_settlements_if_no_expenses(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.clear_settlements_if_no_expenses(uuid) FROM authenticated;

-- ---------------------------------------------------------------------------
-- delete_expense
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_expense(p_expense_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_apt uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'יש להתחבר';
  END IF;

  SELECT e.apartment_id INTO v_apt
  FROM public.expenses e
  WHERE e.id = p_expense_id;

  IF v_apt IS NULL THEN
    RAISE EXCEPTION 'הוצאה לא נמצאה';
  END IF;

  IF NOT public.is_apartment_member(v_apt) THEN
    RAISE EXCEPTION 'אינכם חברים בדירה זו';
  END IF;

  DELETE FROM public.expenses WHERE id = p_expense_id;

  PERFORM public.clear_settlements_if_no_expenses(v_apt);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_expense(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_expense(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_expense(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- settle_with_member — settlements only (pairwise display is source of truth)
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

  IF NOT public.is_apartment_member(apt_id) THEN
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
  ELSE
    v_from := v_uid;
    v_to := partner_id;
  END IF;

  INSERT INTO public.settlements (apartment_id, from_user, to_user, amount)
  VALUES (apt_id, v_from, v_to, settle_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.settle_with_member(uuid, uuid, numeric, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_with_member(uuid, uuid, numeric, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.settle_with_member(uuid, uuid, numeric, boolean) TO authenticated;
