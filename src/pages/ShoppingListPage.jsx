import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  IconChecks,
  IconTrash,
  IconCheck,
  IconEdit,
  IconSearch,
} from '../components/icons/TablerIcons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { rpcUpdateApartmentShoppingSettings } from '../lib/apartmentApi';
import {
  DEFAULT_SHOPPING_CATEGORIES,
  NEW_CATEGORY_OPTION,
  normalizeCategory,
  normalizeCategoryList,
  categoryLabel,
  filterShoppingItems,
  groupItemsByCategory,
  cleanupCutoffIso,
} from '../lib/shopping';
import './ShoppingListPage.css';

const SELECT_FULL =
  'id, name, quantity, category, is_done, added_by, created_at, sort_order, completed_at';
const SELECT_BASIC = 'id, name, is_done, added_by, created_at, sort_order';

function isMissingColumnError(err, column) {
  const msg = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`;
  return new RegExp(column, 'i').test(msg);
}

function normalizeItems(rows) {
  return (rows || []).map((row, index) => ({
    ...row,
    id: String(row.id),
    quantity: row.quantity || '',
    category: normalizeCategory(row.category),
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

function SortableList({
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

function CategoryGroupedLists({
  items,
  isDone,
  userId,
  categoryOrder,
  onToggle,
  onEdit,
  onLiveGroupReorder,
  onPersistGroup,
}) {
  const groups = useMemo(
    () => groupItemsByCategory(items, categoryOrder),
    [items, categoryOrder]
  );

  return (
    <div className="category-groups">
      {groups.map((group) => (
        <div key={group.category} className="category-group">
          <h3 className="category-heading">{group.label}</h3>
          <SortableList
            items={group.items}
            isDone={isDone}
            userId={userId}
            onToggle={onToggle}
            onEdit={onEdit}
            onLiveReorder={(nextGroup) =>
              onLiveGroupReorder(group.category, nextGroup)
            }
            onPersist={(nextGroup) => onPersistGroup(group.category, nextGroup)}
          />
        </div>
      ))}
    </div>
  );
}

function rebuildFullList(allItems, category, nextGroupItems, categoryOrder) {
  const groups = groupItemsByCategory(allItems, categoryOrder);
  const rebuilt = [];
  groups.forEach((g) => {
    if (g.category === category) rebuilt.push(...nextGroupItems);
    else rebuilt.push(...g.items);
  });
  return rebuilt;
}

function CategorySelect({
  id,
  className,
  categories,
  value,
  onChange,
  disabled,
  newValue,
  onNewValueChange,
}) {
  const showNew = value === NEW_CATEGORY_OPTION;
  const options =
    !showNew && value && !categories.includes(value)
      ? [...categories, value]
      : categories;

  return (
    <div className="category-select-wrap">
      <select
        id={id}
        className={className}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label="קטגוריה"
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={NEW_CATEGORY_OPTION}>＋ קטגוריה חדשה</option>
      </select>
      {showNew && (
        <input
          type="text"
          className={className}
          placeholder="שם קטגוריה חדשה"
          value={newValue}
          onChange={onNewValueChange}
          disabled={disabled}
          aria-label="שם קטגוריה חדשה"
        />
      )}
    </div>
  );
}

export default function ShoppingListPage() {
  const { user, apartmentId } = useAuth();
  const [todoItems, setTodoItems] = useState([]);
  const [doneItems, setDoneItems] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [quantityVal, setQuantityVal] = useState('');
  const [categoryVal, setCategoryVal] = useState(DEFAULT_SHOPPING_CATEGORIES[0]);
  const [newCategoryVal, setNewCategoryVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [sortOrderSupported, setSortOrderSupported] = useState(true);
  const [featuresSupported, setFeaturesSupported] = useState(true);
  const [cleanupDays, setCleanupDays] = useState(7);
  const [cleanupEnabled, setCleanupEnabled] = useState(true);
  const [apartmentCategories, setApartmentCategories] = useState(
    DEFAULT_SHOPPING_CATEGORIES
  );
  const [savingCleanup, setSavingCleanup] = useState(false);

  const [editItem, setEditItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editCategory, setEditCategory] = useState(
    DEFAULT_SHOPPING_CATEGORIES[0]
  );
  const [editNewCategory, setEditNewCategory] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState('');

  const todoBeforeDrag = useRef(null);
  const doneBeforeDrag = useRef(null);

  const applyLists = (items) => {
    const normalized = normalizeItems(items);
    setTodoItems(normalized.filter((i) => !i.is_done));
    setDoneItems(normalized.filter((i) => i.is_done));
  };

  const runAutoCleanup = async (days, enabled = true) => {
    if (!apartmentId || !featuresSupported || !enabled) return 0;
    const cutoff = cleanupCutoffIso(days);
    const { data, error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('apartment_id', apartmentId)
      .eq('is_done', true)
      .lt('completed_at', cutoff)
      .select('id');
    if (error) {
      if (isMissingColumnError(error, 'completed_at')) return 0;
      console.error('Cleanup error:', error);
      return 0;
    }
    return (data || []).length;
  };

  const fetchApartmentSettings = async () => {
    const defaults = {
      days: 7,
      enabled: true,
      categories: DEFAULT_SHOPPING_CATEGORIES,
    };

    let { data, error } = await supabase
      .from('apartments')
      .select(
        'shopping_cleanup_days, shopping_cleanup_enabled, shopping_categories'
      )
      .eq('id', apartmentId)
      .maybeSingle();

    if (error && isMissingColumnError(error, 'shopping_cleanup_enabled')) {
      ({ data, error } = await supabase
        .from('apartments')
        .select('shopping_cleanup_days, shopping_categories')
        .eq('id', apartmentId)
        .maybeSingle());
    }

    if (error && isMissingColumnError(error, 'shopping_categories')) {
      ({ data, error } = await supabase
        .from('apartments')
        .select('shopping_cleanup_days')
        .eq('id', apartmentId)
        .maybeSingle());
    }

    if (error && isMissingColumnError(error, 'shopping_cleanup_days')) {
      return defaults;
    }

    if (error) {
      console.error(error);
      return defaults;
    }

    const n = Number(data?.shopping_cleanup_days);
    return {
      days: Number.isFinite(n) && n >= 1 ? n : 7,
      enabled: data?.shopping_cleanup_enabled !== false,
      categories: data?.shopping_categories
        ? normalizeCategoryList(data.shopping_categories)
        : DEFAULT_SHOPPING_CATEGORIES,
    };
  };

  const ensureCategorySaved = async (rawName) => {
    const cat = normalizeCategory(rawName);
    if (apartmentCategories.includes(cat)) return cat;
    const next = normalizeCategoryList([...apartmentCategories, cat]);
    setApartmentCategories(next);
    await rpcUpdateApartmentShoppingSettings(supabase, apartmentId, {
      shoppingCategories: next,
    });
    return cat;
  };

  const resolveCategorySelection = async (selected, newName) => {
    if (selected === NEW_CATEGORY_OPTION) {
      const trimmed = (newName || '').trim();
      if (!trimmed) throw new Error('נא להזין שם לקטגוריה חדשה');
      return ensureCategorySaved(trimmed);
    }
    return ensureCategorySaved(selected);
  };

  const fetchItems = async () => {
    if (!apartmentId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setFetchError('');

      const { days, enabled, categories } = await fetchApartmentSettings();
      setCleanupDays(days);
      setCleanupEnabled(enabled);
      setApartmentCategories(categories);
      setCategoryVal((prev) =>
        prev === NEW_CATEGORY_OPTION || categories.includes(prev)
          ? prev
          : categories[0]
      );

      let { data, error } = await supabase
        .from('shopping_items')
        .select(SELECT_FULL)
        .eq('apartment_id', apartmentId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (
        error &&
        (isMissingColumnError(error, 'quantity') ||
          isMissingColumnError(error, 'category') ||
          isMissingColumnError(error, 'completed_at'))
      ) {
        setFeaturesSupported(false);
        ({ data, error } = await supabase
          .from('shopping_items')
          .select(SELECT_BASIC)
          .eq('apartment_id', apartmentId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }));
      } else if (error && isMissingColumnError(error, 'sort_order')) {
        setSortOrderSupported(false);
        ({ data, error } = await supabase
          .from('shopping_items')
          .select('id, name, is_done, added_by, created_at')
          .eq('apartment_id', apartmentId)
          .order('created_at', { ascending: true }));
      } else if (!error) {
        setFeaturesSupported(true);
        setSortOrderSupported(true);
        await runAutoCleanup(days, enabled);
        // re-fetch after cleanup
        ({ data, error } = await supabase
          .from('shopping_items')
          .select(SELECT_FULL)
          .eq('apartment_id', apartmentId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }));
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
    if (!sortOrderSupported) return;
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

  const handleLiveTodoGroup = (category, nextGroup) => {
    setTodoItems((prev) => {
      if (!todoBeforeDrag.current) todoBeforeDrag.current = prev;
      return rebuildFullList(prev, category, nextGroup, apartmentCategories);
    });
  };

  const handlePersistTodoGroup = (category, nextGroup) => {
    setTodoItems((prev) => {
      const next = rebuildFullList(
        prev,
        category,
        nextGroup,
        apartmentCategories
      );
      const snapshot = todoBeforeDrag.current || prev;
      todoBeforeDrag.current = null;
      persistSortOrder(next).catch((err) => {
        setTodoItems(snapshot);
        alert('שגיאה בשמירת הסדר: ' + err.message);
      });
      return next;
    });
  };

  const handleLiveDoneGroup = (category, nextGroup) => {
    setDoneItems((prev) => {
      if (!doneBeforeDrag.current) doneBeforeDrag.current = prev;
      return rebuildFullList(prev, category, nextGroup, apartmentCategories);
    });
  };

  const handlePersistDoneGroup = (category, nextGroup) => {
    setDoneItems((prev) => {
      const next = rebuildFullList(
        prev,
        category,
        nextGroup,
        apartmentCategories
      );
      const snapshot = doneBeforeDrag.current || prev;
      doneBeforeDrag.current = null;
      persistSortOrder(next).catch((err) => {
        setDoneItems(snapshot);
        alert('שגיאה בשמירת הסדר: ' + err.message);
      });
      return next;
    });
  };

  const handleLiveFlatTodo = (next) => {
    if (!todoBeforeDrag.current) todoBeforeDrag.current = todoItems;
    setTodoItems(next);
  };

  const handlePersistFlatTodo = async (next) => {
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

  const handleLiveFlatDone = (next) => {
    if (!doneBeforeDrag.current) doneBeforeDrag.current = doneItems;
    setDoneItems(next);
  };

  const handlePersistFlatDone = async (next) => {
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
      if (isMissingColumnError(error, 'sort_order')) {
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
      if (featuresSupported) {
        payload.quantity = quantityVal.trim() || null;
        payload.category = await resolveCategorySelection(
          categoryVal,
          newCategoryVal
        );
        payload.completed_at = null;
      }

      const { error } = await supabase.from('shopping_items').insert(payload);
      if (error) throw error;
      setInputVal('');
      setQuantityVal('');
      setCategoryVal(apartmentCategories[0] || DEFAULT_SHOPPING_CATEGORIES[0]);
      setNewCategoryVal('');
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
      if (featuresSupported) payload.completed_at = new Date().toISOString();

      const { error } = await supabase
        .from('shopping_items')
        .update(payload)
        .eq('id', id)
        .eq('apartment_id', apartmentId);
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
      if (featuresSupported) payload.completed_at = null;

      const { error } = await supabase
        .from('shopping_items')
        .update(payload)
        .eq('id', id)
        .eq('apartment_id', apartmentId);
      if (error) throw error;
      await fetchItems();
    } catch (err) {
      alert('שגיאה בעדכון פריט: ' + err.message);
    }
  };

  const handleMarkAllBought = async () => {
    if (todoItems.length === 0) return;
    if (!window.confirm('לסמן את כל הפריטים כנקנו?')) return;
    try {
      const now = new Date().toISOString();
      const updates = todoItems.map((item, index) => {
        const payload = { is_done: true, sort_order: index };
        if (featuresSupported) payload.completed_at = now;
        return supabase
          .from('shopping_items')
          .update(payload)
          .eq('id', item.id)
          .eq('apartment_id', apartmentId);
      });
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      await fetchItems();
    } catch (err) {
      alert('שגיאה בסימון הכל: ' + err.message);
    }
  };

  const openBulkDelete = () => {
    if (todoItems.length === 0) return;
    setBulkSelectedIds(new Set());
    setBulkDeleteError('');
    setBulkConfirmOpen(false);
    setBulkDeleteOpen(true);
  };

  const toggleBulkId = (id) => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllBulk = () => {
    setBulkSelectedIds(new Set(todoItems.map((item) => item.id)));
  };

  const clearBulkSelection = () => {
    setBulkSelectedIds(new Set());
  };

  const requestBulkDeleteConfirm = () => {
    if (bulkSelectedIds.size === 0) {
      setBulkDeleteError('נא לבחור לפחות פריט אחד');
      return;
    }
    setBulkDeleteError('');
    setBulkConfirmOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    const ids = [...bulkSelectedIds];
    if (ids.length === 0) return;
    try {
      setBulkDeleting(true);
      setBulkDeleteError('');
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('apartment_id', apartmentId)
        .eq('is_done', false)
        .in('id', ids)
        .select('id');
      if (error) throw error;
      setBulkConfirmOpen(false);
      setBulkDeleteOpen(false);
      setBulkSelectedIds(new Set());
      await fetchItems();
    } catch (err) {
      setBulkDeleteError(err.message || 'שגיאה במחיקה');
      setBulkConfirmOpen(false);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleToggleCleanup = async () => {
    const next = !cleanupEnabled;
    setCleanupEnabled(next);
    try {
      setSavingCleanup(true);
      await rpcUpdateApartmentShoppingSettings(supabase, apartmentId, {
        shoppingCleanupEnabled: next,
      });
      if (next) {
        await runAutoCleanup(cleanupDays, true);
        await fetchItems();
      }
    } catch (err) {
      setCleanupEnabled(!next);
      alert('שגיאה בעדכון מחיקה אוטומטית: ' + err.message);
    } finally {
      setSavingCleanup(false);
    }
  };

  const handleSaveCleanupDays = async () => {
    const n = Math.min(90, Math.max(1, Number(cleanupDays) || 7));
    setCleanupDays(n);
    try {
      setSavingCleanup(true);
      await rpcUpdateApartmentShoppingSettings(supabase, apartmentId, {
        shoppingCleanupDays: n,
      });
      if (cleanupEnabled) {
        await runAutoCleanup(n, true);
        await fetchItems();
      }
    } catch (err) {
      alert('שגיאה בשמירת ימי ניקוי: ' + err.message);
    } finally {
      setSavingCleanup(false);
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditName(item.name || '');
    setEditQuantity(item.quantity || '');
    setEditCategory(normalizeCategory(item.category));
    setEditNewCategory('');
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    if (!editName.trim()) {
      setEditError('נא להזין שם פריט');
      return;
    }
    try {
      setEditSaving(true);
      setEditError('');
      const payload = { name: editName.trim() };
      if (featuresSupported) {
        payload.quantity = editQuantity.trim() || null;
        payload.category = await resolveCategorySelection(
          editCategory,
          editNewCategory
        );
      }
      const { error } = await supabase
        .from('shopping_items')
        .update(payload)
        .eq('id', editItem.id)
        .eq('apartment_id', apartmentId);
      if (error) throw error;
      setEditItem(null);
      setEditNewCategory('');
      await fetchItems();
    } catch (err) {
      setEditError(err.message || 'שגיאה בעדכון');
    } finally {
      setEditSaving(false);
    }
  };

  const searching = searchQuery.trim().length > 0;
  const filteredTodo = useMemo(
    () => filterShoppingItems(todoItems, searchQuery),
    [todoItems, searchQuery]
  );
  const filteredDone = useMemo(
    () => filterShoppingItems(doneItems, searchQuery),
    [doneItems, searchQuery]
  );

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
        </div>
      )}

      <form className="add-item-form" onSubmit={handleAddItem}>
        <div className="add-item-bar">
          <input
            type="text"
            className="add-item-input"
            placeholder="למשל: חלב, ביצים..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            aria-label="שם פריט"
          />
          <button
            type="submit"
            className="add-item-btn"
            aria-label="הוסף פריט"
            title="הוסף"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
        <div className="add-item-extras">
          <CategorySelect
            className="add-item-category"
            categories={apartmentCategories}
            value={categoryVal}
            onChange={(e) => setCategoryVal(e.target.value)}
            disabled={!featuresSupported}
            newValue={newCategoryVal}
            onNewValueChange={(e) => setNewCategoryVal(e.target.value)}
          />
          <input
            type="number"
            min="0"
            step="1"
            className="add-item-qty"
            placeholder="כמות"
            value={quantityVal}
            onChange={(e) => setQuantityVal(e.target.value)}
            disabled={!featuresSupported}
            aria-label="כמות"
          />
        </div>
      </form>

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
            onClick={handleMarkAllBought}
            disabled={todoItems.length === 0}
            aria-label="סמן הכל כנקנה"
            title="סמן הכל כנקנה"
          >
            <IconChecks size={18} stroke={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn danger"
            onClick={openBulkDelete}
            disabled={todoItems.length === 0}
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
                  onClick={handleToggleCleanup}
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
                    onClick={handleSaveCleanupDays}
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

      {!fetchError && (
        <>
          <div className="shopping-section">
            <h2 className="section-subtitle">
              צריך לקנות ({filteredTodo.length}
              {searching ? ` / ${todoItems.length}` : ''})
            </h2>
            {todoItems.length === 0 && doneItems.length === 0 && !searching ? (
              <div className="shopping-empty-state shopping-empty-inline">
                <div className="empty-icon">🛒</div>
                <div className="empty-title">הרשימה ריקה!</div>
                <div className="empty-subtitle">הוסיפו פריטים חדשים למעלה</div>
              </div>
            ) : filteredTodo.length === 0 ? (
              <div className="items-list-empty">
                {searching ? 'אין תוצאות בחיפוש' : 'אין פריטים לקנייה'}
              </div>
            ) : searching || !featuresSupported ? (
              <SortableList
                items={filteredTodo}
                isDone={false}
                userId={user?.id}
                onToggle={handleCheckItem}
                onEdit={openEdit}
                onLiveReorder={handleLiveFlatTodo}
                onPersist={handlePersistFlatTodo}
                disableDrag={searching}
              />
            ) : (
              <CategoryGroupedLists
                items={filteredTodo}
                isDone={false}
                userId={user?.id}
                categoryOrder={apartmentCategories}
                onToggle={handleCheckItem}
                onEdit={openEdit}
                onLiveGroupReorder={handleLiveTodoGroup}
                onPersistGroup={handlePersistTodoGroup}
              />
            )}
          </div>

          <div className="shopping-section shopping-section-done">
            <h2 className="section-subtitle">
              כבר נקנה ({filteredDone.length}
              {searching ? ` / ${doneItems.length}` : ''})
            </h2>

            {filteredDone.length === 0 ? (
              <div className="items-list-empty">
                {searching ? 'אין תוצאות בחיפוש' : 'אין פריטים שנקנו עדיין'}
              </div>
            ) : searching || !featuresSupported ? (
              <SortableList
                items={filteredDone}
                isDone={true}
                userId={user?.id}
                onToggle={handleUncheckItem}
                onEdit={openEdit}
                onLiveReorder={handleLiveFlatDone}
                onPersist={handlePersistFlatDone}
                disableDrag={searching}
              />
            ) : (
              <CategoryGroupedLists
                items={filteredDone}
                isDone={true}
                userId={user?.id}
                categoryOrder={apartmentCategories}
                onToggle={handleUncheckItem}
                onEdit={openEdit}
                onLiveGroupReorder={handleLiveDoneGroup}
                onPersistGroup={handlePersistDoneGroup}
              />
            )}
          </div>
        </>
      )}

      {bulkDeleteOpen && (
        <div
          className="shopping-modal-overlay"
          onClick={() =>
            !bulkDeleting && !bulkConfirmOpen && setBulkDeleteOpen(false)
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
                onClick={selectAllBulk}
                disabled={bulkDeleting}
              >
                בחר הכל
              </button>
              <button
                type="button"
                className="shopping-modal-cancel"
                onClick={clearBulkSelection}
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
                        onChange={() => toggleBulkId(item.id)}
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
                onClick={requestBulkDeleteConfirm}
                disabled={bulkDeleting || bulkSelectedIds.size === 0}
              >
                מחק נבחרים ({bulkSelectedIds.size})
              </button>
              <button
                type="button"
                className="shopping-modal-cancel"
                onClick={() => setBulkDeleteOpen(false)}
                disabled={bulkDeleting}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkConfirmOpen && (
        <div
          className="shopping-modal-overlay shopping-modal-overlay-top"
          onClick={() => !bulkDeleting && setBulkConfirmOpen(false)}
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
              למחוק {bulkSelectedIds.size} פריטים מהרשימה? פעולה זו אינה ניתנת
              לביטול.
            </p>
            <div className="shopping-modal-actions">
              <button
                type="button"
                className="shopping-modal-save shopping-modal-danger"
                onClick={handleBulkDeleteConfirm}
                disabled={bulkDeleting}
              >
                {bulkDeleting ? 'מוחק...' : 'מחק'}
              </button>
              <button
                type="button"
                className="shopping-modal-cancel"
                onClick={() => setBulkConfirmOpen(false)}
                disabled={bulkDeleting}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {editItem && (
        <div
          className="shopping-modal-overlay"
          onClick={() => !editSaving && setEditItem(null)}
        >
          <div
            className="shopping-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-shopping-title"
          >
            <h2 id="edit-shopping-title" className="shopping-modal-title">
              עריכת פריט
            </h2>
            <form onSubmit={handleEditSubmit} className="shopping-modal-form">
              <label className="shopping-field-label" htmlFor="edit-shop-name">
                שם
              </label>
              <input
                id="edit-shop-name"
                className="shopping-field-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />

              <label className="shopping-field-label" htmlFor="edit-shop-qty">
                כמות
              </label>
              <input
                id="edit-shop-qty"
                type="number"
                min="0"
                step="1"
                className="shopping-field-input"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                disabled={!featuresSupported}
                placeholder="כמות"
              />

              <label
                className="shopping-field-label"
                htmlFor="edit-shop-category"
              >
                קטגוריה
              </label>
              <CategorySelect
                id="edit-shop-category"
                className="shopping-field-input"
                categories={apartmentCategories}
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                disabled={!featuresSupported}
                newValue={editNewCategory}
                onNewValueChange={(e) => setEditNewCategory(e.target.value)}
              />

              {editError && (
                <div className="shopping-modal-error">{editError}</div>
              )}

              <div className="shopping-modal-actions">
                <button
                  type="submit"
                  className="shopping-modal-save"
                  disabled={editSaving}
                >
                  {editSaving ? 'שומר...' : 'שמור'}
                </button>
                <button
                  type="button"
                  className="shopping-modal-cancel"
                  onClick={() => setEditItem(null)}
                  disabled={editSaving}
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
