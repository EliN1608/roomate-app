-- Legacy helper. Prefer get_apartment_members (returns full_name + avatar_url).
-- Kept for callers that still invoke get_apartment_profiles (e.g. ExpensesHistoryPage).

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
        AND me.user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_apartment_profiles(uuid) TO authenticated;
