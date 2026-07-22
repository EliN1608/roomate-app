import { describe, it, expect } from 'vitest';
import { normalizeInviteCode } from './apartmentApi.js';

describe('normalizeInviteCode', () => {
  it('uppercases and trims the invite code', () => {
    expect(normalizeInviteCode('  abcd  ')).toBe('ABCD');
  });

  it('replaces 0 with O and 1 with I', () => {
    expect(normalizeInviteCode('room01')).toBe('ROOMOI');
    expect(normalizeInviteCode('ab12')).toBe('ABI2');
  });

  it('handles empty input', () => {
    expect(normalizeInviteCode('')).toBe('');
    expect(normalizeInviteCode(null)).toBe('');
  });
});
