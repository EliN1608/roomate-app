import React from 'react';
import Badge from '../Badge/Badge';

export default function ApartmentDetailsCard({
  apartmentData,
  membersCount,
  userRole,
  onOpenEdit,
  onCopyInviteCode,
  onRegenerateInviteCode,
}) {
  return (
    <section className="profile-card apartment-card">
      <div className="card-header-row">
        <h2 className="card-title">פרטי הדירה</h2>
        {userRole === 'admin' && (
          <button
            type="button"
            className="edit-apartment-btn"
            onClick={onOpenEdit}
          >
            עריכה
          </button>
        )}
      </div>

      <div className="info-row">
        <span className="info-label">שם הדירה</span>
        <span className="info-value">
          {apartmentData?.name || 'לא מוגדר'}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">כתובת הדירה</span>
        <span className="info-value">
          {apartmentData
            ? [
                `${apartmentData.street || ''} ${apartmentData.building_number || ''}`.trim(),
                apartmentData.apartment_number
                  ? `דירה ${apartmentData.apartment_number}`
                  : '',
                apartmentData.city || '',
              ]
                .filter(Boolean)
                .join(', ') || 'לא מוגדר'
            : 'לא מוגדר'}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">מספר שותפים</span>
        <span className="info-value">{membersCount} שותפים</span>
      </div>

      <div className="info-row no-border invite-row">
        <span className="info-label">קוד הזמנה</span>
        <div className="invite-actions">
          <Badge variant="code">
            {apartmentData?.invite_code || 'לא מוגדר'}
          </Badge>
          <button
            type="button"
            className="invite-action-btn"
            onClick={onCopyInviteCode}
          >
            העתק
          </button>
          {userRole === 'admin' && (
            <button
              type="button"
              className="invite-action-btn"
              onClick={onRegenerateInviteCode}
            >
              חדש
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
