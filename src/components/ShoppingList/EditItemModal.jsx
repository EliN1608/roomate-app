import React from 'react';
import CategorySelect from './CategorySelect';

export default function EditItemModal({
  editName,
  setEditName,
  editQuantity,
  setEditQuantity,
  editCategory,
  setEditCategory,
  editNewCategory,
  setEditNewCategory,
  apartmentCategories,
  featuresSupported,
  editError,
  editSaving,
  onSubmit,
  onClose,
}) {
  return (
    <div
      className="shopping-modal-overlay"
      onClick={() => !editSaving && onClose()}
    >
      <div
        className="shopping-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-shopping-title"
      >
        <h2 id="edit-shopping-title" className="shopping-modal-title">
          עריכת פריט
        </h2>
        <form onSubmit={onSubmit} className="shopping-modal-form">
          <label className="shopping-field-label" htmlFor="edit-shop-name">
            שם
          </label>
          <input
            id="edit-shop-name"
            className="shopping-field-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />

          <label className="shopping-field-label" htmlFor="edit-shop-qty">
            כמות
          </label>
          <input
            id="edit-shop-qty"
            type="number"
            min="0"
            step="1"
            className="shopping-field-input"
            value={editQuantity}
            onChange={(e) => setEditQuantity(e.target.value)}
            disabled={!featuresSupported}
            placeholder="כמות"
          />

          <label className="shopping-field-label" htmlFor="edit-shop-category">
            קטגוריה
          </label>
          <CategorySelect
            id="edit-shop-category"
            className="shopping-field-input"
            categories={apartmentCategories}
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            disabled={!featuresSupported}
            newValue={editNewCategory}
            onNewValueChange={(e) => setEditNewCategory(e.target.value)}
          />

          {editError && (
            <div className="shopping-modal-error">{editError}</div>
          )}

          <div className="shopping-modal-actions">
            <button
              type="submit"
              className="shopping-modal-save"
              disabled={editSaving}
            >
              {editSaving ? 'שומר...' : 'שמור'}
            </button>
            <button
              type="button"
              className="shopping-modal-cancel"
              onClick={onClose}
              disabled={editSaving}
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
