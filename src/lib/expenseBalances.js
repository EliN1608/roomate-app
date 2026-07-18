/**
 * Balance helpers for expense create / edit / delete.
 * Convention: positive balance = others owe you.
 * Split: equal among provided member IDs (payer gets +share*(n-1), others −share).
 */

export async function applyBalanceDelta(supabase, apartmentId, userId, delta) {
  const { data: existing, error: selectError } = await supabase
    .from('balances')
    .select('id, amount')
    .eq('apartment_id', apartmentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase
      .from('balances')
      .update({
        amount: Number(existing.amount) + delta,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('balances').insert({
      apartment_id: apartmentId,
      user_id: userId,
      amount: delta,
    });
    if (error) throw error;
  }
}

/**
 * Apply or reverse shares on balances.
 * Each non-payer: −share; payer: +sum of others' shares.
 * @param {Array<{userId: string, amount: number}>} shares
 * @param {number} sign 1 = record expense, -1 = undo expense
 */
export async function applySharesBalance(
  supabase,
  apartmentId,
  shares,
  payerId,
  sign = 1
) {
  const rows = (shares || [])
    .map((s) => ({
      userId: s.userId,
      amount: Number(s.amount),
    }))
    .filter((s) => s.userId && Number.isFinite(s.amount) && s.amount >= 0);

  if (!payerId || rows.length === 0) return;

  const othersTotal = rows
    .filter((s) => s.userId !== payerId)
    .reduce((sum, s) => sum + s.amount, 0);

  for (const row of rows) {
    if (row.userId === payerId) continue;
    if (row.amount === 0) continue;
    await applyBalanceDelta(supabase, apartmentId, row.userId, sign * -row.amount);
  }

  if (othersTotal > 0) {
    await applyBalanceDelta(supabase, apartmentId, payerId, sign * othersTotal);
  }
}

/**
 * Apply or reverse an equal-split expense on balances.
 * @param {number} sign 1 = record expense, -1 = undo expense
 */
export async function applyEqualSplitBalance(
  supabase,
  apartmentId,
  memberIds,
  payerId,
  amount,
  sign = 1
) {
  const ids = memberIds.filter(Boolean);
  const n = ids.length;
  const parsed = Number(amount);
  if (n < 1 || !payerId || !Number.isFinite(parsed) || parsed <= 0) return;

  const share = parsed / n;
  await applySharesBalance(
    supabase,
    apartmentId,
    ids.map((id) => ({ userId: id, amount: share })),
    payerId,
    sign
  );
}

/** Load shares for an expense; empty array if none stored. */
export async function fetchExpenseShares(supabase, expenseId) {
  const { data, error } = await supabase
    .from('expense_shares')
    .select('user_id, amount')
    .eq('expense_id', expenseId);

  if (error) throw error;
  return (data || []).map((row) => ({
    userId: row.user_id,
    amount: Number(row.amount) || 0,
  }));
}

/**
 * Reverse an expense's balance impact using stored shares when available,
 * otherwise equal split across memberIds (legacy rows).
 */
export async function reverseExpenseBalance(
  supabase,
  apartmentId,
  expense,
  memberIds
) {
  const shares = await fetchExpenseShares(supabase, expense.id);
  if (shares.length > 0) {
    await applySharesBalance(
      supabase,
      apartmentId,
      shares,
      expense.paid_by,
      -1
    );
    return;
  }
  await applyEqualSplitBalance(
    supabase,
    apartmentId,
    memberIds,
    expense.paid_by,
    expense.amount,
    -1
  );
}

/** Re-apply after a failed reverse undo path. */
export async function restoreExpenseBalance(
  supabase,
  apartmentId,
  expense,
  memberIds
) {
  const shares = await fetchExpenseShares(supabase, expense.id);
  if (shares.length > 0) {
    await applySharesBalance(
      supabase,
      apartmentId,
      shares,
      expense.paid_by,
      1
    );
    return;
  }
  await applyEqualSplitBalance(
    supabase,
    apartmentId,
    memberIds,
    expense.paid_by,
    expense.amount,
    1
  );
}
