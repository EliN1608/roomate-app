import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './ShoppingListPage.css';

function isMissingSortOrderError(err) {
  const msg = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`;
  return /sort_order/i.test(msg);
}

function normalizeItems(rows) {
  return (rows || []).map((row, index) => ({
    ...row,
    id: String(row.id),
    sort_order:
      row.sort_order == null || Number.isNaN(Number(row.sort_order))
        ? index
        : Number(row.sort_order),
  }));
}

function arrayMove(list, from, to) {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Pointer-based reorder (mouse + touch). No dnd-kit — avoids React 19 white-screen crashes.
 * Reorders live while dragging; persists on pointer-up.
 */
function SortableList({ items, isDone, userId, onToggle, onLiveReorder, onPersist }) {
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
            <div className="item-details">
              <div className={isDone ? 'item-name-done' : 'item-name-todo'}>
                {item.name}
              </div>
              {!isDone && (
                <div className="item-added-by">
                  נוסף על ידי {item.added_by === userId ? 'אני' : 'שותף'}
                </div>
              )}
            </div>

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
          </div>
        );
      })}
    </div>
  );
}

export default function ShoppingListPage() {
  const { user, apartmentId } = useAuth();
  const [todoItems, setTodoItems] = useState([]);
  const [doneItems, setDoneItems] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [sortOrderSupported, setSortOrderSupported] = useState(true);
  const todoBeforeDrag = useRef(null);
  const doneBeforeDrag = useRef(null);

  const applyLists = (items) => {
    const normalized = normalizeItems(items);
    setTodoItems(normalized.filter((i) => !i.is_done));
    setDoneItems(normalized.filter((i) => i.is_done));
  };

  const fetchItems = async () => {
    if (!apartmentId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setFetchError('');

      let { data, error } = await supabase
        .from('shopping_items')
        .select('id, name, is_done, added_by, created_at, sort_order')
        .eq('apartment_id', apartmentId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error && isMissingSortOrderError(error)) {
        setSortOrderSupported(false);
        ({ data, error } = await supabase
          .from('shopping_items')
          .select('id, name, is_done, added_by, created_at')
          .eq('apartment_id', apartmentId)
          .order('created_at', { ascending: true }));
      } else if (!error) {
        setSortOrderSupported(true);
      }

      if (error) throw error;
      applyLists(data || []);
    } catch (err) {
      console.error('Error fetching items:', err);
      setFetchError(err.message || 'שגיאה בטעינת רשימת הקניות');
      setTodoItems([]);
      setDoneItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [apartmentId]);

  const persistSortOrder = async (orderedItems) => {
    if (!sortOrderSupported) {
      throw new Error(
        'חסרה עמודת sort_order — הריצו את supabase/shopping_items_sort_order.sql'
      );
    }
    const updates = orderedItems.map((item, index) =>
      supabase
        .from('shopping_items')
        .update({ sort_order: index })
        .eq('id', item.id)
        .eq('apartment_id', apartmentId)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
  };

  const handleLiveTodo = (next) => {
    if (!todoBeforeDrag.current) todoBeforeDrag.current = todoItems;
    setTodoItems(next);
  };

  const handlePersistTodo = async (next) => {
    const snapshot = todoBeforeDrag.current;
    todoBeforeDrag.current = null;
    setTodoItems(next);
    try {
      await persistSortOrder(next);
    } catch (err) {
      if (snapshot) setTodoItems(snapshot);
      alert('שגיאה בשמירת הסדר: ' + err.message);
    }
  };

  const handleLiveDone = (next) => {
    if (!doneBeforeDrag.current) doneBeforeDrag.current = doneItems;
    setDoneItems(next);
  };

  const handlePersistDone = async (next) => {
    const snapshot = doneBeforeDrag.current;
    doneBeforeDrag.current = null;
    setDoneItems(next);
    try {
      await persistSortOrder(next);
    } catch (err) {
      if (snapshot) setDoneItems(snapshot);
      alert('שגיאה בשמירת הסדר: ' + err.message);
    }
  };

  const nextSortOrder = async (isDone) => {
    if (!sortOrderSupported) return null;
    const { data: last, error } = await supabase
      .from('shopping_items')
      .select('sort_order')
      .eq('apartment_id', apartmentId)
      .eq('is_done', isDone)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      if (isMissingSortOrderError(error)) {
        setSortOrderSupported(false);
        return null;
      }
      throw error;
    }
    return last == null ? 0 : (Number(last.sort_order) || 0) + 1;
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    try {
      const payload = {
        apartment_id: apartmentId,
        name: inputVal.trim(),
        is_done: false,
        added_by: user.id,
      };
      const sortOrder = await nextSortOrder(false);
      if (sortOrder != null) payload.sort_order = sortOrder;

      const { error } = await supabase.from('shopping_items').insert(payload);
      if (error) throw error;
      setInputVal('');
      await fetchItems();
    } catch (err) {
      alert('שגיאה בהוספת פריט: ' + err.message);
    }
  };

  const handleCheckItem = async (id) => {
    try {
      const payload = { is_done: true };
      const sortOrder = await nextSortOrder(true);
      if (sortOrder != null) payload.sort_order = sortOrder;

      const { error } = await supabase
        .from('shopping_items')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
      await fetchItems();
    } catch (err) {
      alert('שגיאה בעדכון פריט: ' + err.message);
    }
  };

  const handleUncheckItem = async (id) => {
    try {
      const payload = { is_done: false };
      const sortOrder = await nextSortOrder(false);
      if (sortOrder != null) payload.sort_order = sortOrder;

      const { error } = await supabase
        .from('shopping_items')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
      await fetchItems();
    } catch (err) {
      alert('שגיאה בעדכון פריט: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="shopping-container">
        <div className="shopping-loading">טוען רשימה...</div>
      </div>
    );
  }

  return (
    <div className="shopping-container" id="shopping-page">
      <h1 className="shopping-title">רשימת קניות</h1>

      {fetchError && (
        <div className="shopping-error" role="alert">
          {fetchError}
          <div className="shopping-error-hint">
            אם השגיאה קשורה ל־sort_order — הריצו ב־Supabase את{' '}
            <code>shopping_items_sort_order.sql</code> ורעננו.
          </div>
        </div>
      )}

      {!fetchError && !sortOrderSupported && (
        <div className="shopping-warn" role="status">
          גרירה תישמר אחרי הרצת{' '}
          <code>supabase/shopping_items_sort_order.sql</code>
        </div>
      )}

      <form className="add-item-bar" onSubmit={handleAddItem}>
        <input
          type="text"
          className="add-item-input"
          placeholder="למשל: חלב, ביצים..."
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
        />
        <button type="submit" className="add-item-btn">
          הוסף
        </button>
      </form>

      {!fetchError && todoItems.length === 0 && doneItems.length === 0 ? (
        <div className="shopping-empty-state">
          <div className="empty-icon">🛒</div>
          <div className="empty-title">הרשימה ריקה!</div>
          <div className="empty-subtitle">הוסיפו פריטים חדשים למעלה</div>
        </div>
      ) : !fetchError ? (
        <>
          <div className="shopping-section">
            <h2 className="section-subtitle">
              צריך לקנות ({todoItems.length})
            </h2>
            {todoItems.length > 0 ? (
              <SortableList
                items={todoItems}
                isDone={false}
                userId={user?.id}
                onToggle={handleCheckItem}
                onLiveReorder={handleLiveTodo}
                onPersist={handlePersistTodo}
              />
            ) : (
              <div className="items-list-empty">אין פריטים לקנייה</div>
            )}
          </div>

          <div className="shopping-section">
            <h2 className="section-subtitle">
              כבר נקנה ({doneItems.length})
            </h2>
            {doneItems.length > 0 ? (
              <SortableList
                items={doneItems}
                isDone={true}
                userId={user?.id}
                onToggle={handleUncheckItem}
                onLiveReorder={handleLiveDone}
                onPersist={handlePersistDone}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
