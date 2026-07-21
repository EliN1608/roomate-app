import React from 'react';

/** Initials from a display name (up to 2 letters). */
export function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

/**
 * Circular user avatar — photo when available, otherwise initials.
 */
export default function UserAvatar({
  src,
  name,
  className = '',
  size = 36,
  alt = '',
}) {
  const initials = getInitials(name);

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || ''}
        className={`user-avatar-photo ${className}`.trim()}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`user-avatar-fallback ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden={alt ? undefined : true}
    >
      {initials}
    </span>
  );
}
