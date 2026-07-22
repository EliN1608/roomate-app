import React from 'react';

export default function ConfirmModal({
  confirmModal,
  actionBusy,
  onConfirm,
  onCancel,
}) {
  if (!confirmModal) return null;

  return (
    <div
      className="modal-overlay"
      onClick={() => !actionBusy && onCancel()}
      role="presentation"
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <h2 id="confirm-modal-title" className="modal-title">
          {confirmModal.title}
        </h2>
        <p className="modal-body-text">{confirmModal.body}</p>
        <div className="modal-actions">
          <button
            type="button"
            className={
              confirmModal.danger ? 'modal-danger-btn' : 'modal-save-btn'
            }
            onClick={onConfirm}
            disabled={actionBusy}
          >
            {actionBusy ? 'מבצע…' : confirmModal.confirmLabel}
          </button>
          <button
            type="button"
            className="modal-cancel-btn"
            onClick={onCancel}
            disabled={actionBusy}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
