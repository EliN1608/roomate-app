-- Run in Supabase SQL Editor (safe to re-run).
-- Shopping list features: quantity, free-text category, completed_at,
-- apartment cleanup days, and per-apartment custom categories.
-- Membership table: public.members

-- ---------------------------------------------------------------------------
-- REQUIRED FIX: remove old fixed-category check (causes insert errors)
-- ---------------------------------------------------------------------------
ALTER TABLE public.shopping_items
  DROP CONSTRAINT IF EXISTS shopping_items_category_check;

-- Drop any other check constraints on shopping_items.category (name may vary)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'shopping_items'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%category%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.shopping_items DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- shopping_items — new columns (free-text category, no fixed enum)
-- ---------------------------------------------------------------------------
ALTER TABLE public.shopping_items
  ADD COLUMN IF NOT EXISTS quantity text NULL;

ALTER TABLE public.shopping_items
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'אחר';

ALTER TABLE public.shopping_items
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;

-- Migrate legacy English keys → Hebrew labels
UPDATE public.shopping_items
SET category = CASE category
  WHEN 'food' THEN 'מזון'
  WHEN 'cleaning' THEN 'ניקיון'
  WHEN 'personal' THEN 'טיפוח'
  WHEN 'household' THEN 'לבית'
  WHEN 'other' THEN 'אחר'
  ELSE category
END
WHERE category IN ('food', 'cleaning', 'personal', 'household', 'other');

UPDATE public.shopping_items
SET category = 'אחר'
WHERE category IS NULL OR btrim(category) = '';

ALTER TABLE public.shopping_items
  ALTER COLUMN category SET DEFAULT 'אחר';

-- Backfill completed_at for items already marked done
UPDATE public.shopping_items
SET completed_at = COALESCE(completed_at, created_at, now())
WHERE is_done = true
  AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS shopping_items_apartment_category_idx
  ON public.shopping_items (apartment_id, is_done, category, sort_order);

CREATE INDEX IF NOT EXISTS shopping_items_cleanup_idx
  ON public.shopping_items (apartment_id, is_done, completed_at)
  WHERE is_done = true;

-- ---------------------------------------------------------------------------
-- apartments — cleanup window + custom category list
-- ---------------------------------------------------------------------------
ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS shopping_cleanup_days integer NOT NULL DEFAULT 7;

ALTER TABLE public.apartments DROP CONSTRAINT IF EXISTS apartments_shopping_cleanup_days_check;
ALTER TABLE public.apartments
  ADD CONSTRAINT apartments_shopping_cleanup_days_check
  CHECK (shopping_cleanup_days BETWEEN 1 AND 90);

UPDATE public.apartments
SET shopping_cleanup_days = 7
WHERE shopping_cleanup_days IS NULL;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS shopping_categories text[] NOT NULL
  DEFAULT ARRAY['מזון', 'ניקיון', 'טיפוח', 'לבית', 'אחר']::text[];

UPDATE public.apartments
SET shopping_categories = ARRAY['מזון', 'ניקיון', 'טיפוח', 'לבית', 'אחר']::text[]
WHERE shopping_categories IS NULL
   OR cardinality(shopping_categories) = 0;

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS shopping_cleanup_enabled boolean NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- RLS: apartment members can DELETE shopping items (incl. batch by ids)
-- ---------------------------------------------------------------------------
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shopping_items_delete_members ON public.shopping_items;
CREATE POLICY shopping_items_delete_members ON public.shopping_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.apartment_id = shopping_items.apartment_id
        AND m.user_id = auth.uid()
    )
  );
