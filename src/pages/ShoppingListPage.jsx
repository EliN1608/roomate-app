import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { supabase } from '../lib/supabase';
import { rpcUpdateApartmentShoppingSettings } from '../lib/apartmentApi';
import {
  DEFAULT_SHOPPING_CATEGORIES,
  NEW_CATEGORY_OPTION,
  normalizeCategory,
  normalizeCategoryList,
  filterShoppingItems,
  cleanupCutoffIso,
} from '../lib/shopping';
import AddItemForm from '../components/ShoppingList/AddItemForm';
import BulkActionsBar from '../components/ShoppingList/BulkActionsBar';
import BulkConfirmModal from '../components/ShoppingList/BulkConfirmModal';
import BulkDeleteModal from '../components/ShoppingList/BulkDeleteModal';
import CategoryGroupedLists from '../components/ShoppingList/CategoryGroupedLists';
import EditItemModal from '../components/ShoppingList/EditItemModal';
import SortableList from '../components/ShoppingList/SortableList';
import {
  SELECT_FULL,
  SELECT_BASIC,
  isMissingColumnError,
  normalizeItems,
  rebuildFullList,
} from '../components/ShoppingList/shoppingListHelpers';
import './ShoppingListPage.css';

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

  const runAutoCleanup = useCallback(
    async (days, enabled = true) => {
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
    },
    [apartmentId, featuresSupported]
  );

  const fetchApartmentSettings = useCallback(async () => {
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
  }, [apartmentId]);

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

  const fetchItems = useCallback(async () => {
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
  }, [apartmentId, fetchApartmentSettings, runAutoCleanup]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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

      <AddItemForm
        inputVal={inputVal}
        setInputVal={setInputVal}
        quantityVal={quantityVal}
        setQuantityVal={setQuantityVal}
        categoryVal={categoryVal}
        setCategoryVal={setCategoryVal}
        newCategoryVal={newCategoryVal}
        setNewCategoryVal={setNewCategoryVal}
        apartmentCategories={apartmentCategories}
        featuresSupported={featuresSupported}
        onSubmit={handleAddItem}
      />

      <BulkActionsBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        todoItemsLength={todoItems.length}
        onMarkAllBought={handleMarkAllBought}
        onOpenBulkDelete={openBulkDelete}
        featuresSupported={featuresSupported}
        cleanupEnabled={cleanupEnabled}
        cleanupDays={cleanupDays}
        setCleanupDays={setCleanupDays}
        savingCleanup={savingCleanup}
        onToggleCleanup={handleToggleCleanup}
        onSaveCleanupDays={handleSaveCleanupDays}
      />

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
        <BulkDeleteModal
          todoItems={todoItems}
          bulkSelectedIds={bulkSelectedIds}
          bulkDeleting={bulkDeleting}
          bulkConfirmOpen={bulkConfirmOpen}
          bulkDeleteError={bulkDeleteError}
          onSelectAll={selectAllBulk}
          onClearSelection={clearBulkSelection}
          onToggleId={toggleBulkId}
          onRequestConfirm={requestBulkDeleteConfirm}
          onClose={() => setBulkDeleteOpen(false)}
        />
      )}

      {bulkConfirmOpen && (
        <BulkConfirmModal
          selectedCount={bulkSelectedIds.size}
          bulkDeleting={bulkDeleting}
          onConfirm={handleBulkDeleteConfirm}
          onClose={() => setBulkConfirmOpen(false)}
        />
      )}

      {editItem && (
        <EditItemModal
          editName={editName}
          setEditName={setEditName}
          editQuantity={editQuantity}
          setEditQuantity={setEditQuantity}
          editCategory={editCategory}
          setEditCategory={setEditCategory}
          editNewCategory={editNewCategory}
          setEditNewCategory={setEditNewCategory}
          apartmentCategories={apartmentCategories}
          featuresSupported={featuresSupported}
          editError={editError}
          editSaving={editSaving}
          onSubmit={handleEditSubmit}
          onClose={() => setEditItem(null)}
        />
      )}
    </div>
  );
}
