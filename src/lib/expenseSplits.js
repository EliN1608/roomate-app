/** Floating-point tolerance for money / percent comparisons. */
export const SPLIT_EPS = 0.02;

export const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'מזון' },
  { value: 'bills', label: 'חשבונות' },
  { value: 'cleaning', label: 'ניקיון' },
  { value: 'entertainment', label: 'בידור' },
  { value: 'other', label: 'אחר' },
];

export const SPLIT_METHODS = [
  { value: 'equal', label: 'שווה בשווה' },
  { value: 'percent', label: 'לפי אחוזים' },
  { value: 'fixed', label: 'סכום קבוע' },
];

/**
 * Compute each participant's share of the expense.
 * @param {{ mode: 'equal'|'percent'|'fixed', total: number, participants: Array<{id: string, percent?: string|number, fixed?: string|number}> }} args
 * @returns {{ shares: Array<{userId: string, amount: number}>, error: string|null }}
 */
export function computeShares({ mode, total, participants }) {
  const parsedTotal = Number(total);
  if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
    return { shares: [], error: 'הסכום חייב להיות מספר גדול מ-0' };
  }

  const list = (participants || []).filter(Boolean);
  if (list.length === 0) {
    return { shares: [], error: 'נא לבחור לפחות שותף אחד לחלוקה' };
  }

  if (mode === 'equal') {
    const each = parsedTotal / list.length;
    return {
      shares: list.map((p) => ({ userId: p.id, amount: each })),
      error: null,
    };
  }

  if (mode === 'percent') {
    const parsed = list.map((p) => ({
      id: p.id,
      percent: Number(p.percent),
    }));
    if (parsed.some((p) => !Number.isFinite(p.percent) || p.percent < 0)) {
      return { shares: [], error: 'נא להזין אחוז תקין לכל משתתף' };
    }
    const sumPct = parsed.reduce((s, p) => s + p.percent, 0);
    if (Math.abs(sumPct - 100) > SPLIT_EPS) {
      return {
        shares: [],
        error: `סכום האחוזים חייב להיות 100% (כרגע ${sumPct.toFixed(1)}%)`,
      };
    }
    return {
      shares: parsed.map((p) => ({
        userId: p.id,
        amount: (parsedTotal * p.percent) / 100,
      })),
      error: null,
    };
  }

  if (mode === 'fixed') {
    const parsed = list.map((p) => ({
      id: p.id,
      fixed: Number(p.fixed),
    }));
    if (parsed.some((p) => !Number.isFinite(p.fixed) || p.fixed < 0)) {
      return { shares: [], error: 'נא להזין סכום תקין לכל משתתף' };
    }
    const sumFixed = parsed.reduce((s, p) => s + p.fixed, 0);
    if (Math.abs(sumFixed - parsedTotal) > SPLIT_EPS) {
      return {
        shares: [],
        error: `סכומי החלוקה חייבים להסתכם ל־₪${parsedTotal.toFixed(2)} (כרגע ₪${sumFixed.toFixed(2)})`,
      };
    }
    return {
      shares: parsed.map((p) => ({ userId: p.id, amount: p.fixed })),
      error: null,
    };
  }

  return { shares: [], error: 'אופן חלוקה לא תקין' };
}

/** Live preview amounts (may be incomplete while typing percent/fixed). */
export function previewShares({ mode, total, participants }) {
  const parsedTotal = Number(total);
  const list = (participants || []).filter(Boolean);

  if (!Number.isFinite(parsedTotal) || parsedTotal <= 0 || list.length === 0) {
    return list.map((p) => ({ userId: p.id, amount: 0 }));
  }

  if (mode === 'equal') {
    const each = parsedTotal / list.length;
    return list.map((p) => ({ userId: p.id, amount: each }));
  }

  if (mode === 'percent') {
    return list.map((p) => {
      const pct = Number(p.percent);
      const amount =
        Number.isFinite(pct) && pct >= 0 ? (parsedTotal * pct) / 100 : 0;
      return { userId: p.id, amount };
    });
  }

  return list.map((p) => {
    const fixed = Number(p.fixed);
    return {
      userId: p.id,
      amount: Number.isFinite(fixed) && fixed >= 0 ? fixed : 0,
    };
  });
}
