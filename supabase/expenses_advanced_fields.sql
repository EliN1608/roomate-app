-- Run once in Supabase SQL Editor.
-- Advanced expense fields: category, recurring, split method, per-participant shares,
-- and a monthly generator for recurring expenses.
-- Membership table: public.members

-- ---------------------------------------------------------------------------
-- expenses — new columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS split_method text NOT NULL DEFAULT 'equal';

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS recurring_source_id uuid NULL REFERENCES public.expenses(id) ON DELETE SET NULL;

-- Drop old check constraints if re-running, then recreate
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_category_check
  CHECK (category IN ('food', 'bills', 'cleaning', 'entertainment', 'other'));

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_split_method_check;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_split_method_check
  CHECK (split_method IN ('equal', 'percent', 'fixed'));

CREATE INDEX IF NOT EXISTS expenses_recurring_idx
  ON public.expenses (apartment_id, is_recurring, date)
  WHERE is_recurring = true;

CREATE INDEX IF NOT EXISTS expenses_recurring_source_idx
  ON public.expenses (recurring_source_id)
  WHERE recurring_source_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- expense_shares — who owes how much for each expense
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (expense_id, user_id)
);

CREATE INDEX IF NOT EXISTS expense_shares_expense_idx
  ON public.expense_shares (expense_id);

ALTER TABLE public.expense_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expense_shares_select_members ON public.expense_shares;
CREATE POLICY expense_shares_select_members ON public.expense_shares
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.expenses e
      JOIN public.members m ON m.apartment_id = e.apartment_id
      WHERE e.id = expense_shares.expense_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS expense_shares_insert_members ON public.expense_shares;
CREATE POLICY expense_shares_insert_members ON public.expense_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.expenses e
      JOIN public.members m ON m.apartment_id = e.apartment_id
      WHERE e.id = expense_shares.expense_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS expense_shares_update_members ON public.expense_shares;
CREATE POLICY expense_shares_update_members ON public.expense_shares
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.expenses e
      JOIN public.members m ON m.apartment_id = e.apartment_id
      WHERE e.id = expense_shares.expense_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.expenses e
      JOIN public.members m ON m.apartment_id = e.apartment_id
      WHERE e.id = expense_shares.expense_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS expense_shares_delete_members ON public.expense_shares;
CREATE POLICY expense_shares_delete_members ON public.expense_shares
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.expenses e
      JOIN public.members m ON m.apartment_id = e.apartment_id
      WHERE e.id = expense_shares.expense_id
        AND m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- generate_recurring_expenses_for_month
-- Copies last month's recurring expenses into target month (with shares).
-- Skips if a row already exists with recurring_source_id = source expense id
-- for that calendar month. Run manually or via pg_cron later.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_recurring_expenses_for_month(
  target_month date DEFAULT (date_trunc('month', current_date))::date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src record;
  new_id uuid;
  day_num int;
  last_day int;
  new_date date;
  month_start date;
  month_end date;
  prev_start date;
  prev_end date;
  inserted int := 0;
  already_exists boolean;
BEGIN
  month_start := date_trunc('month', target_month)::date;
  month_end := (month_start + interval '1 month' - interval '1 day')::date;
  prev_start := (month_start - interval '1 month')::date;
  prev_end := (month_start - interval '1 day')::date;

  FOR src IN
    SELECT e.*
    FROM public.expenses e
    WHERE e.is_recurring = true
      AND e.date >= prev_start
      AND e.date <= prev_end
      -- Prefer root / latest chain: only clone rows that are "templates" for this month window
      AND (
        e.recurring_source_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.expenses newer
          WHERE newer.recurring_source_id = COALESCE(e.recurring_source_id, e.id)
            AND newer.date >= prev_start AND newer.date <= prev_end
            AND newer.date > e.date
        )
      )
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.expenses x
      WHERE x.recurring_source_id = COALESCE(src.recurring_source_id, src.id)
        AND x.date >= month_start
        AND x.date <= month_end
    ) INTO already_exists;

    IF already_exists THEN
      CONTINUE;
    END IF;

    day_num := EXTRACT(DAY FROM src.date)::int;
    last_day := EXTRACT(DAY FROM month_end)::int;
    IF day_num > last_day THEN
      day_num := last_day;
    END IF;
    new_date := make_date(
      EXTRACT(YEAR FROM month_start)::int,
      EXTRACT(MONTH FROM month_start)::int,
      day_num
    );

    INSERT INTO public.expenses (
      apartment_id,
      paid_by,
      description,
      amount,
      date,
      category,
      is_recurring,
      split_method,
      recurring_source_id
    ) VALUES (
      src.apartment_id,
      src.paid_by,
      src.description,
      src.amount,
      new_date,
      src.category,
      true,
      src.split_method,
      COALESCE(src.recurring_source_id, src.id)
    )
    RETURNING id INTO new_id;

    INSERT INTO public.expense_shares (expense_id, user_id, amount)
    SELECT new_id, s.user_id, s.amount
    FROM public.expense_shares s
    WHERE s.expense_id = src.id;

    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

-- Example (run once per month via pg_cron / service_role only — NOT authenticated):
-- SELECT public.generate_recurring_expenses_for_month();
-- REVOKE for authenticated: see 002_expense_rpcs.sql
