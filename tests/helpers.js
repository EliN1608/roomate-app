/**
 * Shared helpers for RooMate backend integration tests (Vitest + Supabase).
 * Uses the anon key + Auth signUp so RLS is exercised like a real client.
 */
import { createClient } from '@supabase/supabase-js';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

loadDotenv({ path: resolve(process.cwd(), '.env.local') });
loadDotenv({ path: resolve(process.cwd(), '.env') });

export function getSupabaseEnv() {
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    '';
  return { url, anonKey, serviceRoleKey };
}

export function hasSupabaseEnv() {
  const { url, anonKey } = getSupabaseEnv();
  return Boolean(url && anonKey);
}

/** Fresh anon client (no shared session). */
export function createAnonClient() {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/** Admin client — only when service role key is set (optional cleanup). */
export function createServiceClient() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function uniqueInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export function uniqueEmail(label = 'user') {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `roomate.${label}.${stamp}@example.com`;
}

/**
 * Sign up a disposable user and return { client, user, email, password }.
 * Requires Auth email confirmation to be disabled (typical for student projects).
 */
export async function createTestUser(label = 'user') {
  const email = uniqueEmail(label);
  const password = 'TestPass123!';
  const fullName = `Test ${label}`;

  let lastError = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const client = createAnonClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      lastError = error;
      const msg = `${error.message || ''}`.toLowerCase();
      if (msg.includes('rate limit') || error.status === 429) {
        // Exponential backoff — Auth free-tier limits are easy to hit in suites
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw error;
    }

    if (!data.user?.id) {
      throw new Error(
        'signUp did not return a user — is email confirmation required?'
      );
    }

    if (!data.session) {
      const signed = await client.auth.signInWithPassword({ email, password });
      if (signed.error || !signed.data.session) {
        throw new Error(
          'No session after signUp. Disable "Confirm email" in Supabase Auth settings for tests.'
        );
      }
    }

    return {
      client,
      user: data.user,
      userId: data.user.id,
      email,
      password,
      fullName,
    };
  }

  throw lastError || new Error('signUp rate limited');
}

/**
 * Create several test users sequentially with a short gap (avoids Auth bursts).
 * @param {string[]} labels
 */
export async function createTestUsers(labels) {
  const users = [];
  for (let i = 0; i < labels.length; i += 1) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 400));
    }
    users.push(await createTestUser(labels[i]));
  }
  return users;
}

/**
 * Delete all expenses in an apartment (via delete_expense RPC).
 * Used between shared-setup tests so leftover rows don't interfere.
 */
export async function clearApartmentExpenses(client, apartmentId) {
  const { data, error } = await client
    .from('expenses')
    .select('id')
    .eq('apartment_id', apartmentId);
  if (error) throw error;
  for (const row of data || []) {
    const { error: delErr } = await client.rpc('delete_expense', {
      p_expense_id: row.id,
    });
    if (delErr) throw delErr;
  }
}

/** Create apartment + admin membership (mirrors OnboardingPage). */
export async function createApartmentForUser(client, userId, name) {
  const inviteCode = uniqueInviteCode();
  const { data: apartment, error: apartmentError } = await client
    .from('apartments')
    .insert({
      name,
      invite_code: inviteCode,
      created_by: userId,
      street: 'Test St',
      building_number: '1',
      apartment_number: '1',
      city: 'Test City',
    })
    .select('id, name, invite_code')
    .maybeSingle();

  if (apartmentError) throw apartmentError;
  if (!apartment?.id) throw new Error('Apartment insert returned no id');

  const { error: memberError } = await client.from('members').insert({
    user_id: userId,
    apartment_id: apartment.id,
    role: 'admin',
  });
  if (memberError) throw memberError;

  return apartment;
}

/** Join apartment by invite (mirrors OnboardingPage). */
export async function joinApartmentByInvite(client, userId, inviteCode) {
  const { data, error } = await client.rpc('find_apartment_by_invite', {
    p_invite: String(inviteCode || '')
      .toUpperCase()
      .trim()
      .replace(/0/g, 'O')
      .replace(/1/g, 'I'),
  });
  if (error) throw error;

  const apartment = Array.isArray(data) ? data[0] || null : data;
  if (!apartment?.id) return { apartment: null, memberError: null };

  const { error: memberError } = await client.from('members').insert({
    user_id: userId,
    apartment_id: apartment.id,
    role: 'member',
  });

  return { apartment, memberError };
}

/** Best-effort cleanup (service role preferred). */
export async function cleanupApartment(apartmentId, userIds = []) {
  const admin = createServiceClient();
  if (!admin || !apartmentId) return;

  await admin.from('shopping_items').delete().eq('apartment_id', apartmentId);
  await admin.from('settlements').delete().eq('apartment_id', apartmentId);
  await admin.from('expenses').delete().eq('apartment_id', apartmentId);
  await admin.from('balances').delete().eq('apartment_id', apartmentId);
  await admin.from('members').delete().eq('apartment_id', apartmentId);
  await admin.from('apartments').delete().eq('id', apartmentId);

  for (const uid of userIds) {
    if (!uid) continue;
    await admin.from('profiles').delete().eq('user_id', uid);
    try {
      await admin.auth.admin.deleteUser(uid);
    } catch {
      // ignore
    }
  }
}
