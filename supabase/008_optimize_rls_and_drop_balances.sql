-- Sync repo with production hardening (safe to re-run).
-- 1) Wrap auth.uid() in (select auth.uid()) for RLS initplan
-- 2) Covering indexes for FK columns
-- 3) Drop deprecated balances ledger (UI uses pairwise nets)

-- ---------------------------------------------------------------------------
-- apartments
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS apartments_insert_creator ON public.apartments;
CREATE POLICY apartments_insert_creator ON public.apartments
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS apartments_select_member ON public.apartments;
CREATE POLICY apartments_select_member ON public.apartments
  FOR SELECT TO authenticated
  USING (
    public.is_apartment_member(id)
    OR created_by = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- members
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS members_delete ON public.members;
CREATE POLICY members_delete ON public.members
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS members_insert_self ON public.members;
CREATE POLICY members_insert_self ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND public.apartment_exists(apartment_id)
  );

DROP POLICY IF EXISTS members_select_same_apartment ON public.members;
CREATE POLICY members_select_same_apartment ON public.members
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR public.is_apartment_member(apartment_id)
  );

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- settlements
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS settlements_select_members ON public.settlements;
CREATE POLICY settlements_select_members ON public.settlements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.apartment_id = settlements.apartment_id
        AND m.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- shopping_items
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS shopping_items_delete_members ON public.shopping_items;
CREATE POLICY shopping_items_delete_members ON public.shopping_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.apartment_id = shopping_items.apartment_id
        AND m.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- expense_shares
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS expense_shares_delete_members ON public.expense_shares;
CREATE POLICY expense_shares_delete_members ON public.expense_shares
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.expenses e
      JOIN public.members m ON m.apartment_id = e.apartment_id
      WHERE e.id = expense_shares.expense_id
        AND m.user_id = (select auth.uid())
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
        AND m.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS expense_shares_select_members ON public.expense_shares;
CREATE POLICY expense_shares_select_members ON public.expense_shares
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.expenses e
      JOIN public.members m ON m.apartment_id = e.apartment_id
      WHERE e.id = expense_shares.expense_id
        AND m.user_id = (select auth.uid())
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
        AND m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.expenses e
      JOIN public.members m ON m.apartment_id = e.apartment_id
      WHERE e.id = expense_shares.expense_id
        AND m.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- FK covering indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS apartments_created_by_idx
  ON public.apartments (created_by);

CREATE INDEX IF NOT EXISTS expense_shares_user_id_idx
  ON public.expense_shares (user_id);

CREATE INDEX IF NOT EXISTS expenses_paid_by_idx
  ON public.expenses (paid_by);

CREATE INDEX IF NOT EXISTS members_apartment_id_idx
  ON public.members (apartment_id);

CREATE INDEX IF NOT EXISTS members_user_id_idx
  ON public.members (user_id);

CREATE INDEX IF NOT EXISTS settlements_from_user_idx
  ON public.settlements (from_user);

CREATE INDEX IF NOT EXISTS settlements_to_user_idx
  ON public.settlements (to_user);

CREATE INDEX IF NOT EXISTS shopping_items_added_by_idx
  ON public.shopping_items (added_by);

-- ---------------------------------------------------------------------------
-- Drop deprecated balances ledger (pairwise UI is source of truth)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_apartment_balances(uuid);
DROP FUNCTION IF EXISTS public._balances_apply_delta(uuid, uuid, numeric);
DROP TABLE IF EXISTS public.balances CASCADE;
