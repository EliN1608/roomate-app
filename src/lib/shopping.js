/** Default starter categories for a new apartment (Hebrew labels = values). */
export const DEFAULT_SHOPPING_CATEGORIES = [
  'מזון',
  'ניקיון',
  'טיפוח',
  'לבית',
  'אחר',
];

const LEGACY_CATEGORY_MAP = {
  food: 'מזון',
  cleaning: 'ניקיון',
  personal: 'טיפוח',
  household: 'לבית',
  other: 'אחר',
};

export const NEW_CATEGORY_OPTION = '__new__';

/** Normalize a category string; maps legacy English keys. */
export function normalizeCategory(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'אחר';
  if (LEGACY_CATEGORY_MAP[raw]) return LEGACY_CATEGORY_MAP[raw];
  return raw;
}

export function categoryLabel(value) {
  return normalizeCategory(value);
}

/** Deduplicate and normalize an apartment category list. */
export function normalizeCategoryList(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list || []) {
    const c = normalizeCategory(raw);
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out.length > 0 ? out : [...DEFAULT_SHOPPING_CATEGORIES];
}

/** Filter by name / quantity / category (case-insensitive). */
export function filterShoppingItems(items, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return items || [];
  return (items || []).filter((item) => {
    const name = String(item.name || '').toLowerCase();
    const quantity = String(item.quantity || '').toLowerCase();
    const cat = categoryLabel(item.category).toLowerCase();
    return name.includes(q) || quantity.includes(q) || cat.includes(q);
  });
}

/**
 * Group items by category.
 * Prefers apartment category order; unknown categories follow (Hebrew locale).
 * @returns {Array<{ category: string, label: string, items: Array }>}
 */
export function groupItemsByCategory(items, categoryOrder) {
  const order = normalizeCategoryList(categoryOrder);
  const map = {};

  (items || []).forEach((item) => {
    const key = normalizeCategory(item.category);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  });

  const ordered = order.filter((c) => map[c]?.length > 0);
  const extras = Object.keys(map)
    .filter((k) => !order.includes(k) && map[k].length > 0)
    .sort((a, b) => a.localeCompare(b, 'he'));

  return [...ordered, ...extras].map((c) => ({
    category: c,
    label: c,
    items: map[c],
  }));
}

/** ISO timestamp cutoff for cleanup: now minus N days. */
export function cleanupCutoffIso(days) {
  const n = Math.min(90, Math.max(1, Number(days) || 7));
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
