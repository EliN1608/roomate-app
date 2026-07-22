import { describe, it, expect, afterAll } from 'vitest';
import {
  hasSupabaseEnv,
  createTestUser,
  createServiceClient,
} from './helpers.js';

const describeBackend = hasSupabaseEnv() ? describe : describe.skip;

describeBackend('profiles backend', () => {
  const userIds = [];

  afterAll(async () => {
    const admin = createServiceClient();
    if (!admin) return;
    for (const uid of userIds) {
      await admin.from('profiles').delete().eq('user_id', uid);
      try {
        await admin.auth.admin.deleteUser(uid);
      } catch {
        // ignore
      }
    }
  });

  it('creates a profiles row automatically on signup (handle_new_user trigger)', async () => {
    const user = await createTestUser('profile-trigger');
    userIds.push(user.userId);

    // Trigger is AFTER INSERT (usually immediate) — short retry only if needed
    let profile = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await user.client
        .from('profiles')
        .select('user_id, full_name')
        .eq('user_id', user.userId)
        .maybeSingle();

      if (error) throw error;
      if (data?.user_id) {
        profile = data;
        break;
      }
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 75));
      }
    }

    expect(profile).toBeTruthy();
    expect(profile.user_id).toBe(user.userId);
    expect(profile.full_name).toBe(user.fullName);
  });
});
