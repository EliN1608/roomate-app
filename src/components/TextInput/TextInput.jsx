import React from 'react';

export default function TextInput({ label, ...props }) {
  return (
    <div className="text-input-wrapper">
      {label && <label>{label}</label>}
      <input type="text" className="text-input" {...props} />
    </div>
  );
}
