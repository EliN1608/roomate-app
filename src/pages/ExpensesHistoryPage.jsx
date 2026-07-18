import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatLocalDate } from '../lib/dates';
import './ExpensesHistoryPage.css';

/** @typedef {'all' | 'mine' | 'others'} ExpenseFilter */

export default function ExpensesHistoryPage() {
  const navigate = useNavigate();
  const { user, apartmentId } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(/** @type {ExpenseFilter} */ ('all'));
  const [fetchError, setFetchError] = useState('');

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

      // Filter by who paid (expenses.paid_by)
      if (filter === 'mine') {
        query = query.eq('paid_by', user.id);
      } else if (filter === 'others') {
        query = query.neq('paid_by', user.id);
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
    fetchExpenses();
  }, [apartmentId, user?.id, filter]);

  const totalSum = expenses
    .reduce((sum, exp) => sum + Number(exp.amount), 0)
    .toFixed(2);

  const emptyMessage =
    filter === 'mine'
      ? 'אין הוצאות ששילמת עליהן'
      : filter === 'others'
        ? 'אין הוצאות ששילמו שותפים'
        : 'אין הוצאות עדיין';

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
          שולם על ידי
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'others'}
          className={`filter-btn ${filter === 'others' ? 'active' : ''}`}
          onClick={() => setFilter('others')}
        >
          שולם ע״י אחרים
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
        <div className="expenses-list">
          {expenses.map((exp) => (
            <div key={exp.id} className="expense-row-card">
              <div className="expense-icon-square">💰</div>

              <div className="expense-info">
                <div className="expense-name">{exp.description}</div>
                <div className="expense-payer">
                  {exp.paid_by === user?.id ? 'שילמתי אני' : 'שילם שותף'}
                </div>
              </div>

              <div className="expense-meta">
                <div className="expense-amount">₪{Number(exp.amount).toFixed(2)}</div>
                <div className="expense-date">{formatLocalDate(exp.date)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="add-expense-cta"
        onClick={() => navigate('/expenses/add')}
      >
        + הוסף הוצאה חדשה
      </button>
    </div>
  );
}
