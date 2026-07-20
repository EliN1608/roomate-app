import { describe, it, expect } from 'vitest';
import {
  computePairwiseNets,
  sumPairwiseBalance,
  buildRoommateCardsFromPairwise,
  EPS,
} from './balances.js';

const A = 'user-a';
const B = 'user-b';
const C = 'user-c';

const members2 = [
  { user_id: A, name: 'Alice' },
  { user_id: B, name: 'Bob' },
];

const members3 = [
  { user_id: A, name: 'Alice' },
  { user_id: B, name: 'Bob' },
  { user_id: C, name: 'Carol' },
];

describe('computePairwiseNets', () => {
  it('equal split: payer owed by other member', () => {
    const expenses = [
      {
        paid_by: A,
        amount: 100,
        expense_shares: [
          { user_id: A, amount: 50 },
          { user_id: B, amount: 50 },
        ],
      },
    ];
    const nets = computePairwiseNets(B, members2, expenses, []);
    expect(nets[A]).toBeCloseTo(-50, 2);
    expect(sumPairwiseBalance(nets)).toBeCloseTo(-50, 2);
  });

  it('equal split: payer sees credit from other', () => {
    const expenses = [
      {
        paid_by: A,
        amount: 100,
        expense_shares: [
          { user_id: A, amount: 50 },
          { user_id: B, amount: 50 },
        ],
      },
    ];
    const nets = computePairwiseNets(A, members2, expenses, []);
    expect(nets[B]).toBeCloseTo(50, 2);
    expect(sumPairwiseBalance(nets)).toBeCloseTo(50, 2);
  });

  it('subset split: only participant owes (not all members)', () => {
    const expenses = [
      {
        paid_by: A,
        amount: 200,
        expense_shares: [{ user_id: B, amount: 200 }],
      },
    ];
    const nets = computePairwiseNets(B, members3, expenses, []);
    expect(nets[A]).toBeCloseTo(-200, 2);
    expect(nets[C]).toBeCloseTo(0, 2);
  });

  it('legacy expense without shares: equal among all current members', () => {
    const expenses = [{ paid_by: A, amount: 100, expense_shares: [] }];
    const nets = computePairwiseNets(B, members2, expenses, []);
    expect(nets[A]).toBeCloseTo(-50, 2);
  });

  it('settlement reduces debt (partner pays me)', () => {
    const expenses = [
      {
        paid_by: A,
        amount: 100,
        expense_shares: [
          { user_id: A, amount: 50 },
          { user_id: B, amount: 50 },
        ],
      },
    ];
    const settlements = [{ from_user: B, to_user: A, amount: 30 }];
    const nets = computePairwiseNets(A, members2, expenses, settlements);
    expect(nets[B]).toBeCloseTo(20, 2);
  });

  it('settlement reduces my debt (I pay partner)', () => {
    const expenses = [
      {
        paid_by: A,
        amount: 100,
        expense_shares: [
          { user_id: A, amount: 50 },
          { user_id: B, amount: 50 },
        ],
      },
    ];
    const settlements = [{ from_user: B, to_user: A, amount: 40 }];
    const nets = computePairwiseNets(B, members2, expenses, settlements);
    expect(nets[A]).toBeCloseTo(-10, 2);
  });

  it('no expenses → zero debt (ignores orphan settlements)', () => {
    const settlements = [{ from_user: B, to_user: A, amount: 50 }];
    const nets = computePairwiseNets(A, members2, [], settlements);
    expect(nets[B]).toBeCloseTo(0, 2);
  });

  it('settlements from a prior era do not cancel new expense debt', () => {
    const expenses = [
      {
        paid_by: A,
        amount: 150,
        created_at: '2026-07-20T12:00:00Z',
        expense_shares: [
          { user_id: A, amount: 50 },
          { user_id: B, amount: 50 },
          { user_id: C, amount: 50 },
        ],
      },
    ];
    const settlements = [
      {
        from_user: B,
        to_user: A,
        amount: 100,
        created_at: '2026-07-01T10:00:00Z',
      },
    ];
    const nets = computePairwiseNets(A, members3, expenses, settlements);
    expect(nets[B]).toBeCloseTo(50, 2);
    expect(nets[C]).toBeCloseTo(50, 2);
  });

  it('partial settlement within same era leaves remaining debt', () => {
    const expenses = [
      {
        paid_by: A,
        amount: 150,
        created_at: '2026-07-20T12:00:00Z',
        expense_shares: [
          { user_id: A, amount: 50 },
          { user_id: B, amount: 50 },
          { user_id: C, amount: 50 },
        ],
      },
    ];
    const settlements = [
      {
        from_user: B,
        to_user: A,
        amount: 20,
        created_at: '2026-07-21T10:00:00Z',
      },
    ];
    const nets = computePairwiseNets(A, members3, expenses, settlements);
    expect(nets[B]).toBeCloseTo(30, 2);
  });

  it('single member apartment → empty nets', () => {
    const nets = computePairwiseNets(A, [{ user_id: A, name: 'Alone' }], [
      { paid_by: A, amount: 50, expense_shares: [{ user_id: A, amount: 50 }] },
    ], []);
    expect(Object.keys(nets)).toHaveLength(0);
  });
});

describe('buildRoommateCardsFromPairwise', () => {
  it('maps relations correctly', () => {
    const expenses = [
      {
        paid_by: A,
        amount: 80,
        expense_shares: [
          { user_id: A, amount: 40 },
          { user_id: B, amount: 40 },
        ],
      },
    ];
    const nets = computePairwiseNets(A, members2, expenses, []);
    const cards = buildRoommateCardsFromPairwise(A, members2, nets);
    expect(cards).toHaveLength(1);
    expect(cards[0].relation).toBe('owes_me');
    expect(cards[0].amount).toBeCloseTo(40, 2);
  });

  it('treats tiny balances as settled', () => {
    const nets = { [B]: EPS / 2 };
    const cards = buildRoommateCardsFromPairwise(A, members2, nets);
    expect(cards[0].relation).toBe('settled');
  });
});
