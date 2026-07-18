import {
  computePairwiseNets,
  sumPairwiseBalance,
} from './balances';

async function loadSettlements(supabase, apartmentId) {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'get_apartment_settlements',
    { apt_id: apartmentId }
  );
  if (!rpcError && rpcData) return rpcData;

  const { data: rows } = await supabase
    .from('settlements')
    .select('id, from_user, to_user, amount, created_at')
    .eq('apartment_id', apartmentId)
    .order('created_at', { ascending: true });
  return rows || [];
}

/**
 * Open balance for the current user — same source as the dashboard
 * (expense shares + settlements), not the possibly-drifted balances table.
 * Positive = others owe you.
 */
export async function fetchMyOpenBalance(supabase, apartmentId, userId) {
  if (!apartmentId || !userId) return 0;

  const { data: membersData } = await supabase.rpc('get_apartment_members', {
    apt_id: apartmentId,
  });
  const members = (membersData || []).map((m) => ({
    user_id: String(m.user_id),
    name: m.full_name || '',
  }));

  const [{ data: expenses }, settlements] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, paid_by, amount, expense_shares(user_id, amount)')
      .eq('apartment_id', apartmentId),
    loadSettlements(supabase, apartmentId),
  ]);

  const pairwise = computePairwiseNets(
    userId,
    members,
    expenses || [],
    settlements || []
  );
  return sumPairwiseBalance(pairwise);
}
