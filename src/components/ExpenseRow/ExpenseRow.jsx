import React from 'react';

export default function ExpenseRow({ item, amount, category, date, ...props }) {
  return (
    <div className="expense-row" {...props}>
      <span className="expense-item">{item || 'Expense Item'}</span>
      <span className="expense-amount">{amount || '$0.00'}</span>
      <span className="expense-category">{category || 'General'}</span>
      <span className="expense-date">{date || 'Today'}</span>
    </div>
  );
}
