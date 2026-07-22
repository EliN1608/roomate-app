import React from 'react';

export default function ApartmentDetailsForm({
  editName,
  editCity,
  editStreet,
  editBuilding,
  editApartmentNum,
  onEditNameChange,
  onEditCityChange,
  onEditStreetChange,
  onEditBuildingChange,
  onEditApartmentNumChange,
  onSave,
  onCancel,
}) {
  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-apt-title"
      >
        <h2 id="edit-apt-title" className="modal-title">
          עריכת פרטי דירה
        </h2>

        <div className="modal-field">
          <label htmlFor="edit-apt-name">שם הדירה</label>
          <input
            id="edit-apt-name"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
          />
        </div>
        <div className="modal-field">
          <label htmlFor="edit-apt-city">עיר</label>
          <input
            id="edit-apt-city"
            value={editCity}
            onChange={(e) => onEditCityChange(e.target.value)}
          />
        </div>
        <div className="modal-field">
          <label htmlFor="edit-apt-street">רחוב</label>
          <input
            id="edit-apt-street"
            value={editStreet}
            onChange={(e) => onEditStreetChange(e.target.value)}
          />
        </div>
        <div className="modal-field">
          <label htmlFor="edit-apt-building">מספר בניין</label>
          <input
            id="edit-apt-building"
            value={editBuilding}
            onChange={(e) => onEditBuildingChange(e.target.value)}
          />
        </div>
        <div className="modal-field">
          <label htmlFor="edit-apt-num">מספר דירה</label>
          <input
            id="edit-apt-num"
            value={editApartmentNum}
            onChange={(e) => onEditApartmentNumChange(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="modal-save-btn"
            onClick={onSave}
          >
            שמור שינויים
          </button>
          <button
            type="button"
            className="modal-cancel-btn"
            onClick={onCancel}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
