import React from 'react';

export default function BulkConfirmModal({
  selectedCount,
  bulkDeleting,
  onConfirm,
  onClose,
}) {
  return (
    <div
      className="shopping-modal-overlay shopping-modal-overlay-top"
      onClick={() => !bulkDeleting && onClose()}
    >
      <div
        className="shopping-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-confirm-title"
      >
        <h2 id="bulk-confirm-title" className="shopping-modal-title">
          אישור מחיקה
        </h2>
        <p className="shopping-modal-hint">
          למחוק {selectedCount} פריטים מהרשימה? פעולה זו אינה ניתנת לביטול.
        </p>
        <div className="shopping-modal-actions">
          <button
            type="button"
            className="shopping-modal-save shopping-modal-danger"
            onClick={onConfirm}
            disabled={bulkDeleting}
          >
            {bulkDeleting ? 'מוחק...' : 'מחק'}
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
