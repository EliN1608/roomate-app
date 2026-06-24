import React from 'react';

export default function PrimaryButton({ children, ...props }) {
  return (
    <button className="primary-button" {...props}>
      {children || 'Primary Button'}
    </button>
  );
}
