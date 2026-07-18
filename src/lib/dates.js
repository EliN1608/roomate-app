/** Local calendar date as YYYY-MM-DD (avoids UTC day shift). */
export function toLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Format a YYYY-MM-DD string for display in he-IL without UTC shift. */
export function formatLocalDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString('he-IL');
}

/** First day of the current local month as YYYY-MM-DD. */
export function firstDayOfLocalMonth(date = new Date()) {
  return toLocalDateString(new Date(date.getFullYear(), date.getMonth(), 1));
}

/** Current local month key: YYYY-MM */
export function currentMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Inclusive date range for a YYYY-MM month key. */
export function monthDateRange(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return null;
  const start = `${monthKey}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${monthKey}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

/** Hebrew label e.g. "יולי 2026" */
export function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString('he-IL', {
    month: 'long',
    year: 'numeric',
  });
}
