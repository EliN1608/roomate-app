import React from 'react';
import {
  IconChecks,
  IconTrash,
  IconCheck,
  IconSearch,
} from '../icons/TablerIcons';

export default function BulkActionsBar({
  searchQuery,
  setSearchQuery,
  todoItemsLength,
  onMarkAllBought,
  onOpenBulkDelete,
  featuresSupported,
  cleanupEnabled,
  cleanupDays,
  setCleanupDays,
  savingCleanup,
  onToggleCleanup,
  onSaveCleanupDays,
}) {
  return (
    <div className="list-management">
      <div className="list-actions-row">
        <div className="shopping-search-wrap">
          <IconSearch
            className="shopping-search-icon"
            size={18}
            stroke={1.75}
          />
          <input
            type="search"
            className="shopping-search"
            placeholder="חיפוש ברשימה..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="חיפוש"
          />
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onMarkAllBought}
          disabled={todoItemsLength === 0}
          aria-label="סמן הכל כנקנה"
          title="סמן הכל כנקנה"
        >
          <IconChecks size={18} stroke={1.75} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn danger"
          onClick={onOpenBulkDelete}
          disabled={todoItemsLength === 0}
          aria-label="הסר פריטים מהרשימה"
          title="הסר פריטים מהרשימה"
        >
          <IconTrash size={18} stroke={1.75} aria-hidden="true" />
        </button>
      </div>

      {featuresSupported && (
        <div className="cleanup-settings">
          <div className="settings-row">
            <span className="settings-row-label">מחיקה אוטומטית</span>
            <div className="settings-row-controls">
              <button
                type="button"
                className="cleanup-toggle"
                role="switch"
                aria-checked={cleanupEnabled}
                aria-label={
                  cleanupEnabled
                    ? 'מחיקה אוטומטית דולקת'
                    : 'מחיקה אוטומטית כבויה'
                }
                onClick={onToggleCleanup}
                disabled={savingCleanup}
              >
                <span className="cleanup-toggle-track">
                  <span className="cleanup-toggle-knob" />
                </span>
                <span className="cleanup-toggle-text">
                  {cleanupEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          {cleanupEnabled && (
            <div className="settings-row">
              <label className="cleanup-inline" htmlFor="cleanup-days">
                <span>מחק פריטים שנקנו לפני</span>
                <input
                  id="cleanup-days"
                  type="number"
                  min="1"
                  max="90"
                  className="cleanup-days-input"
                  value={cleanupDays}
                  onChange={(e) => setCleanupDays(e.target.value)}
                />
                <span>ימים</span>
              </label>
              <div className="settings-row-controls">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={onSaveCleanupDays}
                  disabled={savingCleanup}
                  aria-label="שמור"
                  title="שמור"
                >
                  <IconCheck size={18} stroke={1.75} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
