-- Cleanup settlements + balances when a member leaves or is removed.
-- Run in Supabase SQL Editor after 006 (safe to re-run).
-- Keeps expense_shares for historical expense records; pairwise UI already
-- ignores users who are no longer apartment members.

-- ---------------------------------------------------------------------------
-- leave_apartment(apt_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_apartment(apt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_member_count int;
  v_admin_count int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'יש להתחבר כדי לעזוב דירה';
  END IF;

  SELECT m.role INTO v_role
  FROM public.members m
  WHERE m.apartment_id = apt_id
    AND m.user_id = v_uid;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'אינכם חברים בדירה זו';
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM public.members
  WHERE apartment_id = apt_id;

  IF v_role = 'admin' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.members
    WHERE apartment_id = apt_id
      AND role = 'admin';

    IF v_admin_count <= 1 AND v_member_count > 1 THEN
      RAISE EXCEPTION 'אתם המנהלים היחידים. העבירו תפקיד מנהל לשותף אחר לפני העזיבה.';
    END IF;
  END IF;

  DELETE FROM public.settlements s
  WHERE s.apartment_id = apt_id
    AND (s.from_user = v_uid OR s.to_user = v_uid);

  DELETE FROM public.balances b
  WHERE b.apartment_id = apt_id
    AND b.user_id = v_uid;

  DELETE FROM public.members
  WHERE apartment_id = apt_id
    AND user_id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_apartment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_apartment(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- remove_apartment_member(apt_id, target_user_id) — admin only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_apartment_member(
  apt_id uuid,
  target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_target_role text;
  v_admin_count int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'יש להתחבר';
  END IF;

  IF NOT public.is_apartment_admin(apt_id) THEN
    RAISE EXCEPTION 'רק מנהל הדירה יכול להסיר שותפים';
  END IF;

  IF target_user_id = v_uid THEN
    RAISE EXCEPTION 'לא ניתן להסיר את עצמכם. השתמשו בעזיבת דירה.';
  END IF;

  SELECT m.role INTO v_target_role
  FROM public.members m
  WHERE m.apartment_id = apt_id
    AND m.user_id = target_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'המשתמש אינו חבר בדירה זו';
  END IF;

  IF v_target_role = 'admin' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.members
    WHERE apartment_id = apt_id
      AND role = 'admin';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'לא ניתן להסיר את המנהל היחיד. העבירו תפקיד מנהל קודם.';
    END IF;
  END IF;

  DELETE FROM public.settlements s
  WHERE s.apartment_id = apt_id
    AND (s.from_user = target_user_id OR s.to_user = target_user_id);

  DELETE FROM public.balances b
  WHERE b.apartment_id = apt_id
    AND b.user_id = target_user_id;

  DELETE FROM public.members
  WHERE apartment_id = apt_id
    AND user_id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_apartment_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_apartment_member(uuid, uuid) TO authenticated;
