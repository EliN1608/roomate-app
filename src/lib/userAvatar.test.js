import { describe, it, expect } from 'vitest';
import { getInitials } from '../components/UserAvatar.jsx';

describe('getInitials', () => {
  it('returns two letters from a full name', () => {
    expect(getInitials('אלי נוז')).toBe('אנ');
  });

  it('uses first two characters for a single word', () => {
    expect(getInitials('דני')).toBe('דנ');
  });

  it('returns ? for empty name', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials(null)).toBe('?');
  });

  it('uppercases latin initials', () => {
    expect(getInitials('john doe')).toBe('JD');
  });
});
