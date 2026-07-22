-- Clear orphan settlements when an apartment has no expenses left.
-- Run after 002_expense_rpcs.sql (updates delete_expense).

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

-- delete_expense — also clears settlements when last expense is removed
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

-- One-time cleanup for apartments that already have orphan settlement rows
DELETE FROM public.settlements s
WHERE NOT EXISTS (
  SELECT 1 FROM public.expenses e WHERE e.apartment_id = s.apartment_id
);
