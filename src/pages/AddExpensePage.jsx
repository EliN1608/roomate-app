import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toLocalDateString } from '../lib/dates';
import { applyEqualSplitBalance } from '../lib/expenseBalances';
import Toast from '../components/Toast/Toast';
import './AddExpensePage.css';

const SUCCESS_TOAST_MS = 2200;

export default function AddExpensePage() {
  const navigate = useNavigate();
  const { user, apartmentId } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState(user?.id || '');
  const [roommates, setRoommates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', type: 'success' });
  const navigateAfterClose = useRef(false);

  const showToast = (message, type = 'success') => {
    setToast({ open: true, message, type });
  };

  const handleToastClose = () => {
    setToast((prev) => ({ ...prev, open: false }));
    if (navigateAfterClose.current) {
      navigateAfterClose.current = false;
      navigate('/expenses');
    }
  };

  useEffect(() => {
    if (user?.id) {
      setPayer(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (!apartmentId) return;
    const fetchMembers = async () => {
      try {
        // 1. Use RPC to get all apartment members
        const { data: membersData } = await supabase
          .rpc('get_apartment_members', { apt_id: apartmentId });

        if (!membersData) return;

        // 2. Fetch profiles for those user_ids
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        // 3. Merge profiles
        const profileMap = {};
        (profilesData || []).forEach(p => {
          profileMap[p.user_id] = p.full_name;
        });

        // 4. Set roommates with real names
        const checkedCount = membersData.length;
        setRoommates(membersData.map(m => ({
          id: m.user_id,
          name: m.user_id === user?.id ?
            'אני' :
            (profileMap[m.user_id] || 'שותף'),
          checked: true,
          share: `${(100 / checkedCount).toFixed(1)}%`
        })));
      } catch (err) {
        console.error('Error fetching members:', err);
      }
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
      showToast('נא למלא את כל השדות', 'error');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showToast('הסכום חייב להיות מספר גדול מ-0', 'error');
      return;
    }

    const checkedRoommates = roommates.filter(r => r.checked);
    if (checkedRoommates.length === 0) {
      showToast('נא לבחור לפחות שותף אחד לחלוקה', 'error');
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
          amount: parsedAmount,
          date: toLocalDateString()
        });

      if (expenseError) throw expenseError;

      // 2. Update balances: debtors -, payer + (dashboard: + means owed to you)
      await applyEqualSplitBalance(
        supabase,
        apartmentId,
        checkedRoommates.map((r) => r.id),
        payer,
        parsedAmount,
        1
      );

      navigateAfterClose.current = true;
      showToast('ההוצאה נוספה בהצלחה', 'success');
      // Keep loading true so the form can't double-submit before navigate
    } catch (err) {
      navigateAfterClose.current = false;
      showToast('שגיאה בשמירת הוצאה: ' + err.message, 'error');
      setLoading(false);
    }
  };

  return (
    <div className="add-expense-container" id="add-expense-page">
      <div className="expense-header">
        <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="חזור">
          ←
        </button>
        <h1 className="expense-title">הוספת הוצאה</h1>
        <div style={{ width: '24px' }}></div>
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
                      {r.name}
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

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        duration={toast.type === 'success' ? SUCCESS_TOAST_MS : 3500}
        onClose={handleToastClose}
      />
    </div>
  );
}
