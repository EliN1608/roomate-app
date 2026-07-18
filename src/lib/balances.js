/** Floating-point tolerance for money comparisons (ILS). */
export const EPS = 0.005;

/**
 * Build roommate cards from apartment balances (source of truth).
 * Positive balance = owed to that user.
 *
 * When opposite-sign balances exist, split my total proportionally.
 * Otherwise fall back to equal split so the cards still sum to |myBalance|.
 */
export function buildRoommateCardsFromBalances(myId, balancesByUser, members) {
  const myBal = Number(balancesByUser[myId] || 0);
  const others = members.filter((m) => m.user_id !== myId);

  if (others.length === 0) return [];

  if (Math.abs(myBal) < EPS) {
    return others.map((m) => ({
      id: m.user_id,
      name: m.name,
      amount: 0,
      relation: 'settled',
    }));
  }

  if (myBal > 0) {
    const debtors = others.filter(
      (m) => Number(balancesByUser[m.user_id] || 0) < -EPS
    );
    const totalDebt = debtors.reduce(
      (sum, m) => sum + Math.abs(Number(balancesByUser[m.user_id] || 0)),
      0
    );

    // No readable/negative debtor rows → equal split of what I'm owed
    if (debtors.length === 0 || totalDebt < EPS) {
      const each = myBal / others.length;
      return others.map((m) => ({
        id: m.user_id,
        name: m.name,
        amount: each,
        relation: 'owes_me',
      }));
    }

    return others.map((m) => {
      const b = Number(balancesByUser[m.user_id] || 0);
      if (b >= -EPS) {
        return { id: m.user_id, name: m.name, amount: 0, relation: 'settled' };
      }
      return {
        id: m.user_id,
        name: m.name,
        amount: myBal * (Math.abs(b) / totalDebt),
        relation: 'owes_me',
      };
    });
  }

  // I owe overall
  const creditors = others.filter(
    (m) => Number(balancesByUser[m.user_id] || 0) > EPS
  );
  const totalCredit = creditors.reduce(
    (sum, m) => sum + Number(balancesByUser[m.user_id] || 0),
    0
  );

  if (creditors.length === 0 || totalCredit < EPS) {
    const each = Math.abs(myBal) / others.length;
    return others.map((m) => ({
      id: m.user_id,
      name: m.name,
      amount: each,
      relation: 'i_owe',
    }));
  }

  return others.map((m) => {
    const b = Number(balancesByUser[m.user_id] || 0);
    if (b <= EPS) {
      return { id: m.user_id, name: m.name, amount: 0, relation: 'settled' };
    }
    return {
      id: m.user_id,
      name: m.name,
      amount: Math.abs(myBal) * (b / totalCredit),
      relation: 'i_owe',
    };
  });
}
