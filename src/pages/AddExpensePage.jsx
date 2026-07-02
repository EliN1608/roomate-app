import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './AddExpensePage.css';

export default function AddExpensePage() {
  const navigate = useNavigate();
  const { user, apartmentId } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState(user?.id || '');
  const [roommates, setRoommates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setPayer(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (!apartmentId) return;
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('members')
        .select('user_id, role, profiles(full_name)')
        .eq('apartment_id', apartmentId);
      
      setRoommates((data || []).map(m => ({
        id: m.user_id,
        name: m.user_id === user?.id ? 
          'אני' : 
          (m.profiles?.full_name || 'שותף'),
        checked: true,
        share: data?.length ? 
          `${(100 / data.length).toFixed(1)}%` : '0%'
      })));
    };
    fetchMembers();
  }, [apartmentId]);

  const toggleRoommate = (id) => {
    const updated = roommates.map(rm => 
      rm.id === id ? { ...rm, checked: !rm.checked } : rm
    );
    const checkedCount = updated.filter(r => r.checked).length;
    setRoommates(updated.map(rm => ({
      ...rm,
      share: rm.checked && checkedCount ? `${(100 / checkedCount).toFixed(1)}%` : '0%'
    })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || !amount.trim()) {
      alert('נא למלא את כל השדות');
      return;
    }
    try {
      setLoading(true);

      // 1. Save expense to Supabase
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          apartment_id: apartmentId,
          paid_by: payer,
          description: description,
          amount: parseFloat(amount),
          date: new Date().toISOString().split('T')[0]
        });
      
      if (expenseError) throw expenseError;

      // 2. Update balances for each checked roommate
      const checkedRoommates = roommates.filter(r => r.checked);
      const shareAmount = parseFloat(amount) / checkedRoommates.length;

      for (const roommate of checkedRoommates) {
        if (roommate.id === user.id) continue;
        
        // Check if balance exists
        const { data: existingBalance } = await supabase
          .from('balances')
          .select('id, amount')
          .eq('apartment_id', apartmentId)
          .eq('user_id', roommate.id)
          .single();
        
        if (existingBalance) {
          // Update existing balance
          await supabase
            .from('balances')
            .update({ 
              amount: existingBalance.amount + shareAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingBalance.id);
        } else {
          // Create new balance
          await supabase
            .from('balances')
            .insert({
              apartment_id: apartmentId,
              user_id: roommate.id,
              amount: shareAmount
            });
        }
      }

      alert('ההוצאה נשמרה בהצלחה!');
      navigate('/expenses');

    } catch (err) {
      alert('שגיאה בשמירת הוצאה: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-expense-container" id="add-expense-page">
      {/* 1. Page Header */}
      <div className="expense-header">
        <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="חזור">
          ←
        </button>
        <h1 className="expense-title">הוספת הוצאה</h1>
        <div style={{ width: '24px' }}></div> {/* Spacer to center title */}
      </div>

      <form onSubmit={handleSubmit} className="expense-form">
        {/* 2. White Card with Form Fields */}
        <div className="form-card">
          <div className="form-group">
            <label className="form-label" htmlFor="expense-desc">תיאור הוצאה</label>
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
              <label className="form-label" htmlFor="expense-amount">סכום</label>
              <input
                id="expense-amount"
                type="number"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            
            <div className="form-group half-width">
              <label className="form-label" htmlFor="expense-payer">מי שילם?</label>
              <select
                id="expense-payer"
                className="form-select"
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
              >
                <option value={user?.id}>אני</option>
                {roommates
                  .filter(r => r.id !== user?.id)
                  .map(r => (
                    <option key={r.id} value={r.id}>
                      שותף
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* 3. Black Card "חלוקה עם" */}
        <div className="split-card">
          <h2 className="split-title">חלוקה עם:</h2>
          
          <div className="split-list">
            {roommates.map((rm) => (
              <div key={rm.id} className="split-row" onClick={() => toggleRoommate(rm.id)}>
                {/* Right side: name */}
                <span className="split-name">{rm.name}</span>
                
                {/* Left side: checkbox + percentage */}
                <div className="split-controls">
                  <span className="split-percentage">{rm.share}</span>
                  <div className={`split-checkbox ${rm.checked ? 'checked' : ''}`}>
                    {rm.checked && '✓'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="split-footer-info">
            חלוקה שווה — הסכום הכולל יחולק באופן שווה
          </div>
        </div>

        {/* 4. Full Width Lime Button */}
        <button type="submit" className="save-expense-btn" disabled={loading}>
          {loading ? 'שומר...' : 'שמור הוצאה'}
        </button>
      </form>
    </div>
  );
}
