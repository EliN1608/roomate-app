import { describe, it, expect, vi } from 'vitest';
import {
  scaleSharesForAmount,
  rpcCreateExpense,
  rpcUpdateExpense,
  rpcDeleteExpense,
} from './expensesApi.js';

describe('scaleSharesForAmount', () => {
  it('scales shares proportionally when amount increases', () => {
    const shares = [
      { userId: 'a', amount: 50 },
      { userId: 'b', amount: 50 },
    ];
    const scaled = scaleSharesForAmount(shares, 100, 200);
    expect(scaled[0].amount).toBeCloseTo(100, 2);
    expect(scaled[1].amount).toBeCloseTo(100, 2);
  });

  it('preserves ratios when amount decreases', () => {
    const shares = [
      { userId: 'a', amount: 60 },
      { userId: 'b', amount: 40 },
    ];
    const scaled = scaleSharesForAmount(shares, 100, 50);
    expect(scaled[0].amount).toBeCloseTo(30, 2);
    expect(scaled[1].amount).toBeCloseTo(20, 2);
  });

  it('returns original shares when amount is unchanged', () => {
    const shares = [{ userId: 'a', amount: 75 }];
    const scaled = scaleSharesForAmount(shares, 75, 75);
    expect(scaled[0].amount).toBeCloseTo(75, 2);
  });

  it('returns empty array for empty shares', () => {
    expect(scaleSharesForAmount([], 100, 50)).toEqual([]);
  });
});

describe('expense RPC wrappers', () => {
  it('create_expense sends shares mapped to user_id/amount', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'exp-1', error: null });
    const supabase = { rpc };

    await rpcCreateExpense(supabase, {
      apartmentId: 'apt-1',
      paidBy: 'user-a',
      description: 'סופר',
      amount: 90,
      date: '2026-07-21',
      category: 'food',
      isRecurring: false,
      splitMethod: 'equal',
      shares: [
        { userId: 'user-a', amount: 30 },
        { userId: 'user-b', amount: 30 },
        { userId: 'user-c', amount: 30 },
      ],
    });

    expect(rpc).toHaveBeenCalledWith(
      'create_expense',
      expect.objectContaining({
        p_apartment_id: 'apt-1',
        p_paid_by: 'user-a',
        p_amount: 90,
        p_shares: [
          { user_id: 'user-a', amount: 30 },
          { user_id: 'user-b', amount: 30 },
          { user_id: 'user-c', amount: 30 },
        ],
      })
    );
  });

  it('update_expense calls RPC with expense id and new payer', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = { rpc };

    await rpcUpdateExpense(supabase, {
      expenseId: 'exp-9',
      description: 'חשמל',
      amount: 120,
      paidBy: 'user-b',
      date: '2026-07-01',
      splitMethod: 'equal',
      shares: [{ userId: 'user-b', amount: 120 }],
    });

    expect(rpc).toHaveBeenCalledWith(
      'update_expense',
      expect.objectContaining({
        p_expense_id: 'exp-9',
        p_paid_by: 'user-b',
        p_amount: 120,
      })
    );
  });

  it('delete_expense calls RPC with expense id', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = { rpc };

    await rpcDeleteExpense(supabase, 'exp-3');

    expect(rpc).toHaveBeenCalledWith('delete_expense', {
      p_expense_id: 'exp-3',
    });
  });

  it('throws when create_expense returns an error', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'אין הרשאה' } });
    const supabase = { rpc };

    await expect(
      rpcCreateExpense(supabase, {
        apartmentId: 'apt-1',
        paidBy: 'user-a',
        description: 'x',
        amount: 10,
        date: '2026-07-21',
        category: 'other',
        isRecurring: false,
        splitMethod: 'equal',
        shares: [{ userId: 'user-a', amount: 10 }],
      })
    ).rejects.toEqual({ message: 'אין הרשאה' });
  });
});
