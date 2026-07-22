import { describe, it, expect } from 'vitest';
import {
  currentMonthKey,
  monthDateRange,
  formatMonthLabel,
  toLocalDateString,
} from './dates.js';

describe('dates helpers', () => {
  it('builds YYYY-MM-DD from a local Date', () => {
    expect(toLocalDateString(new Date(2026, 6, 21))).toBe('2026-07-21');
  });

  it('returns inclusive range for a month key', () => {
    expect(monthDateRange('2026-02')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });

  it('returns null for invalid month key', () => {
    expect(monthDateRange('bad')).toBeNull();
  });

  it('formats a Hebrew month label', () => {
    const label = formatMonthLabel('2026-07');
    expect(label).toMatch(/2026/);
    expect(label).toMatch(/יולי/);
  });

  it('currentMonthKey matches today local month', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(currentMonthKey(now)).toBe(expected);
  });
});
