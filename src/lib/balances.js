/** Floating-point tolerance for money comparisons (ILS). */
export const EPS = 0.005;

/**
 * Min-cash-flow debt simplification (optional / tests).
 * Positive balance = owed to that user (creditor).
 */
export function simplifyDebts(balancesByUser) {
  const creditors = [];
  const debtors = [];

  Object.entries(balancesByUser || {}).forEach(([userId, raw]) => {
    const amount = Number(raw) || 0;
    if (amount > EPS) {
      creditors.push({ userId: String(userId), amount });
    } else if (amount < -EPS) {
      debtors.push({ userId: String(userId), amount: Math.abs(amount) });
    }
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay > EPS) {
      transfers.push({
        from: debtors[i].userId,
        to: creditors[j].userId,
        amount: pay,
      });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount <= EPS) i += 1;
    if (creditors[j].amount <= EPS) j += 1;
  }

  return transfers;
}

/**
 * Pairwise net vs each roommate from expense shares + settlements.
 * Positive = that roommate owes me; negative = I owe them.
 *
 * Settling with A only changes A's edge — B is untouched.
 *
 * Settlements only reduce open expense debt; they must not invent a reverse
 * debt after expenses were deleted (orphan settlement rows).
 */
export function computePairwiseNets(myId, members, expenses, settlements) {
  const me = String(myId);
  const memberIds = (members || []).map((m) => String(m.user_id));
  const nets = {};

  memberIds.forEach((id) => {
    if (id !== me) nets[id] = 0;
  });

  if (memberIds.length < 2) return nets;

  const expenseList = expenses || [];
  if (expenseList.length === 0) {
    // No expenses → no open roommate debt (ignore leftover settlements)
    return nets;
  }

  for (const exp of expenseList) {
    const payer = String(exp.paid_by || '');
    if (!payer) continue;

    let shares = (exp.expense_shares || exp.shares || [])
      .map((s) => ({
        userId: String(s.user_id ?? s.userId),
        amount: Number(s.amount) || 0,
      }))
      .filter((s) => s.userId && s.amount > 0);

    // Legacy expenses without stored shares: equal split among current members
    if (shares.length === 0) {
      const total = Number(exp.amount) || 0;
      if (total <= 0) continue;
      const each = total / memberIds.length;
      shares = memberIds.map((id) => ({ userId: id, amount: each }));
    }

    for (const share of shares) {
      if (share.userId === payer || share.amount <= 0) continue;
      // share.userId owes payer
      if (payer === me && nets[share.userId] !== undefined) {
        nets[share.userId] += share.amount;
      } else if (share.userId === me && nets[payer] !== undefined) {
        nets[payer] -= share.amount;
      }
    }
  }

  // Snapshot expense-only nets before settlements
  const fromExpenses = { ...nets };

  for (const row of settlements || []) {
    const from = String(row.from_user ?? row.fromUser);
    const to = String(row.to_user ?? row.toUser);
    const amount = Number(row.amount) || 0;
    if (amount <= 0) continue;

    // from paid to → reduces from's debt toward to
    if (to === me && nets[from] !== undefined) {
      nets[from] -= amount;
    } else if (from === me && nets[to] !== undefined) {
      nets[to] += amount;
    }
  }

  // Drop orphan / over-settlement artifacts:
  // - no expense debt with partner → ignore settlements for that pair
  // - settlement past zero → treat as fully settled (not reversed debt)
  Object.keys(nets).forEach((id) => {
    const before = Number(fromExpenses[id]) || 0;
    let after = Number(nets[id]) || 0;

    if (Math.abs(before) <= EPS) {
      nets[id] = 0;
      return;
    }
    if (before > 0 && after < -EPS) after = 0;
    if (before < 0 && after > EPS) after = 0;
    nets[id] = after;
  });

  return nets;
}

/**
 * Roommate cards from independent pairwise nets (no cross-partner redistribution).
 */
export function buildRoommateCardsFromPairwise(myId, members, pairwiseNets) {
  const me = String(myId);
  const others = (members || []).filter((m) => String(m.user_id) !== me);

  return others.map((m) => {
    const id = String(m.user_id);
    const net = Number(pairwiseNets?.[id] ?? 0);

    if (net > EPS) {
      return {
        id,
        name: m.name,
        amount: net,
        relation: 'owes_me',
      };
    }
    if (net < -EPS) {
      return {
        id,
        name: m.name,
        amount: Math.abs(net),
        relation: 'i_owe',
      };
    }
    return {
      id,
      name: m.name,
      amount: 0,
      relation: 'settled',
    };
  });
}

/** Sum of my pairwise nets (= overall balance vs roommates). */
export function sumPairwiseBalance(pairwiseNets) {
  return Object.values(pairwiseNets || {}).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0
  );
}

/**
 * @deprecated Prefer pairwise from shares + settlements.
 * Kept for callers that only have net balances.
 */
export function buildRoommateCardsFromBalances(myId, balancesByUser, members) {
  const me = String(myId);
  const others = (members || []).filter((m) => String(m.user_id) !== me);

  if (others.length === 0) return [];

  const map = {};
  (members || []).forEach((m) => {
    const id = String(m.user_id);
    map[id] = Number(balancesByUser?.[id] ?? balancesByUser?.[m.user_id] ?? 0);
  });
  if (map[me] === undefined) {
    map[me] = Number(balancesByUser?.[me] ?? balancesByUser?.[myId] ?? 0);
  }

  const transfers = simplifyDebts(map);
  const byPartner = {};

  transfers.forEach((t) => {
    if (t.to === me) {
      byPartner[t.from] = {
        amount: (byPartner[t.from]?.amount || 0) + t.amount,
        relation: 'owes_me',
      };
    } else if (t.from === me) {
      byPartner[t.to] = {
        amount: (byPartner[t.to]?.amount || 0) + t.amount,
        relation: 'i_owe',
      };
    }
  });

  return others.map((m) => {
    const id = String(m.user_id);
    const hit = byPartner[id];
    if (!hit || hit.amount <= EPS) {
      return {
        id,
        name: m.name,
        amount: 0,
        relation: 'settled',
      };
    }
    return {
      id,
      name: m.name,
      amount: hit.amount,
      relation: hit.relation,
    };
  });
}
