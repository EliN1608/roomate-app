-- Run in Supabase SQL Editor (safe to re-run).
-- Reliable apartment lookup for AuthContext (bypasses RLS join issues).

CREATE OR REPLACE FUNCTION public.get_my_apartment()
RETURNS TABLE (
  apartment_id uuid,
  role text,
  name text,
  street text,
  building_number text,
  apartment_number text,
  invite_code text,
  city text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.apartment_id,
    m.role,
    a.name,
    a.street,
    a.building_number,
    a.apartment_number,
    a.invite_code,
    a.city
  FROM public.members m
  JOIN public.apartments a ON a.id = m.apartment_id
  WHERE m.user_id = auth.uid()
  ORDER BY m.apartment_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_apartment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_apartment() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_apartment() TO authenticated;
