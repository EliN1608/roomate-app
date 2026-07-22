import { normalizeCategory, groupItemsByCategory } from '../../lib/shopping';

export const SELECT_FULL =
  'id, name, quantity, category, is_done, added_by, created_at, sort_order, completed_at';
export const SELECT_BASIC = 'id, name, is_done, added_by, created_at, sort_order';

export function isMissingColumnError(err, column) {
  const msg = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`;
  return new RegExp(column, 'i').test(msg);
}

export function normalizeItems(rows) {
  return (rows || []).map((row, index) => ({
    ...row,
    id: String(row.id),
    quantity: row.quantity || '',
    category: normalizeCategory(row.category),
    sort_order:
      row.sort_order == null || Number.isNaN(Number(row.sort_order))
        ? index
        : Number(row.sort_order),
  }));
}

export function arrayMove(list, from, to) {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function rebuildFullList(allItems, category, nextGroupItems, categoryOrder) {
  const groups = groupItemsByCategory(allItems, categoryOrder);
  const rebuilt = [];
  groups.forEach((g) => {
    if (g.category === category) rebuilt.push(...nextGroupItems);
    else rebuilt.push(...g.items);
  });
  return rebuilt;
}
