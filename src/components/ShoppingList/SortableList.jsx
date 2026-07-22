import React, { useState, useRef } from 'react';
import { IconEdit } from '../icons/TablerIcons';
import { categoryLabel } from '../../lib/shopping';
import { arrayMove } from './shoppingListHelpers';

export default function SortableList({
  items,
  isDone,
  userId,
  onToggle,
  onEdit,
  onLiveReorder,
  onPersist,
  disableDrag = false,
}) {
  const [draggingId, setDraggingId] = useState(null);
  const dragIdRef = useRef(null);
  const listRef = useRef(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const endDrag = () => {
    const id = dragIdRef.current;
    dragIdRef.current = null;
    setDraggingId(null);
    if (id) onPersist(itemsRef.current);
  };

  const onHandlePointerDown = (e, itemId) => {
    if (disableDrag) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragIdRef.current = itemId;
    setDraggingId(itemId);
  };

  const onHandlePointerMove = (e) => {
    const dragging = dragIdRef.current;
    if (!dragging || !listRef.current) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest?.('[data-shopping-id]');
    if (!row) return;
    const overId = row.getAttribute('data-shopping-id');
    if (!overId || overId === dragging) return;

    const current = itemsRef.current;
    const from = current.findIndex((i) => i.id === dragging);
    const to = current.findIndex((i) => i.id === overId);
    if (from < 0 || to < 0 || from === to) return;

    onLiveReorder(arrayMove(current, from, to));
  };

  const onHandlePointerUp = (e) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    endDrag();
  };

  if (items.length === 0) return null;

  return (
    <div className="items-list" ref={listRef}>
      {items.map((item) => {
        const isDragging = draggingId === item.id;
        return (
          <div
            key={item.id}
            data-shopping-id={item.id}
            className={`${isDone ? 'done-item-card' : 'todo-item-card'}${
              isDragging ? ' is-dragging' : ''
            }`}
          >
            <button
              type="button"
              className={
                isDone ? 'checkbox-btn-checked' : 'checkbox-btn-unchecked'
              }
              onClick={() => onToggle(item.id)}
              aria-label={isDone ? 'בטל סימון כנקנה' : 'סמן כנקנה'}
            >
              {isDone ? '✓' : null}
            </button>

            <div className="item-details">
              <div className={isDone ? 'item-name-done' : 'item-name-todo'}>
                {item.name}
                {item.quantity ? (
                  <span className="item-quantity"> · {item.quantity}</span>
                ) : null}
              </div>
              {!isDone && (
                <div className="item-added-by">
                  {categoryLabel(item.category)}
                  {' · '}
                  נוסף על ידי {item.added_by === userId ? 'אני' : 'שותף'}
                </div>
              )}
              {isDone && item.quantity ? (
                <div className="item-meta-done">{item.quantity}</div>
              ) : null}
            </div>

            <div className="item-actions">
              <button
                type="button"
                className="item-action-btn"
                onClick={() => onEdit(item)}
                aria-label="ערוך"
                title="ערוך"
              >
                <IconEdit size={16} stroke={1.75} aria-hidden="true" />
              </button>
            </div>

            {!disableDrag && (
              <button
                type="button"
                className={`drag-handle${isDone ? ' done-drag' : ''}`}
                aria-label="גרור לסידור מחדש"
                onPointerDown={(e) => onHandlePointerDown(e, item.id)}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
                onPointerCancel={onHandlePointerUp}
              >
                ⠿
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
