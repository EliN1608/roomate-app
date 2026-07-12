import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { firstDayOfLocalMonth, formatLocalDate } from '../lib/dates';
import './DashboardPage.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, apartmentId } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [balance, setBalance] = useState(0);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [totalMonth, setTotalMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch last 3 expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('id, description, amount, date, paid_by')
        .eq('apartment_id', apartmentId)
        .order('date', { ascending: false })
        .limit(3);
      
      setExpenses(expensesData || []);

      // 2. Calculate total this month
      const firstDay = firstDayOfLocalMonth();
      
      const { data: monthExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('apartment_id', apartmentId)
        .gte('date', firstDay);
      
      const total = (monthExpenses || [])
        .reduce((sum, e) => sum + Number(e.amount), 0);
      setTotalMonth(total);

      // 3. Fetch user balance
      const { data: balanceData } = await supabase
        .from('balances')
        .select('amount')
        .eq('apartment_id', apartmentId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      setBalance(balanceData?.amount || 0);

      // 4. Count shopping items not yet bought
      const { count } = await supabase
        .from('shopping_items')
        .select('id', { count: 'exact' })
        .eq('apartment_id', apartmentId)
        .eq('is_done', false);
      
      setShoppingCount(count || 0);
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!apartmentId) {
      setLoading(false);
      return;
    }
    fetchDashboardData();
  }, [apartmentId]);

  if (loading) {
    return <div className="dashboard-loading">טוען נתונים...</div>;
  }

  return (
    <div className="dashboard-container" id="dashboard-page">
      {/* 1. Balance Card (full width, black background) */}
      <div className="balance-card">
        <div className="balance-label">מאזן הדירה שלך</div>
        <div 
          className="balance-title"
          style={{ color: balance > 0 ? 'var(--success)' : balance < 0 ? 'var(--error)' : 'var(--text-on-dark)' }}
        >
          יתרה: {balance >= 0 ? '+' : ''}₪{Math.abs(balance).toFixed(2)}
        </div>
        <div className="balance-subtitle">
          {balance > 0 ? 'השותפים חייבים לך' : balance < 0 ? 'אתה חייב לשותפים' : 'המאזן מאוזן ✓'}
        </div>
        <div className="balance-update-time" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 'var(--spacing-sm)' }}>
          עודכן לאחרונה: {lastUpdated.toLocaleTimeString('he-IL')}
        </div>
        <button className="balance-btn" onClick={() => alert('הסדרת תשלום')}>הסדרת תשלום</button>
      </div>

      {/* 2. Two Metric Cards (side by side, white bg, black border) */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-label">סה״כ החודש</div>
          <div className="metric-value">₪{totalMonth.toLocaleString()}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">פריטים לקנייה</div>
          <div className="metric-value">{shoppingCount}</div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="quick-actions-row">
        <button 
          className="quick-action-btn"
          onClick={() => navigate('/expenses/add')}
        >
          <span className="quick-action-icon">💸</span>
          <span className="quick-action-label">הוסף הוצאה</span>
        </button>
        <button 
          className="quick-action-btn"
          onClick={() => navigate('/shopping')}
        >
          <span className="quick-action-icon">🛒</span>
          <span className="quick-action-label">רשימת קניות</span>
        </button>
        <button 
          className="quick-action-btn"
          onClick={() => navigate('/profile')}
        >
          <span className="quick-action-icon">👥</span>
          <span className="quick-action-label">שותפים</span>
        </button>
      </div>

      {/* 3. Recent Expenses Section */}
      <div className="expenses-section">
        <div className="section-header">
          <h2 className="section-title">הוצאות אחרונות</h2>
          <Link to="/expenses" className="view-all-link">צפה בהכל</Link>
        </div>

        <div className="expenses-list">
          {expenses.length === 0 ? (
            <div className="dashboard-empty">אין הוצאות עדיין</div>
          ) : (
            expenses.map((exp) => (
              <div key={exp.id} className="expense-row-card">
                {/* Icon square with lime bg on the right (start) */}
                <div className="expense-icon-square">💰</div>
                
                {/* Name & Date in the middle */}
                <div className="expense-info">
                  <div className="expense-name">{exp.description}</div>
                  <div className="expense-date">
                    {formatLocalDate(exp.date)}
                  </div>
                </div>

                {/* Amount and Paid By on the left (end) */}
                <div className="expense-right">
                  <div className="expense-amount">₪{Number(exp.amount).toFixed(2)}</div>
                  <div className={`expense-paid-by ${exp.paid_by === user?.id ? 'paid-by-me' : 'paid-by-other'}`}>
                    {exp.paid_by === user?.id ? 'שילמתי אני' : 'שילם שותף'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Full Width CTA Button */}
      <Link to="/expenses/add" className="cta-button-link">
        + הוסף הוצאה חדשה
      </Link>
    </div>
  );
}
