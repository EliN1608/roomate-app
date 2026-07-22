import React from 'react';
import CategorySelect from './CategorySelect';

export default function AddItemForm({
  inputVal,
  setInputVal,
  quantityVal,
  setQuantityVal,
  categoryVal,
  setCategoryVal,
  newCategoryVal,
  setNewCategoryVal,
  apartmentCategories,
  featuresSupported,
  onSubmit,
}) {
  return (
    <form className="add-item-form" onSubmit={onSubmit}>
      <div className="add-item-bar">
        <input
          type="text"
          className="add-item-input"
          placeholder="למשל: חלב, ביצים..."
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          aria-label="שם פריט"
        />
        <button
          type="submit"
          className="add-item-btn"
          aria-label="הוסף פריט"
          title="הוסף"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      <div className="add-item-extras">
        <CategorySelect
          className="add-item-category"
          categories={apartmentCategories}
          value={categoryVal}
          onChange={(e) => setCategoryVal(e.target.value)}
          disabled={!featuresSupported}
          newValue={newCategoryVal}
          onNewValueChange={(e) => setNewCategoryVal(e.target.value)}
        />
        <input
          type="number"
          min="0"
          step="1"
          className="add-item-qty"
          placeholder="כמות"
          value={quantityVal}
          onChange={(e) => setQuantityVal(e.target.value)}
          disabled={!featuresSupported}
          aria-label="כמות"
        />
      </div>
    </form>
  );
}
