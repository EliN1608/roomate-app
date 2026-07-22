import { describe, it, expect, afterAll } from 'vitest';
import {
  hasSupabaseEnv,
  createTestUsers,
  createApartmentForUser,
  joinApartmentByInvite,
  cleanupApartment,
} from './helpers.js';

const describeBackend = hasSupabaseEnv() ? describe : describe.skip;

describeBackend('apartments backend', () => {
  const created = { apartmentIds: [], userIds: [] };

  afterAll(async () => {
    for (const aptId of created.apartmentIds) {
      await cleanupApartment(aptId, created.userIds);
    }
  });

  it('creates an apartment in the database with a unique invite code', async () => {
    const [adminA, adminB] = await createTestUsers([
      'apt-admin-a',
      'apt-admin-b',
    ]);
    created.userIds.push(adminA.userId, adminB.userId);

    const aptA = await createApartmentForUser(
      adminA.client,
      adminA.userId,
      'TEST RooMate Apt A'
    );
    const aptB = await createApartmentForUser(
      adminB.client,
      adminB.userId,
      'TEST RooMate Apt B'
    );
    created.apartmentIds.push(aptA.id, aptB.id);

    expect(aptA.invite_code).toMatch(/^[A-Z0-9]{6}$/);
    expect(aptB.invite_code).toMatch(/^[A-Z0-9]{6}$/);
    expect(aptA.invite_code).not.toBe(aptB.invite_code);

    const { data: stored } = await adminA.client
      .from('apartments')
      .select('id, invite_code, name')
      .eq('id', aptA.id)
      .maybeSingle();

    expect(stored?.invite_code).toBe(aptA.invite_code);
    expect(stored?.name).toBe('TEST RooMate Apt A');
  });

  it('joining with a valid invite creates a members row; invalid code fails without one', async () => {
    const [owner, joiner, outsider] = await createTestUsers([
      'join-owner',
      'join-member',
      'join-bad',
    ]);
    created.userIds.push(owner.userId, joiner.userId, outsider.userId);

    const apartment = await createApartmentForUser(
      owner.client,
      owner.userId,
      'TEST Join Apt'
    );
    created.apartmentIds.push(apartment.id);

    const { apartment: found, memberError } = await joinApartmentByInvite(
      joiner.client,
      joiner.userId,
      apartment.invite_code
    );
    expect(found?.id).toBe(apartment.id);
    expect(memberError).toBeNull();

    const { data: membership } = await joiner.client
      .from('members')
      .select('id, apartment_id, role')
      .eq('user_id', joiner.userId)
      .eq('apartment_id', apartment.id)
      .maybeSingle();
    expect(membership?.apartment_id).toBe(apartment.id);
    expect(membership?.role).toBe('member');

    const bad = await joinApartmentByInvite(
      outsider.client,
      outsider.userId,
      'ZZZZZZ'
    );
    expect(bad.apartment).toBeNull();

    const { data: noMember } = await outsider.client
      .from('members')
      .select('id')
      .eq('user_id', outsider.userId);
    expect(noMember || []).toHaveLength(0);
  });

  it('blocks a user from reading members/expenses of an apartment they do not belong to (RLS)', async () => {
    const [owner, stranger] = await createTestUsers([
      'rls-owner',
      'rls-stranger',
    ]);
    created.userIds.push(owner.userId, stranger.userId);

    const apartment = await createApartmentForUser(
      owner.client,
      owner.userId,
      'TEST RLS Apt'
    );
    created.apartmentIds.push(apartment.id);

    const { data: expenseId, error: createErr } = await owner.client.rpc(
      'create_expense',
      {
        p_apartment_id: apartment.id,
        p_paid_by: owner.userId,
        p_description: 'RLS secret expense',
        p_amount: 100,
        p_date: '2026-07-21',
        p_category: 'other',
        p_is_recurring: false,
        p_split_method: 'equal',
        p_shares: [{ user_id: owner.userId, amount: 100 }],
      }
    );
    expect(createErr).toBeNull();
    expect(expenseId).toBeTruthy();

    const { data: membersAsStranger, error: membersErr } =
      await stranger.client
        .from('members')
        .select('id, user_id')
        .eq('apartment_id', apartment.id);

    expect(membersErr || null).toBeNull();
    expect(membersAsStranger || []).toHaveLength(0);

    const { data: expensesAsStranger, error: expensesErr } =
      await stranger.client
        .from('expenses')
        .select('id, description')
        .eq('apartment_id', apartment.id);

    expect(expensesErr || null).toBeNull();
    expect(expensesAsStranger || []).toHaveLength(0);

    const { data: expensesAsOwner } = await owner.client
      .from('expenses')
      .select('id')
      .eq('apartment_id', apartment.id);
    expect((expensesAsOwner || []).length).toBeGreaterThan(0);
  });
});
