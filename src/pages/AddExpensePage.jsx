import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddExpensePage.css';

export default function AddExpensePage() {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('אני');

  const [roommates, setRoommates] = useState([
    { id: 1, name: 'ג׳יין סמית׳', checked: true, share: '33.3%' },
    { id: 2, name: 'רוברט צ׳ן', checked: true, share: '33.3%' },
    { id: 3, name: 'אני (ג׳ון דו)', checked: true, share: '33.4%' }
  ]);

  const toggleRoommate = (id) => {
    setRoommates(roommates.map(rm => 
      rm.id === id ? { ...rm, checked: !rm.checked } : rm
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim() || !amount.trim()) {
      alert('נא למלא את כל השדות');
      return;
    }
    alert(`ההוצאה "${description}" על סך ₪${amount} נשמרה בהצלחה!`);
    navigate('/dashboard');
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
                <option value="אני">אני</option>
                <option value="ג׳יין סמית׳">ג׳יין סמית׳</option>
                <option value="רוברט צ׳ן">רוברט צ׳ן</option>
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
        <button type="submit" className="save-expense-btn">
          שמור הוצאה
        </button>
      </form>
    </div>
  );
}
