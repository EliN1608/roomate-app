/** RPC wrappers for apartment updates. */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function rpcUpdateApartmentDetails(supabase, aptId, fields) {
  const { error } = await supabase.rpc('update_apartment_details', {
    apt_id: aptId,
    p_name: fields.name,
    p_city: fields.city ?? null,
    p_street: fields.street ?? null,
    p_building_number: fields.buildingNumber ?? null,
    p_apartment_number: fields.apartmentNumber ?? null,
  });
  if (error) throw error;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function rpcUpdateApartmentShoppingSettings(supabase, aptId, fields) {
  const payload = { apt_id: aptId };
  if (fields.shoppingCleanupDays !== undefined) {
    payload.p_shopping_cleanup_days = fields.shoppingCleanupDays;
  }
  if (fields.shoppingCleanupEnabled !== undefined) {
    payload.p_shopping_cleanup_enabled = fields.shoppingCleanupEnabled;
  }
  if (fields.shoppingCategories !== undefined) {
    payload.p_shopping_categories = fields.shoppingCategories;
  }

  const { error } = await supabase.rpc('update_apartment_shopping_settings', payload);
  if (error) throw error;
}

/** Normalize invite code for lookup (matches OnboardingPage). */
export function normalizeInviteCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .trim()
    .replace(/0/g, 'O')
    .replace(/1/g, 'I');
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function rpcFindApartmentByInvite(supabase, inviteCode) {
  const { data, error } = await supabase.rpc('find_apartment_by_invite', {
    p_invite: normalizeInviteCode(inviteCode),
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data;
}
