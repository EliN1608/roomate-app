-- Run once in Supabase SQL Editor.
-- Auto-create public.profiles when a user signs up (auth.users INSERT).
-- Uses signup metadata full_name when present (already passed from LoginPage /
-- AuthContext.register via options.data.full_name); otherwise falls back to
-- the email local-part. Does not overwrite an existing profile row.
--
-- Note: uses WHERE NOT EXISTS (not ON CONFLICT) so it works even if
-- profiles.user_id has no unique constraint yet.

-- ---------------------------------------------------------------------------
-- Optional: unique index on user_id (skip quietly if duplicates already exist)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype IN ('u', 'p')
      AND pg_get_constraintdef(oid) ILIKE '%user_id%'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND indexdef ILIKE '%UNIQUE%user_id%'
  ) THEN
    -- Only create if no duplicate user_id rows
    IF NOT EXISTS (
      SELECT user_id
      FROM public.profiles
      WHERE user_id IS NOT NULL
      GROUP BY user_id
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key
        ON public.profiles (user_id);
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- handle_new_user — SECURITY DEFINER so it can write profiles despite RLS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name text;
BEGIN
  -- Prefer name from signup form (raw_user_meta_data.full_name)
  display_name := NULLIF(trim(BOTH FROM COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');

  -- Fallback: local part of email (before @)
  IF display_name IS NULL AND NEW.email IS NOT NULL THEN
    display_name := NULLIF(trim(BOTH FROM split_part(NEW.email, '@', 1)), '');
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  SELECT NEW.id, display_name
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = NEW.id
  );

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: after each new auth user
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Backfill: existing auth users missing a profiles row
-- (fixes "שותף ללא שם" for users who signed up before this trigger)
-- ---------------------------------------------------------------------------
INSERT INTO public.profiles (user_id, full_name)
SELECT
  u.id,
  COALESCE(
    NULLIF(trim(BOTH FROM COALESCE(u.raw_user_meta_data->>'full_name', '')), ''),
    NULLIF(trim(BOTH FROM split_part(u.email, '@', 1)), ''),
    NULL
  )
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
);
