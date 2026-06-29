import React, { useState } from 'react';
import './ExpensesHistoryPage.css';

export default function ExpensesHistoryPage() {
  const [filter, setFilter] = useState('all'); // 'all' | 'paid' | 'owed'

  const expensesData = [
    { id: 1, icon: '🛒', name: 'סופרמרקט שבועי', date: '28.06.2026', amount: '240.50', paidBy: 'אני' },
    { id: 2, icon: '⚡', name: 'חשבון חשמל', date: '25.06.2026', amount: '350.00', paidBy: 'מיכל לוי' },
    { id: 3, icon: '📡', name: 'אינטרנט וטלוויזיה', date: '20.06.2026', amount: '120.00', paidBy: 'אני' },
    { id: 4, icon: '🧹', name: 'חומרי ניקוי', date: '18.06.2026', amount: '45.80', paidBy: 'דניאל כץ' },
    { id: 5, icon: '💧', name: 'חשבון מים', date: '15.06.2026', amount: '90.20', paidBy: 'אני' },
    { id: 6, icon: '🥬', name: 'ירקניה', date: '10.06.2026', amount: '65.00', paidBy: 'מיכל לוי' }
  ];

  // Filter logic
  // 'paid' -> Paid by 'אני'
  // 'owed' -> Paid by others (which means others paid and I owe them, or vice versa depending on phrasing)
  const filteredExpenses = expensesData.filter(exp => {
    if (filter === 'paid') return exp.paidBy === 'אני';
    if (filter === 'owed') return exp.paidBy !== 'אני';
    return true;
  });

  // Calculate sum of currently filtered expenses
  const totalSum = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toFixed(2);

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
          חייב לי
        </button>
      </div>

      {/* Total sum section header */}
      <div className="total-header">
        <span className="total-label">סה״כ:</span>
        <span className="total-amount">₪{totalSum}</span>
      </div>

      {/* Expenses List */}
      <div className="expenses-list">
        {filteredExpenses.map((exp) => (
          <div key={exp.id} className="expense-row-card">
            {/* Right: icon in square */}
            <div className="expense-icon-square">
              {exp.icon}
            </div>

            {/* Middle: expense name + paidBy */}
            <div className="expense-info">
              <div className="expense-name">{exp.name}</div>
              <div className="expense-payer">שילם: {exp.paidBy}</div>
            </div>

            {/* Left: amount in mono font, date below */}
            <div className="expense-meta">
              <div className="expense-amount">₪{exp.amount}</div>
              <div className="expense-date">{exp.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
