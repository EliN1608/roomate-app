import React from 'react';

export default function ProfileActionsCard({
  hasApartment,
  onPasswordChange,
  onLeaveApartment,
  onLogout,
}) {
  return (
    <section className="profile-card actions-card">
      <h3 className="card-section-header">פעולות</h3>
      <div className="actions-buttons-container">
        <button
          type="button"
          className="action-btn change-password-btn"
          onClick={onPasswordChange}
        >
          שינוי סיסמה
        </button>
        {hasApartment && (
          <button
            type="button"
            className="action-btn leave-apartment-btn"
            onClick={onLeaveApartment}
          >
            עזוב דירה
          </button>
        )}
        <button
          type="button"
          className="action-btn logout-btn"
          onClick={onLogout}
        >
          התנתקות
        </button>
      </div>
    </section>
  );
}
