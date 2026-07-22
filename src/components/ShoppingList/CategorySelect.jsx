import React from 'react';
import { NEW_CATEGORY_OPTION } from '../../lib/shopping';

export default function CategorySelect({
  id,
  className,
  categories,
  value,
  onChange,
  disabled,
  newValue,
  onNewValueChange,
}) {
  const showNew = value === NEW_CATEGORY_OPTION;
  const options =
    !showNew && value && !categories.includes(value)
      ? [...categories, value]
      : categories;

  return (
    <div className="category-select-wrap">
      <select
        id={id}
        className={className}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label="קטגוריה"
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={NEW_CATEGORY_OPTION}>＋ קטגוריה חדשה</option>
      </select>
      {showNew && (
        <input
          type="text"
          className={className}
          placeholder="שם קטגוריה חדשה"
          value={newValue}
          onChange={onNewValueChange}
          disabled={disabled}
          aria-label="שם קטגוריה חדשה"
        />
      )}
    </div>
  );
}
