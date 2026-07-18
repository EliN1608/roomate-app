-- Run once in Supabase SQL Editor.
-- Adds sort_order so shopping list drag-and-drop can persist.
-- Membership table: public.members

ALTER TABLE public.shopping_items
  ADD COLUMN IF NOT EXISTS sort_order integer;

-- Backfill existing rows per apartment (stable by created_at)
WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY apartment_id
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) - 1)::integer AS rn
  FROM public.shopping_items
)
UPDATE public.shopping_items s
SET sort_order = ranked.rn
FROM ranked
WHERE s.id = ranked.id
  AND (s.sort_order IS NULL);

ALTER TABLE public.shopping_items
  ALTER COLUMN sort_order SET DEFAULT 0;

UPDATE public.shopping_items
SET sort_order = 0
WHERE sort_order IS NULL;

ALTER TABLE public.shopping_items
  ALTER COLUMN sort_order SET NOT NULL;

CREATE INDEX IF NOT EXISTS shopping_items_apartment_sort_idx
  ON public.shopping_items (apartment_id, is_done, sort_order);
