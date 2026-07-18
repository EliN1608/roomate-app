import React from 'react';
import './Badge.css';

/**
 * Shared pill badge (invite code, role, etc.).
 * @param {'default' | 'code' | 'muted'} [variant]
 */
export default function Badge({
  children,
  variant = 'default',
  className = '',
  ...rest
}) {
  const classes = ['badge', `badge-${variant}`];
  if (className) classes.push(className);

  return (
    <span className={classes.join(' ')} {...rest}>
      {children}
    </span>
  );
}
