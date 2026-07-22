import React from 'react';
import { getInitials } from '../lib/textUtils';

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
