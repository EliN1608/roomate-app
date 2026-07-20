/** RPC wrappers for atomic expense mutations. */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} params
 */
export async function rpcCreateExpense(supabase, params) {
  const {
    apartmentId,
    paidBy,
    description,
    amount,
    date,
    category,
    isRecurring,
    splitMethod,
    shares,
  } = params;

  const payload = (shares || []).map((s) => ({
    user_id: s.userId,
    amount: Number(s.amount),
  }));

  const { data, error } = await supabase.rpc('create_expense', {
    p_apartment_id: apartmentId,
    p_paid_by: paidBy,
    p_description: description,
    p_amount: amount,
    p_date: date,
    p_category: category,
    p_is_recurring: isRecurring,
    p_split_method: splitMethod,
    p_shares: payload,
  });

  if (error) throw error;
  return data;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} params
 */
export async function rpcUpdateExpense(supabase, params) {
  const {
    expenseId,
    description,
    amount,
    paidBy,
    date,
    splitMethod,
    shares,
  } = params;

  const payload = (shares || []).map((s) => ({
    user_id: s.userId,
    amount: Number(s.amount),
  }));

  const { error } = await supabase.rpc('update_expense', {
    p_expense_id: expenseId,
    p_description: description,
    p_amount: amount,
    p_paid_by: paidBy,
    p_date: date,
    p_split_method: splitMethod,
    p_shares: payload,
  });

  if (error) throw error;
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
export async function rpcDeleteExpense(supabase, expenseId) {
  const { error } = await supabase.rpc('delete_expense', {
    p_expense_id: expenseId,
  });
  if (error) throw error;
}

/**
 * Scale share amounts when expense total changes (preserves split ratios).
 * @param {Array<{userId: string, amount: number}>} shares
 */
export function scaleSharesForAmount(shares, oldAmount, newAmount) {
  const oldTotal = Number(oldAmount);
  const newTotal = Number(newAmount);
  if (!shares?.length || !Number.isFinite(oldTotal) || oldTotal <= 0) {
    return shares || [];
  }
  if (!Number.isFinite(newTotal) || newTotal <= 0) {
    return shares;
  }
  if (Math.abs(oldTotal - newTotal) < 0.005) {
    return shares.map((s) => ({
      userId: s.userId,
      amount: Number(s.amount),
    }));
  }
  const ratio = newTotal / oldTotal;
  return shares.map((s) => ({
    userId: s.userId,
    amount: Number(s.amount) * ratio,
  }));
}

/** Load expense with shares for edit. */
export async function fetchExpenseWithShares(supabase, expenseId) {
  const { data, error } = await supabase
    .from('expenses')
    .select(
      'id, description, amount, date, paid_by, split_method, expense_shares(user_id, amount)'
    )
    .eq('id', expenseId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    shares: (data.expense_shares || []).map((s) => ({
      userId: s.user_id,
      amount: Number(s.amount) || 0,
    })),
  };
}
