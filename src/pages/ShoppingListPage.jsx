import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './ShoppingListPage.css';

export default function ShoppingListPage() {
  const { user, apartmentId } = useAuth();
  const [todoItems, setTodoItems] = useState([]);
  const [doneItems, setDoneItems] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    if (!apartmentId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data } = await supabase
        .from('shopping_items')
        .select('id, name, is_done, added_by, created_at')
        .eq('apartment_id', apartmentId)
        .order('created_at', { ascending: true });
      
      const items = data || [];
      setTodoItems(items.filter(i => !i.is_done));
      setDoneItems(items.filter(i => i.is_done));
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [apartmentId]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    try {
      const { error } = await supabase
        .from('shopping_items')
        .insert({
          apartment_id: apartmentId,
          name: inputVal.trim(),
          is_done: false,
          added_by: user.id
        });
      if (error) throw error;
      setInputVal('');
      fetchItems();
    } catch (err) {
      alert('שגיאה בהוספת פריט: ' + err.message);
    }
  };

  const handleCheckItem = async (id) => {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({ is_done: true })
        .eq('id', id);
      if (error) throw error;
      fetchItems();
    } catch (err) {
      alert('שגיאה בעדכון פריט: ' + err.message);
    }
  };

  const handleUncheckItem = async (id) => {
    try {
      const { error } = await supabase
        .from('shopping_items')
        .update({ is_done: false })
        .eq('id', id);
      if (error) throw error;
      fetchItems();
    } catch (err) {
      alert('שגיאה בעדכון פריט: ' + err.message);
    }
  };

  if (loading) return (
    <div className="shopping-container">
      <div className="shopping-loading">טוען רשימה...</div>
    </div>
  );

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

      {todoItems.length === 0 && doneItems.length === 0 ? (
        <div className="shopping-empty-state">
          <div className="empty-icon">🛒</div>
          <div className="empty-title">הרשימה ריקה!</div>
          <div className="empty-subtitle">
            הוסיפו פריטים חדשים למעלה
          </div>
        </div>
      ) : (
        <>
          {/* 3. Section: Need to Buy */}
          <div className="shopping-section">
            <h2 className="section-subtitle">צריך לקנות ({todoItems.length})</h2>
            <div className="items-list">
              {todoItems.map((item) => (
                <div key={item.id} className="todo-item-card">
                  {/* Right side: Item Details */}
                  <div className="item-details">
                    <div className="item-name-todo">{item.name}</div>
                    <div className="item-added-by">נוסף על ידי {item.added_by === user?.id ? 'אני' : 'שותף'}</div>
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
        </>
      )}
    </div>
  );
}
