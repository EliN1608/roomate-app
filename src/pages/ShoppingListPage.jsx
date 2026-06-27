import React, { useState } from 'react';
import './ShoppingListPage.css';

export default function ShoppingListPage() {
  const [todoItems, setTodoItems] = useState([
    { id: 1, name: 'חלב', addedBy: 'מיכל' },
    { id: 2, name: 'נייר טואלט', addedBy: 'דניאל' },
    { id: 3, name: 'סבון כלים', addedBy: 'יואב' }
  ]);

  const [doneItems, setDoneItems] = useState([
    { id: 4, name: 'קפה' },
    { id: 5, name: 'לחם' }
  ]);

  const [inputVal, setInputVal] = useState('');

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    setTodoItems([
      ...todoItems,
      { id: Date.now(), name: inputVal.trim(), addedBy: 'אני' }
    ]);
    setInputVal('');
  };

  const handleCheckItem = (id) => {
    const item = todoItems.find(i => i.id === id);
    if (!item) return;
    setTodoItems(todoItems.filter(i => i.id !== id));
    setDoneItems([...doneItems, { id: item.id, name: item.name }]);
  };

  const handleUncheckItem = (id) => {
    const item = doneItems.find(i => i.id === id);
    if (!item) return;
    setDoneItems(doneItems.filter(i => i.id !== id));
    setTodoItems([...todoItems, { id: item.id, name: item.name, addedBy: 'אני' }]);
  };

  return (
    <div className="shopping-container" id="shopping-page">
      {/* 1. Page Title */}
      <h1 className="shopping-title">רשימת קניות</h1>

      {/* 2. Add Item Bar */}
      <form className="add-item-bar" onSubmit={handleAddItem}>
        <input
          type="text"
          className="add-item-input"
          placeholder="למשל: חלב, ביצים..."
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
        />
        <button type="submit" className="add-item-btn">הוסף</button>
      </form>

      {/* 3. Section: Need to Buy */}
      <div className="shopping-section">
        <h2 className="section-subtitle">צריך לקנות ({todoItems.length})</h2>
        <div className="items-list">
          {todoItems.map((item) => (
            <div key={item.id} className="todo-item-card">
              {/* Right side: Item Details */}
              <div className="item-details">
                <div className="item-name-todo">{item.name}</div>
                <div className="item-added-by">נוסף על ידי {item.addedBy}</div>
              </div>

              {/* Left side: Lime Checkbox Button */}
              <button 
                type="button" 
                className="checkbox-btn-unchecked" 
                onClick={() => handleCheckItem(item.id)}
                aria-label="סמן כנקנה"
              />

              {/* Far left side: Drag Dots */}
              <div className="drag-dots" aria-hidden="true">⠿</div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Section: Already Bought */}
      <div className="shopping-section">
        <h2 className="section-subtitle">כבר נקנה ({doneItems.length})</h2>
        <div className="items-list">
          {doneItems.map((item) => (
            <div key={item.id} className="done-item-card">
              {/* Details with strikethrough and muted color */}
              <div className="item-details">
                <div className="item-name-done">{item.name}</div>
              </div>

              {/* Checked Checkbox Button */}
              <button 
                type="button" 
                className="checkbox-btn-checked" 
                onClick={() => handleUncheckItem(item.id)}
                aria-label="בטל סימון כנקנה"
              >
                ✓
              </button>

              {/* Muted Drag Dots */}
              <div className="drag-dots done-drag" aria-hidden="true">⠿</div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Dashed Card at Bottom */}
      <button 
        type="button" 
        className="dashed-regular-items-btn" 
        onClick={() => alert('הוספת פריטים קבועים...')}
      >
        <span className="dashed-btn-content">
          הוספת פריטים קבועים
          <span className="refresh-icon">↻</span>
        </span>
      </button>
    </div>
  );
}
