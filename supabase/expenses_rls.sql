-- Run once in Supabase SQL Editor.
-- Allow apartment members to UPDATE/DELETE shared expenses (not only the payer).
-- Recommendation: any roommate can fix mistakes in a shared household ledger.
-- Membership table: public.members

-- Helper: is current user a member of this apartment?
-- (inlined in policies below)

-- ---------------------------------------------------------------------------
-- UPDATE: any member of the expense's apartment
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS expenses_update_members ON public.expenses;
CREATE POLICY expenses_update_members ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.apartment_id = expenses.apartment_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.apartment_id = expenses.apartment_id
        AND m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- DELETE: any member of the expense's apartment
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS expenses_delete_members ON public.expenses;
CREATE POLICY expenses_delete_members ON public.expenses
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.apartment_id = expenses.apartment_id
        AND m.user_id = auth.uid()
    )
  );

-- Optional: if you already have restrictive paid_by-only policies, drop them:
-- DROP POLICY IF EXISTS expenses_update_own ON public.expenses;
-- DROP POLICY IF EXISTS expenses_delete_own ON public.expenses;
