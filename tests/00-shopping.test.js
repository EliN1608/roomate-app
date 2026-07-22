import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  hasSupabaseEnv,
  createTestUser,
  createApartmentForUser,
  cleanupApartment,
} from './helpers.js';
import { cleanupCutoffIso } from '../src/lib/shopping.js';

const describeBackend = hasSupabaseEnv() ? describe : describe.skip;

describeBackend('shopping_items backend', () => {
  let user;
  let apartment;
  const created = { apartmentIds: [], userIds: [] };

  beforeAll(async () => {
    user = await createTestUser('shop-shared');
    created.userIds.push(user.userId);

    apartment = await createApartmentForUser(
      user.client,
      user.userId,
      'TEST Shopping Shared'
    );
    created.apartmentIds.push(apartment.id);
  }, 60_000);

  beforeEach(async () => {
    await user.client
      .from('shopping_items')
      .delete()
      .eq('apartment_id', apartment.id);
  });

  afterAll(async () => {
    for (const aptId of created.apartmentIds) {
      await cleanupApartment(aptId, created.userIds);
    }
  });

  it('batch-deleting unpurchased shopping items removes only the selected items', async () => {
    const { data: inserted, error: insertErr } = await user.client
      .from('shopping_items')
      .insert([
        {
          apartment_id: apartment.id,
          name: 'חלב',
          added_by: user.userId,
          is_done: false,
          sort_order: 0,
        },
        {
          apartment_id: apartment.id,
          name: 'לחם',
          added_by: user.userId,
          is_done: false,
          sort_order: 1,
        },
        {
          apartment_id: apartment.id,
          name: 'ביצים',
          added_by: user.userId,
          is_done: false,
          sort_order: 2,
        },
      ])
      .select('id, name');

    expect(insertErr).toBeNull();
    expect(inserted).toHaveLength(3);

    const toDelete = inserted
      .filter((i) => i.name !== 'ביצים')
      .map((i) => i.id);
    const keepId = inserted.find((i) => i.name === 'ביצים').id;

    const { error: deleteErr } = await user.client
      .from('shopping_items')
      .delete()
      .eq('apartment_id', apartment.id)
      .eq('is_done', false)
      .in('id', toDelete);

    expect(deleteErr).toBeNull();

    const { data: remaining } = await user.client
      .from('shopping_items')
      .select('id, name')
      .eq('apartment_id', apartment.id);

    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(keepId);
    expect(remaining[0].name).toBe('ביצים');
  });

  it('auto-delete removes purchased items older than X days but keeps newer ones', async () => {
    const days = 7;
    const cutoff = cleanupCutoffIso(days);
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - (days + 2));
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 1);

    const { data: inserted, error: insertErr } = await user.client
      .from('shopping_items')
      .insert([
        {
          apartment_id: apartment.id,
          name: 'ישן שנרכש',
          added_by: user.userId,
          is_done: true,
          completed_at: oldDate.toISOString(),
          sort_order: 0,
        },
        {
          apartment_id: apartment.id,
          name: 'חדש שנרכש',
          added_by: user.userId,
          is_done: true,
          completed_at: recentDate.toISOString(),
          sort_order: 1,
        },
        {
          apartment_id: apartment.id,
          name: 'עדיין לא נרכש',
          added_by: user.userId,
          is_done: false,
          completed_at: null,
          sort_order: 2,
        },
      ])
      .select('id, name');

    expect(insertErr).toBeNull();
    expect(inserted).toHaveLength(3);

    const { data: deleted, error: cleanupErr } = await user.client
      .from('shopping_items')
      .delete()
      .eq('apartment_id', apartment.id)
      .eq('is_done', true)
      .lt('completed_at', cutoff)
      .select('id, name');

    expect(cleanupErr).toBeNull();
    expect((deleted || []).map((d) => d.name)).toEqual(['ישן שנרכש']);

    const { data: remaining } = await user.client
      .from('shopping_items')
      .select('name')
      .eq('apartment_id', apartment.id)
      .order('sort_order');

    const names = (remaining || []).map((r) => r.name).sort();
    expect(names).toEqual(['חדש שנרכש', 'עדיין לא נרכש'].sort());
  });
});
