-- Run in Supabase SQL Editor (safe to re-run).
-- Server-enforced apartment updates (admin + shopping settings).
-- Prerequisite: 001_core_rls_policies.sql, profile_apartment_management.sql

-- ---------------------------------------------------------------------------
-- update_apartment_details — admin only (name, address)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_apartment_details(
  apt_id uuid,
  p_name text,
  p_city text DEFAULT NULL,
  p_street text DEFAULT NULL,
  p_building_number text DEFAULT NULL,
  p_apartment_number text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'יש להתחבר';
  END IF;

  IF NOT public.is_apartment_admin(apt_id) THEN
    RAISE EXCEPTION 'רק מנהל הדירה יכול לערוך את פרטי הדירה';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'נא להזין שם דירה';
  END IF;

  UPDATE public.apartments
  SET
    name = btrim(p_name),
    city = NULLIF(btrim(COALESCE(p_city, '')), ''),
    street = NULLIF(btrim(COALESCE(p_street, '')), ''),
    building_number = NULLIF(btrim(COALESCE(p_building_number, '')), ''),
    apartment_number = NULLIF(btrim(COALESCE(p_apartment_number, '')), '')
  WHERE id = apt_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_apartment_details(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_apartment_details(uuid, text, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- update_apartment_shopping_settings — any apartment member
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_apartment_shopping_settings(
  apt_id uuid,
  p_shopping_cleanup_days integer DEFAULT NULL,
  p_shopping_cleanup_enabled boolean DEFAULT NULL,
  p_shopping_categories text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'יש להתחבר';
  END IF;

  IF NOT public.is_apartment_member(apt_id) THEN
    RAISE EXCEPTION 'אינכם חברים בדירה זו';
  END IF;

  IF p_shopping_cleanup_days IS NOT NULL
     AND (p_shopping_cleanup_days < 1 OR p_shopping_cleanup_days > 90) THEN
    RAISE EXCEPTION 'ימי ניקוי חייבים להיות בין 1 ל-90';
  END IF;

  UPDATE public.apartments
  SET
    shopping_cleanup_days = COALESCE(p_shopping_cleanup_days, shopping_cleanup_days),
    shopping_cleanup_enabled = COALESCE(p_shopping_cleanup_enabled, shopping_cleanup_enabled),
    shopping_categories = COALESCE(p_shopping_categories, shopping_categories)
  WHERE id = apt_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_apartment_shopping_settings(uuid, integer, boolean, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_apartment_shopping_settings(uuid, integer, boolean, text[]) TO authenticated;
