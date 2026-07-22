import React from 'react';
import { categoryLabel } from '../../lib/shopping';

export default function BulkDeleteModal({
  todoItems,
  bulkSelectedIds,
  bulkDeleting,
  bulkConfirmOpen,
  bulkDeleteError,
  onSelectAll,
  onClearSelection,
  onToggleId,
  onRequestConfirm,
  onClose,
}) {
  return (
    <div
      className="shopping-modal-overlay"
      onClick={() =>
        !bulkDeleting && !bulkConfirmOpen && onClose()
      }
    >
      <div
        className="shopping-modal-card shopping-modal-card-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-title"
      >
        <h2 id="bulk-delete-title" className="shopping-modal-title">
          הסרת פריטים מהרשימה
        </h2>
        <p className="shopping-modal-hint">
          בחרו פריטים שטרם נקנו להסרה מהרשימה
        </p>

        <div className="bulk-select-actions">
          <button
            type="button"
            className="shopping-modal-cancel"
            onClick={onSelectAll}
            disabled={bulkDeleting}
          >
            בחר הכל
          </button>
          <button
            type="button"
            className="shopping-modal-cancel"
            onClick={onClearSelection}
            disabled={bulkDeleting}
          >
            נקה בחירה
          </button>
        </div>

        <ul className="bulk-delete-list">
          {todoItems.map((item) => {
            const checked = bulkSelectedIds.has(item.id);
            return (
              <li key={item.id}>
                <label className="bulk-delete-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleId(item.id)}
                    disabled={bulkDeleting}
                  />
                  <span className="bulk-delete-name">
                    {item.name}
                    {item.quantity ? ` · ${item.quantity}` : ''}
                  </span>
                  <span className="bulk-delete-cat">
                    {categoryLabel(item.category)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {bulkDeleteError && (
          <div className="shopping-modal-error">{bulkDeleteError}</div>
        )}

        <div className="shopping-modal-actions">
          <button
            type="button"
            className="shopping-modal-save shopping-modal-danger"
            onClick={onRequestConfirm}
            disabled={bulkDeleting || bulkSelectedIds.size === 0}
          >
            מחק נבחרים ({bulkSelectedIds.size})
          </button>
          <button
            type="button"
            className="shopping-modal-cancel"
            onClick={onClose}
            disabled={bulkDeleting}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
