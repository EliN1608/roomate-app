import React from 'react';
import { Link } from 'react-router-dom';
import './DashboardPage.css';

export default function DashboardPage() {
  const expenses = [
    { id: 1, amount: '₪85.40', name: 'Whole Foods - מצרכים', date: '14.03.2024', icon: '🛒' },
    { id: 2, amount: '₪142.00', name: 'חשבון חשמל - ינואר', date: '10.03.2024', icon: '⚡' },
    { id: 3, amount: '₪60.00', name: 'שירותי אינטרנט', date: '05.03.2024', icon: '📡' }
  ];

  return (
    <div className="dashboard-container" id="dashboard-page">
      {/* 1. Balance Card (full width, black background) */}
      <div className="balance-card">
        <div className="balance-label">מאזן הדירה שלך</div>
        <div className="balance-title">יתרה: -₪180</div>
        <div className="balance-subtitle">עודכן לאחרונה: לפני 2 דקות</div>
        <button className="balance-btn" onClick={() => alert('הסדרת תשלום')}>הסדרת תשלום</button>
      </div>

      {/* 2. Two Metric Cards (side by side, white bg, black border) */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-label">סה״כ החודש</div>
          <div className="metric-value">₪1,240</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">פריטים לקנייה</div>
          <div className="metric-value">05</div>
        </div>
      </div>

      {/* 3. Recent Expenses Section */}
      <div className="expenses-section">
        <div className="section-header">
          <h2 className="section-title">הוצאות אחרונות</h2>
          <Link to="/expenses" className="view-all-link">צפה בהכל</Link>
        </div>

        <div className="expenses-list">
          {expenses.map((exp) => (
            <div key={exp.id} className="expense-row-card">
              {/* Icon square with lime bg on the right (start) */}
              <div className="expense-icon-square">{exp.icon}</div>
              
              {/* Name & Date in the middle */}
              <div className="expense-info">
                <div className="expense-name">{exp.name}</div>
                <div className="expense-date">{exp.date}</div>
              </div>

              {/* Amount on the left (end) */}
              <div className="expense-amount">{exp.amount}</div>
            </div>
          ))}
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
