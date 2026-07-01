import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './ExpensesHistoryPage.css';

export default function ExpensesHistoryPage() {
  const navigate = useNavigate();
  const { user, apartmentId } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'paid' | 'owed'

  const fetchExpenses = async () => {
    if (!apartmentId) return;
    try {
      setLoading(true);
      let query = supabase
        .from('expenses')
        .select('id, description, amount, date, paid_by')
        .eq('apartment_id', apartmentId)
        .order('date', { ascending: false });
      
      if (filter === 'paid') {
        query = query.eq('paid_by', user.id);
      } else if (filter === 'owed') {
        query = query.neq('paid_by', user.id);
      }
      
      const { data } = await query;
      setExpenses(data || []);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [apartmentId, filter]);

  const totalSum = expenses
    .reduce((sum, exp) => sum + Number(exp.amount), 0)
    .toFixed(2);

  if (loading) return (
    <div className="expenses-history-container">
      <div className="history-loading">טוען הוצאות...</div>
    </div>
  );

  return (
    <div className="expenses-history-container" id="expenses-history-page">
      <h1 className="history-title">היסטוריית הוצאות</h1>

      {/* Filter Bar */}
      <div className="filter-bar">
        <button
          type="button"
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          הכל
        </button>
        <button
          type="button"
          className={`filter-btn ${filter === 'paid' ? 'active' : ''}`}
          onClick={() => setFilter('paid')}
        >
          שילמתי
        </button>
        <button
          type="button"
          className={`filter-btn ${filter === 'owed' ? 'active' : ''}`}
          onClick={() => setFilter('owed')}
        >
          حייב לי
        </button>
      </div>

      {/* Total sum section header */}
      <div className="total-header">
        <span className="total-label">סה״כ:</span>
        <span className="total-amount">₪{totalSum}</span>
      </div>

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <div className="history-empty">אין הוצאות עדיין</div>
      ) : (
        <div className="expenses-list">
          {expenses.map((exp) => (
            <div key={exp.id} className="expense-row-card">
              {/* Right: icon in square */}
              <div className="expense-icon-square">
                💰
              </div>

              {/* Middle: expense name + paidBy */}
              <div className="expense-info">
                <div className="expense-name">{exp.description}</div>
                <div className="expense-payer">{exp.paid_by === user?.id ? 'שילמתי אני' : 'שילם שותף'}</div>
              </div>

              {/* Left: amount in mono font, date below */}
              <div className="expense-meta">
                <div className="expense-amount">₪{Number(exp.amount).toFixed(2)}</div>
                <div className="expense-date">{new Date(exp.date).toLocaleDateString('he-IL')}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom CTA Button */}
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
