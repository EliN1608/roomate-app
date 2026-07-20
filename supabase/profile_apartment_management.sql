-- Run once in Supabase SQL Editor.
-- Profile + apartment membership management:
--   - avatars storage bucket + policies
--   - profiles RLS for self-update (full_name, avatar_url)
--   - RPCs: leave_apartment, remove_apartment_member,
--           transfer_apartment_admin, regenerate_invite_code
--
-- Membership table: public.members
-- Apartments table: public.apartments
-- Profiles table: public.profiles

-- ---------------------------------------------------------------------------
-- Storage: public avatars bucket (read) — write only under {auth.uid()}/*
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
CREATE POLICY avatars_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
CREATE POLICY avatars_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
CREATE POLICY avatars_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- profiles: ensure avatar_url + RLS for self select/update
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Ensure unique user_id for upserts / one-row-per-user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND indexdef ILIKE '%UNIQUE%user_id%'
  ) AND NOT EXISTS (
    SELECT user_id
    FROM public.profiles
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key
      ON public.profiles (user_id);
  END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Helper: is caller an admin of apt_id?
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_apartment_admin(apt_id uuid)
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
      AND m.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_apartment_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_apartment_admin(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- leave_apartment(apt_id)
-- Blocks sole admin when other members remain.
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

-- ---------------------------------------------------------------------------
-- transfer_apartment_admin(apt_id, new_admin_id)
-- Full transfer: target → admin, caller → member
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_apartment_admin(
  apt_id uuid,
  new_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'יש להתחבר';
  END IF;

  IF NOT public.is_apartment_admin(apt_id) THEN
    RAISE EXCEPTION 'רק מנהל הדירה יכול להעביר תפקיד מנהל';
  END IF;

  IF new_admin_id = v_uid THEN
    RAISE EXCEPTION 'כבר אתם מנהלי הדירה';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.members
    WHERE apartment_id = apt_id
      AND user_id = new_admin_id
  ) THEN
    RAISE EXCEPTION 'השותף אינו חבר בדירה זו';
  END IF;

  UPDATE public.members
  SET role = 'admin'
  WHERE apartment_id = apt_id
    AND user_id = new_admin_id;

  UPDATE public.members
  SET role = 'member'
  WHERE apartment_id = apt_id
    AND user_id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_apartment_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_apartment_admin(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- regenerate_invite_code(apt_id) — admin only; returns new code
-- Charset matches OnboardingPage: ABCDEFGHJKLMNPQRSTUVWXYZ23456789
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(apt_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_i int;
  v_attempts int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'יש להתחבר';
  END IF;

  IF NOT public.is_apartment_admin(apt_id) THEN
    RAISE EXCEPTION 'רק מנהל הדירה יכול ליצור קוד הזמנה מחדש';
  END IF;

  LOOP
    v_code := '';
    FOR v_i IN 1..6 LOOP
      v_code := v_code || substr(
        v_chars,
        1 + floor(random() * length(v_chars))::int,
        1
      );
    END LOOP;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.apartments a WHERE a.invite_code = v_code
    );

    v_attempts := v_attempts + 1;
    IF v_attempts > 20 THEN
      RAISE EXCEPTION 'לא ניתן לייצר קוד הזמנה ייחודי. נסו שוב.';
    END IF;
  END LOOP;

  UPDATE public.apartments
  SET invite_code = v_code
  WHERE id = apt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'הדירה לא נמצאה';
  END IF;

  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerate_invite_code(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code(uuid) TO authenticated;
