import React from 'react';
import Badge from '../Badge/Badge';
import { IconEdit } from '../icons/TablerIcons';

export default function AvatarUpload({
  avatarInputRef,
  avatarUrl,
  initials,
  fullName,
  uploadingAvatar,
  isEditingName,
  nameDraft,
  savingName,
  userEmail,
  userRole,
  onAvatarClick,
  onAvatarChange,
  onNameDraftChange,
  onSaveName,
  onCancelEditName,
  onStartEditName,
}) {
  return (
    <section className="profile-card user-card">
      <div className="user-card-content">
        <button
          type="button"
          className="user-avatar-btn"
          onClick={onAvatarClick}
          disabled={uploadingAvatar}
          aria-label="העלאת תמונת פרופיל"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="user-avatar-img" />
          ) : (
            <span className="user-avatar">{initials}</span>
          )}
          <span className="user-avatar-hint">
            {uploadingAvatar ? 'מעלה…' : 'שנה'}
          </span>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="visually-hidden"
          onChange={onAvatarChange}
        />

        <div className="user-info">
          {isEditingName ? (
            <div className="name-edit-row">
              <input
                className="name-edit-input"
                value={nameDraft}
                onChange={(e) => onNameDraftChange(e.target.value)}
                maxLength={80}
                autoFocus
                aria-label="שם תצוגה"
              />
              <button
                type="button"
                className="name-edit-save"
                onClick={onSaveName}
                disabled={savingName}
              >
                {savingName ? '…' : 'שמור'}
              </button>
              <button
                type="button"
                className="name-edit-cancel"
                onClick={onCancelEditName}
                disabled={savingName}
              >
                ביטול
              </button>
            </div>
          ) : (
            <div className="name-display-row">
              <h2 className="user-name">{fullName}</h2>
              <button
                type="button"
                className="name-edit-trigger"
                onClick={onStartEditName}
                aria-label="עריכת שם תצוגה"
              >
                <IconEdit size={16} />
              </button>
            </div>
          )}
          <p className="user-email">{userEmail || ''}</p>
          <Badge className="user-role-badge-slot">
            {userRole === 'admin' ? 'מנהל דירה' : 'שותף/ה'}
          </Badge>
        </div>
      </div>
    </section>
  );
}
