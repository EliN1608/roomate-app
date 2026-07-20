import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toLocalDateString } from '../lib/dates';
import { rpcCreateExpense } from '../lib/expensesApi';
import { useApartmentMembers } from '../hooks/useApartmentMembers';
import {
  EXPENSE_CATEGORIES,
  SPLIT_METHODS,
  computeShares,
  previewShares,
} from '../lib/expenseSplits';
import Toast from '../components/Toast/Toast';
import './AddExpensePage.css';

const SUCCESS_TOAST_MS = 2200;

export default function AddExpensePage() {
  const navigate = useNavigate();
  const { user, apartmentId } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => toLocalDateString());
  const [category, setCategory] = useState('other');
  const [isRecurring, setIsRecurring] = useState(false);
  const [splitMethod, setSplitMethod] = useState('equal');
  const [payer, setPayer] = useState(user?.id || '');
  const [roommates, setRoommates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', type: 'success' });
  const navigateAfterClose = useRef(false);

  const showToast = (message, type = 'success') => {
    setToast({ open: true, message, type });
  };

  const handleToastClose = () => {
    setToast((prev) => ({ ...prev, open: false }));
    if (navigateAfterClose.current) {
      navigateAfterClose.current = false;
      navigate('/expenses');
    }
  };

  useEffect(() => {
    if (user?.id) {
      setPayer(user.id);
    }
  }, [user]);

  const { members: memberRows, loading: membersLoading, error: membersError } =
    useApartmentMembers(apartmentId, user?.id);

  useEffect(() => {
    if (!memberRows.length) {
      setRoommates([]);
      return;
    }

    const n = memberRows.length || 1;
    const equalPct = (100 / n).toFixed(1);

    setRoommates(
      memberRows.map((m) => ({
        id: m.id,
        name: m.name,
        checked: true,
        percent: equalPct,
        fixed: '',
      }))
    );
  }, [memberRows]);

  const checkedRoommates = useMemo(
    () => roommates.filter((r) => r.checked),
    [roommates]
  );

  const previewMap = useMemo(() => {
    const rows = previewShares({
      mode: splitMethod,
      total: amount,
      participants: checkedRoommates,
    });
    const map = {};
    rows.forEach((r) => {
      map[r.userId] = r.amount;
    });
    return map;
  }, [splitMethod, amount, checkedRoommates]);

  const redistributeEqualInputs = (list) => {
    const checked = list.filter((r) => r.checked);
    const n = checked.length || 1;
    const equalPct = (100 / n).toFixed(1);
    const total = Number(amount);
    const equalFixed =
      Number.isFinite(total) && total > 0 && checked.length
        ? (total / checked.length).toFixed(2)
        : '';

    return list.map((rm) => {
      if (!rm.checked) {
        return { ...rm, percent: '0', fixed: '0' };
      }
      return {
        ...rm,
        percent: equalPct,
        fixed: equalFixed,
      };
    });
  };

  const toggleRoommate = (id) => {
    setRoommates((prev) => {
      const updated = prev.map((rm) =>
        rm.id === id ? { ...rm, checked: !rm.checked } : rm
      );
      if (splitMethod === 'equal') {
        return redistributeEqualInputs(updated);
      }
      return updated;
    });
  };

  const updateRoommateField = (id, field, value) => {
    setRoommates((prev) =>
      prev.map((rm) => (rm.id === id ? { ...rm, [field]: value } : rm))
    );
  };

  const handleSplitMethodChange = (mode) => {
    setSplitMethod(mode);
    if (mode === 'equal') {
      setRoommates((prev) => redistributeEqualInputs(prev));
    } else if (mode === 'percent') {
      setRoommates((prev) => {
        const checked = prev.filter((r) => r.checked);
        const n = checked.length || 1;
        const equalPct = (100 / n).toFixed(1);
        return prev.map((rm) => ({
          ...rm,
          percent: rm.checked ? equalPct : '0',
        }));
      });
    } else if (mode === 'fixed') {
      setRoommates((prev) => {
        const checked = prev.filter((r) => r.checked);
        const total = Number(amount);
        const equalFixed =
          Number.isFinite(total) && total > 0 && checked.length
            ? (total / checked.length).toFixed(2)
            : '';
        return prev.map((rm) => ({
          ...rm,
          fixed: rm.checked ? equalFixed : '0',
        }));
      });
    }
  };

  // Keep equal fixed/percent hints in sync when amount changes
  useEffect(() => {
    if (splitMethod !== 'equal') return;
    setRoommates((prev) => redistributeEqualInputs(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('נא להזין תיאור הוצאה', 'error');
      return;
    }
    if (!amount.trim()) {
      showToast('נא להזין סכום', 'error');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showToast('הסכום חייב להיות מספר גדול מ-0', 'error');
      return;
    }

    if (!expenseDate) {
      showToast('נא לבחור תאריך', 'error');
      return;
    }

    if (!payer) {
      showToast('נא לבחור מי שילם', 'error');
      return;
    }

    const { shares, error: splitError } = computeShares({
      mode: splitMethod,
      total: parsedAmount,
      participants: checkedRoommates,
    });
    if (splitError) {
      showToast(splitError, 'error');
      return;
    }

    try {
      setLoading(true);

      await rpcCreateExpense(supabase, {
        apartmentId,
        paidBy: payer,
        description: description.trim(),
        amount: parsedAmount,
        date: expenseDate,
        category,
        isRecurring,
        splitMethod,
        shares,
      });

      navigateAfterClose.current = true;
      showToast('ההוצאה נוספה בהצלחה', 'success');
    } catch (err) {
      navigateAfterClose.current = false;
      showToast('שגיאה בשמירת הוצאה: ' + err.message, 'error');
      setLoading(false);
    }
  };

  const splitHint =
    splitMethod === 'equal'
      ? 'חלוקה שווה בין המשתתפים שנבחרו'
      : splitMethod === 'percent'
        ? 'הזינו אחוזים שסכומם 100%'
        : 'הזינו סכום לכל משתתף — חייב להסתכם לסכום ההוצאה';

  return (
    <div className="add-expense-container" id="add-expense-page">
      <div className="expense-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate(-1)}
          aria-label="חזור"
        >
          ←
        </button>
        <h1 className="expense-title">הוספת הוצאה</h1>
        <div style={{ width: '24px' }} />
      </div>

      {(membersLoading || membersError || (!membersLoading && roommates.length === 0)) && (
        <div className="form-card" style={{ marginBottom: 16 }}>
          {membersLoading && <p className="body">טוען שותפים...</p>}
          {membersError && <p className="body" style={{ color: 'var(--error)' }}>{membersError}</p>}
          {!membersLoading && !membersError && roommates.length === 0 && (
            <p className="body">לא נמצאו שותפים בדירה — לא ניתן לחלק הוצאה.</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="expense-form">
        <div className="form-card">
          <div className="form-group">
            <label className="form-label" htmlFor="expense-desc">
              תיאור הוצאה
            </label>
            <input
              id="expense-desc"
              type="text"
              className="form-input"
              placeholder="למשל: חשבון מים, מצרכים..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group half-width">
              <label className="form-label" htmlFor="expense-amount">
                סכום
              </label>
              <input
                id="expense-amount"
                type="number"
                min="0.01"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="form-group half-width">
              <label className="form-label" htmlFor="expense-date">
                תאריך
              </label>
              <input
                id="expense-date"
                type="date"
                className="form-input"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half-width">
              <label className="form-label" htmlFor="expense-payer">
                מי שילם?
              </label>
              <select
                id="expense-payer"
                className="form-select"
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
              >
                <option value={user?.id}>אני</option>
                {roommates
                  .filter((r) => r.id !== user?.id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group half-width">
              <label className="form-label" htmlFor="expense-category">
                קטגוריה
              </label>
              <select
                id="expense-category"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="recurring-row" htmlFor="expense-recurring">
            <input
              id="expense-recurring"
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
            />
            <span className="recurring-title">הוצאה קבועה חודשית</span>
          </label>
        </div>

        <div className="split-card">
          <h2 className="split-title">אופן חלוקה</h2>
          <div className="split-method-bar" role="tablist" aria-label="אופן חלוקה">
            {SPLIT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={splitMethod === m.value}
                className={`split-method-btn ${
                  splitMethod === m.value ? 'active' : ''
                }`}
                onClick={() => handleSplitMethodChange(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <h2 className="split-title">משתתפים</h2>
          <div className="split-list">
            {roommates.map((rm) => (
              <div key={rm.id} className="split-row-block">
                <div
                  className="split-row"
                  onClick={() => toggleRoommate(rm.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleRoommate(rm.id);
                    }
                  }}
                  role="checkbox"
                  aria-checked={rm.checked}
                  tabIndex={0}
                >
                  <span className="split-name">{rm.name}</span>
                  <div className="split-controls">
                    <span className="split-preview">
                      ₪{(previewMap[rm.id] || 0).toFixed(2)}
                    </span>
                    <div
                      className={`split-checkbox ${rm.checked ? 'checked' : ''}`}
                      aria-hidden="true"
                    >
                      {rm.checked && '✓'}
                    </div>
                  </div>
                </div>

                {rm.checked && splitMethod === 'percent' && (
                  <div
                    className="split-input-row"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="split-input-label" htmlFor={`pct-${rm.id}`}>
                      אחוז
                    </label>
                    <input
                      id={`pct-${rm.id}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="split-field-input"
                      value={rm.percent}
                      onChange={(e) =>
                        updateRoommateField(rm.id, 'percent', e.target.value)
                      }
                    />
                    <span className="split-input-suffix">%</span>
                  </div>
                )}

                {rm.checked && splitMethod === 'fixed' && (
                  <div
                    className="split-input-row"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="split-input-label" htmlFor={`fix-${rm.id}`}>
                      סכום
                    </label>
                    <input
                      id={`fix-${rm.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      className="split-field-input"
                      value={rm.fixed}
                      onChange={(e) =>
                        updateRoommateField(rm.id, 'fixed', e.target.value)
                      }
                    />
                    <span className="split-input-suffix">₪</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="split-footer-info">{splitHint}</div>
        </div>

        <button type="submit" className="save-expense-btn" disabled={loading}>
          {loading ? 'שומר...' : 'שמור הוצאה'}
        </button>
      </form>

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        duration={toast.type === 'success' ? SUCCESS_TOAST_MS : 3500}
        onClose={handleToastClose}
      />
    </div>
  );
}
