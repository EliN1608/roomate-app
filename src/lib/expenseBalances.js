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
  const nonPayers = ids.filter((id) => id !== payerId);

  for (const id of nonPayers) {
    await applyBalanceDelta(supabase, apartmentId, id, sign * -share);
  }
  if (nonPayers.length > 0) {
    await applyBalanceDelta(
      supabase,
      apartmentId,
      payerId,
      sign * share * nonPayers.length
    );
  }
}
