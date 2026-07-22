-- Run once in Supabase SQL Editor.
-- Extends get_apartment_members to return roommate display fields from profiles.
-- SECURITY DEFINER bypasses profiles RLS so apartment mates can see each other's names.
-- Caller must be a member of apt_id (same check as before).

-- Optional: ensure avatar column exists (safe if already present)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Return type change requires drop + recreate
DROP FUNCTION IF EXISTS public.get_apartment_members(uuid);

CREATE FUNCTION public.get_apartment_members(apt_id uuid)
RETURNS TABLE (
  user_id uuid,
  role text,
  full_name text,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.user_id,
    m.role::text,
    p.full_name,
    p.avatar_url
  FROM public.members m
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  WHERE m.apartment_id = apt_id
    AND EXISTS (
      SELECT 1
      FROM public.members me
      WHERE me.apartment_id = apt_id
        AND me.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.get_apartment_members(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_apartment_members(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_apartment_members(uuid) TO authenticated;
