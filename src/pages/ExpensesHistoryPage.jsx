import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconEdit, IconTrash } from '../components/icons/TablerIcons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatLocalDate, currentMonthKey, monthDateRange, formatMonthLabel } from '../lib/dates';
import {
  rpcUpdateExpense,
  rpcDeleteExpense,
  fetchExpenseWithShares,
  scaleSharesForAmount,
} from '../lib/expensesApi';
import { useApartmentMembers } from '../hooks/useApartmentMembers';
import './ExpensesHistoryPage.css';

/** @typedef {'all' | 'mine' | 'others'} ExpenseFilter */

const ALL_MONTHS = 'all';
const PAGE_SIZE = 40;

function groupExpensesByMonth(list) {
  const groups = [];
  const indexByKey = new Map();

  (list || []).forEach((exp) => {
    const key =
      exp.date && /^\d{4}-\d{2}/.test(exp.date) ? exp.date.slice(0, 7) : 'unknown';
    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length);
      groups.push({
        key,
        label: key === 'unknown' ? 'ללא תאריך' : formatMonthLabel(key),
        items: [],
      });
    }
    groups[indexByKey.get(key)].items.push(exp);
  });

  return groups;
}

export default function ExpensesHistoryPage() {
  const navigate = useNavigate();
  const { user, apartmentId } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const { members, memberIds } = useApartmentMembers(apartmentId, user?.id);
  const [monthOptions, setMonthOptions] = useState([]);
  const [monthKey, setMonthKey] = useState(() => currentMonthKey());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(/** @type {ExpenseFilter} */ ('all'));
  const [fetchError, setFetchError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPayer, setEditPayer] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editError, setEditError] = useState('');
  const [editSplitMethod, setEditSplitMethod] = useState('equal');
  const [editShares, setEditShares] = useState([]);
  const [editOriginalAmount, setEditOriginalAmount] = useState(0);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const monthMenuRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchMonthOptions = async () => {
    if (!apartmentId) {
      setMonthOptions([]);
      return;
    }

    const { data, error } = await supabase
      .from('expenses')
      .select('date')
      .eq('apartment_id', apartmentId);

    if (error) {
      console.error('Error fetching expense months:', error);
      return;
    }

    const keys = new Set();
    (data || []).forEach((row) => {
      if (row.date && /^\d{4}-\d{2}/.test(row.date)) {
        keys.add(row.date.slice(0, 7));
      }
    });

    // Always include current month so the default selection is valid
    keys.add(currentMonthKey());

    setMonthOptions(Array.from(keys).sort((a, b) => b.localeCompare(a)));
  };

  const fetchExpenses = async () => {
    if (!apartmentId || !user?.id) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setFetchError('');

      let query = supabase
        .from('expenses')
        .select('id, description, amount, date, paid_by')
        .eq('apartment_id', apartmentId)
        .order('date', { ascending: false });

      if (filter === 'mine') {
        query = query.eq('paid_by', user.id);
      } else if (filter === 'others') {
        query = query.neq('paid_by', user.id);
      }

      if (monthKey !== ALL_MONTHS) {
        const range = monthDateRange(monthKey);
        if (range) {
          query = query.gte('date', range.start).lte('date', range.end);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      setExpenses(data || []);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setFetchError(err.message || 'שגיאה בטעינת הוצאות');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthOptions();
  }, [apartmentId, user?.id]);

  useEffect(() => {
    fetchExpenses();
  }, [apartmentId, user?.id, filter, monthKey]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [apartmentId, filter, monthKey, expenses.length]);

  useEffect(() => {
    if (!monthMenuOpen) return undefined;

    const onPointerDown = (e) => {
      if (monthMenuRef.current && !monthMenuRef.current.contains(e.target)) {
        setMonthMenuOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMonthMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [monthMenuOpen]);

  // After edit/delete, refresh month list too
  const refreshAfterMutation = async () => {
    await fetchMonthOptions();
    await fetchExpenses();
  };

  const monthChoices = [
    { value: ALL_MONTHS, label: 'כל החודשים' },
    ...monthOptions.map((key) => ({
      value: key,
      label: formatMonthLabel(key),
    })),
  ];

  const selectedMonthLabel =
    monthChoices.find((m) => m.value === monthKey)?.label || formatMonthLabel(monthKey);

  const payerLabel = (paidBy) => {
    const id = String(paidBy || '');
    if (id === String(user?.id)) return 'שילמתי אני';
    const member = members.find((m) => String(m.id) === id);
    return member ? `שילם ${member.name}` : 'שילם שותף';
  };

  const openEdit = async (exp) => {
    setEditError('');
    setEditOpen(true);
    setEditExpense(exp);
    setEditDescription(exp.description || '');
    setEditAmount(String(Number(exp.amount) || ''));
    setEditPayer(exp.paid_by || user?.id || '');
    setEditDate(exp.date || '');
    setEditOriginalAmount(Number(exp.amount) || 0);
    setEditSplitMethod('equal');
    setEditShares([]);

    try {
      const full = await fetchExpenseWithShares(supabase, exp.id);
      if (full) {
        setEditSplitMethod(full.split_method || 'equal');
        setEditShares(full.shares || []);
        setEditOriginalAmount(Number(full.amount) || 0);
      }
    } catch (err) {
      setEditError(err.message || 'שגיאה בטעינת פרטי חלוקה');
    }
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditOpen(false);
    setEditExpense(null);
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editExpense || !apartmentId) return;

    const parsedAmount = parseFloat(editAmount);
    if (!editDescription.trim()) {
      setEditError('נא להזין תיאור');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setEditError('נא להזין סכום חיובי');
      return;
    }
    if (!editPayer) {
      setEditError('נא לבחור מי שילם');
      return;
    }
    if (!editDate) {
      setEditError('נא לבחור תאריך');
      return;
    }

    try {
      setEditSaving(true);
      setEditError('');

      let shares = editShares;
      if (shares.length === 0 && memberIds.length > 0) {
        const each = parsedAmount / memberIds.length;
        shares = memberIds.map((uid) => ({ userId: uid, amount: each }));
      } else if (Math.abs(parsedAmount - editOriginalAmount) > 0.005) {
        shares = scaleSharesForAmount(shares, editOriginalAmount, parsedAmount);
      }

      await rpcUpdateExpense(supabase, {
        expenseId: editExpense.id,
        description: editDescription.trim(),
        amount: parsedAmount,
        paidBy: editPayer,
        date: editDate,
        splitMethod: editSplitMethod,
        shares,
      });

      setEditOpen(false);
      setEditExpense(null);
      await refreshAfterMutation();
    } catch (err) {
      setEditError(err.message || 'שגיאה בעדכון הוצאה');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !apartmentId) return;

    try {
      setDeleteSaving(true);
      setDeleteError('');

      await rpcDeleteExpense(supabase, deleteTarget.id);

      setDeleteTarget(null);
      await refreshAfterMutation();
    } catch (err) {
      setDeleteError(err.message || 'שגיאה במחיקת הוצאה');
    } finally {
      setDeleteSaving(false);
    }
  };

  const totalSum = expenses
    .reduce((sum, exp) => sum + Number(exp.amount), 0)
    .toFixed(2);

  const visibleExpenses = useMemo(
    () => expenses.slice(0, visibleCount),
    [expenses, visibleCount]
  );

  const monthGroups = useMemo(() => {
    if (monthKey !== ALL_MONTHS) return null;
    return groupExpensesByMonth(visibleExpenses);
  }, [monthKey, visibleExpenses]);

  const hasMore = visibleCount < expenses.length;

  const emptyMessage =
    filter === 'mine'
      ? 'אין הוצאות ששילמת עליהן'
      : filter === 'others'
        ? 'אין הוצאות ששילמו שותפים'
        : monthKey !== ALL_MONTHS
          ? 'אין הוצאות בחודש שנבחר'
          : 'אין הוצאות עדיין';

  const renderExpenseRow = (exp) => (
    <div key={exp.id} className="expense-row-card">
      <div className="expense-icon-square">💰</div>

      <div className="expense-info">
        <div className="expense-name">{exp.description}</div>
        <div className="expense-payer">{payerLabel(exp.paid_by)}</div>
      </div>

      <div className="expense-meta">
        <div className="expense-amount">₪{Number(exp.amount).toFixed(2)}</div>
        <div className="expense-date">{formatLocalDate(exp.date)}</div>
        <div className="expense-actions">
          <button
            type="button"
            className="expense-action-btn edit"
            onClick={() => openEdit(exp)}
            aria-label="ערוך"
            title="ערוך"
          >
            <IconEdit size={16} stroke={1.75} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="expense-action-btn delete"
            onClick={() => {
              setDeleteError('');
              setDeleteTarget(exp);
            }}
            aria-label="מחק"
            title="מחק"
          >
            <IconTrash size={16} stroke={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="expenses-history-container">
        <div className="history-loading">טוען הוצאות...</div>
      </div>
    );
  }

  return (
    <div className="expenses-history-container" id="expenses-history-page">
      <h1 className="history-title">היסטוריית הוצאות</h1>

      <div className="month-filter-row">
        <span className="month-filter-label" id="expense-month-label">
          חודש
        </span>
        <div className="month-dropdown" ref={monthMenuRef}>
          <button
            type="button"
            id="expense-month"
            className={`month-dropdown-trigger ${monthMenuOpen ? 'open' : ''}`}
            aria-haspopup="listbox"
            aria-expanded={monthMenuOpen}
            aria-labelledby="expense-month-label expense-month"
            onClick={() => setMonthMenuOpen((open) => !open)}
          >
            <span className="month-dropdown-value">{selectedMonthLabel}</span>
            <span className="month-dropdown-chevron" aria-hidden="true">
              ▾
            </span>
          </button>

          {monthMenuOpen && (
            <ul
              className="month-dropdown-menu"
              role="listbox"
              aria-labelledby="expense-month-label"
            >
              {monthChoices.map((choice) => (
                <li key={choice.value} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={monthKey === choice.value}
                    className={`month-dropdown-option ${
                      monthKey === choice.value ? 'selected' : ''
                    }`}
                    onClick={() => {
                      setMonthKey(choice.value);
                      setMonthMenuOpen(false);
                    }}
                  >
                    {choice.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="filter-bar" role="tablist" aria-label="סינון הוצאות">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          הכל
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'mine'}
          className={`filter-btn ${filter === 'mine' ? 'active' : ''}`}
          onClick={() => setFilter('mine')}
        >
          שילמתי
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'others'}
          className={`filter-btn ${filter === 'others' ? 'active' : ''}`}
          onClick={() => setFilter('others')}
        >
          שילמו שותפים
        </button>
      </div>

      <div className="total-header">
        <span className="total-label">סה״כ:</span>
        <span className="total-amount">₪{totalSum}</span>
      </div>

      {fetchError && <div className="history-empty">{fetchError}</div>}

      {!fetchError && expenses.length === 0 ? (
        <div className="history-empty">{emptyMessage}</div>
      ) : (
        <>
          <div className="expenses-list">
            {monthGroups
              ? monthGroups.map((group) => (
                  <section key={group.key} className="expense-month-group">
                    <h2 className="expense-month-heading">{group.label}</h2>
                    <div className="expense-month-items">
                      {group.items.map((exp) => renderExpenseRow(exp))}
                    </div>
                  </section>
                ))
              : visibleExpenses.map((exp) => renderExpenseRow(exp))}
          </div>
          {hasMore && (
            <button
              type="button"
              className="history-load-more"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            >
              הצג עוד ({expenses.length - visibleCount})
            </button>
          )}
        </>
      )}

      <button
        type="button"
        className="add-expense-cta"
        onClick={() => navigate('/expenses/add')}
      >
        + הוסף הוצאה חדשה
      </button>

      {editOpen && editExpense && (
        <div className="expense-modal-overlay" onClick={closeEdit}>
          <div
            className="expense-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-expense-title"
          >
            <h2 id="edit-expense-title" className="expense-modal-title">
              עריכת הוצאה
            </h2>
            <form onSubmit={handleEditSubmit} className="expense-modal-form">
              <label className="expense-field-label" htmlFor="edit-desc">
                תיאור
              </label>
              <input
                id="edit-desc"
                className="expense-field-input"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />

              <label className="expense-field-label" htmlFor="edit-amount">
                סכום (₪)
              </label>
              <input
                id="edit-amount"
                type="number"
                min="0.01"
                step="0.01"
                className="expense-field-input"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />

              <label className="expense-field-label" htmlFor="edit-payer">
                מי שילם?
              </label>
              <select
                id="edit-payer"
                className="expense-field-input"
                value={editPayer}
                onChange={(e) => {
                  setEditPayer(e.target.value);
                  // Rebuild shares for equal split when payer changes,
                  // so the new payer gets credit and balances stay correct.
                  if (memberIds.length > 0) {
                    const parsed = parseFloat(editAmount);
                    const total = Number.isFinite(parsed) && parsed > 0 ? parsed : editOriginalAmount;
                    const each = total / memberIds.length;
                    setEditShares(memberIds.map((uid) => ({ userId: uid, amount: each })));
                    setEditOriginalAmount(total);
                  }
                }}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              <label className="expense-field-label" htmlFor="edit-date">
                תאריך
              </label>
              <input
                id="edit-date"
                type="date"
                className="expense-field-input"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />

              {editError && <div className="expense-modal-error">{editError}</div>}

              <div className="expense-modal-actions">
                <button
                  type="submit"
                  className="expense-modal-save"
                  disabled={editSaving}
                >
                  {editSaving ? 'שומר...' : 'שמור שינויים'}
                </button>
                <button
                  type="button"
                  className="expense-modal-cancel"
                  onClick={closeEdit}
                  disabled={editSaving}
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="expense-modal-overlay"
          onClick={() => !deleteSaving && setDeleteTarget(null)}
        >
          <div
            className="expense-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-expense-title"
          >
            <h2 id="delete-expense-title" className="expense-modal-title">
              מחיקת הוצאה
            </h2>
            <p className="expense-modal-subtitle">
              בטוח שברצונך למחוק את ההוצאה?
            </p>
            <p className="expense-modal-detail">
              «{deleteTarget.description}» — ₪
              {Number(deleteTarget.amount).toFixed(2)}
            </p>

            {deleteError && <div className="expense-modal-error">{deleteError}</div>}

            <div className="expense-modal-actions">
              <button
                type="button"
                className="expense-modal-delete"
                onClick={handleDeleteConfirm}
                disabled={deleteSaving}
              >
                {deleteSaving ? 'מוחק...' : 'כן, מחק'}
              </button>
              <button
                type="button"
                className="expense-modal-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteSaving}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
