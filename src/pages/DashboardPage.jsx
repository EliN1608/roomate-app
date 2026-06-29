import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user, apartmentId } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [balance, setBalance] = useState(0);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [totalMonth, setTotalMonth] = useState(0);
  const [loading, setLoading] = useState(true);

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
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0];
      
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
        .single();
      
      setBalance(balanceData?.amount || 0);

      // 4. Count shopping items not yet bought
      const { count } = await supabase
        .from('shopping_items')
        .select('id', { count: 'exact' })
        .eq('apartment_id', apartmentId)
        .eq('is_done', false);
      
      setShoppingCount(count || 0);

    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!apartmentId) return;
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
        <div className="balance-title">יתרה: {balance >= 0 ? '+' : ''}₪{balance}</div>
        <div className="balance-subtitle">עודכן לאחרונה: לפני 2 דקות</div>
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
                    {new Date(exp.date).toLocaleDateString('he-IL')}
                  </div>
                </div>

                {/* Amount on the left (end) */}
                <div className="expense-amount">₪{Number(exp.amount).toFixed(2)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Full Width CTA Button */}
      <Link to="/expenses/add" className="cta-button-link">
        + הוסף הוצאה חדשה
      </Link>

      {/* 5. Dashed Widget Placeholder */}
      <div className="dashed-widget">
        <span className="dashed-widget-text">הוסף ווידג׳ט מותאם אישית</span>
      </div>
    </div>
  );
}
