import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  hasSupabaseEnv,
  createTestUsers,
  createApartmentForUser,
  joinApartmentByInvite,
  cleanupApartment,
  clearApartmentExpenses,
} from './helpers.js';
import {
  computePairwiseNets,
  sumPairwiseBalance,
} from '../src/lib/balances.js';
import { rpcCreateExpense, rpcDeleteExpense } from '../src/lib/expensesApi.js';

const describeBackend = hasSupabaseEnv() ? describe : describe.skip;

describeBackend('expenses + balances backend', () => {
  const created = { apartmentIds: [], userIds: [] };

  afterAll(async () => {
    for (const aptId of created.apartmentIds) {
      await cleanupApartment(aptId, created.userIds);
    }
  });

  describe('pair apartment (2 members)', () => {
    let a;
    let b;
    let apartment;
    let members;

    beforeAll(async () => {
      [a, b] = await createTestUsers(['exp-a', 'exp-b']);
      created.userIds.push(a.userId, b.userId);

      apartment = await createApartmentForUser(
        a.client,
        a.userId,
        'TEST Expenses Pair Apt'
      );
      created.apartmentIds.push(apartment.id);

      const joined = await joinApartmentByInvite(
        b.client,
        b.userId,
        apartment.invite_code
      );
      if (joined.memberError) throw joined.memberError;

      members = [
        { user_id: a.userId, name: 'A' },
        { user_id: b.userId, name: 'B' },
      ];
    }, 90_000);

    beforeEach(async () => {
      await clearApartmentExpenses(a.client, apartment.id);
    });

    it('creates an expense with the correct amount, payer, and date', async () => {
      const expenseId = await rpcCreateExpense(a.client, {
        apartmentId: apartment.id,
        paidBy: a.userId,
        description: 'סופר',
        amount: 90,
        date: '2026-07-15',
        category: 'food',
        isRecurring: false,
        splitMethod: 'equal',
        shares: [
          { userId: a.userId, amount: 45 },
          { userId: b.userId, amount: 45 },
        ],
      });

      expect(expenseId).toBeTruthy();

      const { data: row, error } = await a.client
        .from('expenses')
        .select('id, amount, paid_by, date, description')
        .eq('id', expenseId)
        .maybeSingle();

      expect(error).toBeNull();
      expect(Number(row.amount)).toBeCloseTo(90, 2);
      expect(row.paid_by).toBe(a.userId);
      expect(row.date).toBe('2026-07-15');
      expect(row.description).toBe('סופר');
    });

    it('deleting an expense removes it and clears settlements when none remain', async () => {
      const expenseId = await rpcCreateExpense(a.client, {
        apartmentId: apartment.id,
        paidBy: a.userId,
        description: 'חשמל',
        amount: 100,
        date: '2026-07-10',
        category: 'other',
        isRecurring: false,
        splitMethod: 'equal',
        shares: [
          { userId: a.userId, amount: 50 },
          { userId: b.userId, amount: 50 },
        ],
      });

      const { error: settleErr } = await a.client.rpc('settle_with_member', {
        apt_id: apartment.id,
        partner_id: b.userId,
        settle_amount: 20,
        i_am_owed: true,
      });
      expect(settleErr).toBeNull();

      const { data: beforeSettlements } = await a.client
        .from('settlements')
        .select('id')
        .eq('apartment_id', apartment.id);
      expect((beforeSettlements || []).length).toBeGreaterThan(0);

      await rpcDeleteExpense(a.client, expenseId);

      const { data: gone } = await a.client
        .from('expenses')
        .select('id')
        .eq('id', expenseId)
        .maybeSingle();
      expect(gone).toBeNull();

      const { data: afterSettlements } = await a.client
        .from('settlements')
        .select('id')
        .eq('apartment_id', apartment.id);
      expect(afterSettlements || []).toHaveLength(0);

      const nets = computePairwiseNets(
        a.userId,
        members,
        [],
        afterSettlements || []
      );
      expect(sumPairwiseBalance(nets)).toBeCloseTo(0, 2);
    });
  });

  describe('triple apartment (3 members)', () => {
    let a;
    let b;
    let c;
    let apartment;
    let members;

    beforeAll(async () => {
      [a, b, c] = await createTestUsers(['split-a', 'split-b', 'split-c']);
      created.userIds.push(a.userId, b.userId, c.userId);

      apartment = await createApartmentForUser(
        a.client,
        a.userId,
        'TEST Expenses Triple Apt'
      );
      created.apartmentIds.push(apartment.id);

      const joinB = await joinApartmentByInvite(
        b.client,
        b.userId,
        apartment.invite_code
      );
      if (joinB.memberError) throw joinB.memberError;
      const joinC = await joinApartmentByInvite(
        c.client,
        c.userId,
        apartment.invite_code
      );
      if (joinC.memberError) throw joinC.memberError;

      members = [
        { user_id: a.userId, name: 'A' },
        { user_id: b.userId, name: 'B' },
        { user_id: c.userId, name: 'C' },
      ];
    }, 90_000);

    beforeEach(async () => {
      await clearApartmentExpenses(a.client, apartment.id);
    });

    it('balances calculate the correct per-member amount for equal and custom splits', async () => {
      const equalId = await rpcCreateExpense(a.client, {
        apartmentId: apartment.id,
        paidBy: a.userId,
        description: 'equal',
        amount: 90,
        date: '2026-07-01',
        category: 'other',
        isRecurring: false,
        splitMethod: 'equal',
        shares: [
          { userId: a.userId, amount: 30 },
          { userId: b.userId, amount: 30 },
          { userId: c.userId, amount: 30 },
        ],
      });

      const { data: equalExp } = await a.client
        .from('expenses')
        .select(
          'id, paid_by, amount, created_at, expense_shares(user_id, amount)'
        )
        .eq('id', equalId)
        .maybeSingle();

      const equalNets = computePairwiseNets(a.userId, members, [equalExp], []);
      expect(equalNets[b.userId]).toBeCloseTo(30, 2);
      expect(equalNets[c.userId]).toBeCloseTo(30, 2);
      expect(sumPairwiseBalance(equalNets)).toBeCloseTo(60, 2);

      const customId = await rpcCreateExpense(a.client, {
        apartmentId: apartment.id,
        paidBy: a.userId,
        description: 'custom',
        amount: 70,
        date: '2026-07-02',
        category: 'other',
        isRecurring: false,
        splitMethod: 'fixed',
        shares: [{ userId: b.userId, amount: 70 }],
      });

      const { data: customOnly } = await a.client
        .from('expenses')
        .select(
          'id, paid_by, amount, created_at, expense_shares(user_id, amount)'
        )
        .eq('id', customId)
        .maybeSingle();

      expect(customOnly).toBeTruthy();

      const customNets = computePairwiseNets(
        a.userId,
        members,
        [customOnly],
        []
      );
      expect(customNets[b.userId]).toBeCloseTo(70, 2);
      expect(customNets[c.userId]).toBeCloseTo(0, 2);
    });

    it('settling a payment updates the balance only between the two relevant members', async () => {
      await rpcCreateExpense(a.client, {
        apartmentId: apartment.id,
        paidBy: a.userId,
        description: 'triple',
        amount: 90,
        date: '2026-07-05',
        category: 'other',
        isRecurring: false,
        splitMethod: 'equal',
        shares: [
          { userId: a.userId, amount: 30 },
          { userId: b.userId, amount: 30 },
          { userId: c.userId, amount: 30 },
        ],
      });

      const { data: expensesBefore } = await a.client
        .from('expenses')
        .select(
          'id, paid_by, amount, created_at, expense_shares(user_id, amount)'
        )
        .eq('apartment_id', apartment.id);

      const netsBefore = computePairwiseNets(
        a.userId,
        members,
        expensesBefore,
        []
      );
      expect(netsBefore[b.userId]).toBeCloseTo(30, 2);
      expect(netsBefore[c.userId]).toBeCloseTo(30, 2);

      const { error: settleErr } = await a.client.rpc('settle_with_member', {
        apt_id: apartment.id,
        partner_id: b.userId,
        settle_amount: 10,
        i_am_owed: true,
      });
      expect(settleErr).toBeNull();

      const { data: settlements } = await a.client
        .from('settlements')
        .select('from_user, to_user, amount, created_at')
        .eq('apartment_id', apartment.id);

      const netsAfter = computePairwiseNets(
        a.userId,
        members,
        expensesBefore,
        settlements
      );

      expect(netsAfter[b.userId]).toBeCloseTo(20, 2);
      expect(netsAfter[c.userId]).toBeCloseTo(30, 2);
    });
  });
});
