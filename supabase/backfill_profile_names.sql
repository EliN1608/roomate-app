-- Optional one-shot: fill empty profiles.full_name from auth metadata / email
-- Run after get_apartment_members.sql if names are still blank.

UPDATE public.profiles p
SET full_name = COALESCE(
  NULLIF(trim(BOTH FROM COALESCE(u.raw_user_meta_data->>'full_name', '')), ''),
  NULLIF(trim(BOTH FROM split_part(u.email, '@', 1)), ''),
  p.full_name
)
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.full_name IS NULL OR trim(BOTH FROM p.full_name) = '');
