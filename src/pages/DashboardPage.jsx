import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { firstDayOfLocalMonth, formatLocalDate } from '../lib/dates';
import { EPS, buildRoommateCardsFromBalances } from '../lib/balances';
import './DashboardPage.css';

function formatBalanceHeadline(balance) {
  const abs = Math.abs(Number(balance) || 0);
  if (abs < EPS) return { text: 'יתרה: ₪0.00', tone: 'neutral', subtitle: 'המאזן מאוזן ✓' };
  if (balance > 0) {
    return {
      text: `חייבים לך ₪${abs.toFixed(2)}`,
      tone: 'positive',
      subtitle: 'לפי חלוקה בין השותפים',
    };
  }
  return {
    text: `אתה חייב ₪${abs.toFixed(2)}`,
    tone: 'negative',
    subtitle: 'לפי חלוקה בין השותפים',
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, apartmentId } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [balance, setBalance] = useState(0);
  const [roommateCards, setRoommateCards] = useState([]);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [totalMonth, setTotalMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [settleOpen, setSettleOpen] = useState(false);
  const [settlePartnerId, setSettlePartnerId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleError, setSettleError] = useState('');
  const [settleSaving, setSettleSaving] = useState(false);

  const applyBalanceDelta = async (userId, delta) => {
    const { data: existing, error: selectError } = await supabase
      .from('balances')
      .select('id, amount')
      .eq('apartment_id', apartmentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      const { error } = await supabase
        .from('balances')
        .update({
          amount: Number(existing.amount) + delta,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('balances')
        .insert({
          apartment_id: apartmentId,
          user_id: userId,
          amount: delta,
        });
      if (error) throw error;
    }
  };

  const fetchApartmentBalances = async () => {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_apartment_balances',
      { apt_id: apartmentId }
    );

    if (!rpcError && rpcData) {
      const map = {};
      rpcData.forEach((row) => {
        map[row.user_id] = Number(row.amount) || 0;
      });
      return map;
    }

    // Fallback: direct select (may only return own row under RLS)
    const { data: rows } = await supabase
      .from('balances')
      .select('user_id, amount')
      .eq('apartment_id', apartmentId);

    const map = {};
    (rows || []).forEach((row) => {
      map[row.user_id] = Number(row.amount) || 0;
    });

    if (map[user.id] === undefined) {
      const { data: own } = await supabase
        .from('balances')
        .select('amount')
        .eq('apartment_id', apartmentId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (own) map[user.id] = Number(own.amount) || 0;
    }

    return map;
  };

  const fetchApartmentProfiles = async (userIds) => {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_apartment_profiles',
      { apt_id: apartmentId }
    );

    if (!rpcError && rpcData) {
      const map = {};
      rpcData.forEach((p) => {
        map[p.user_id] = p.full_name;
      });
      return map;
    }

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in(
        'user_id',
        userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']
      );

    const map = {};
    (profilesData || []).forEach((p) => {
      map[p.user_id] = p.full_name;
    });
    return map;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { data: membersData } = await supabase.rpc('get_apartment_members', {
        apt_id: apartmentId,
      });
      const memberRows = membersData || [];
      const userIds = memberRows.map((m) => m.user_id);
      const profileMap = await fetchApartmentProfiles(userIds);

      const members = memberRows.map((m, idx) => ({
        user_id: m.user_id,
        name:
          m.user_id === user.id
            ? 'אני'
            : profileMap[m.user_id] || `שותף ${idx + 1}`,
      }));

      const firstDay = firstDayOfLocalMonth();
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('id, description, amount, date, paid_by')
        .eq('apartment_id', apartmentId)
        .order('date', { ascending: false })
        .limit(3);
      setExpenses(expensesData || []);

      const { data: monthExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('apartment_id', apartmentId)
        .gte('date', firstDay);
      const total = (monthExpenses || []).reduce(
        (sum, e) => sum + Number(e.amount),
        0
      );
      setTotalMonth(total);

      // Single source of truth: balances table (via SECURITY DEFINER RPC)
      const balancesByUser = await fetchApartmentBalances();
      const myBalance = Number(balancesByUser[user.id] || 0);
      setBalance(myBalance);
      setRoommateCards(
        buildRoommateCardsFromBalances(user.id, balancesByUser, members)
      );

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
    if (!apartmentId || !user?.id) {
      setLoading(false);
      return;
    }
    fetchDashboardData();
  }, [apartmentId, user?.id]);

  const openSettleModal = () => {
    const firstOpen = roommateCards.find((c) => c.relation !== 'settled');
    setSettlePartnerId(firstOpen?.id || roommateCards[0]?.id || '');
    setSettleAmount(firstOpen ? firstOpen.amount.toFixed(2) : '');
    setSettleError('');
    setSettleOpen(true);
  };

  const selectedCard = roommateCards.find((c) => c.id === settlePartnerId);

  const handleSettlePartnerChange = (id) => {
    setSettlePartnerId(id);
    const card = roommateCards.find((c) => c.id === id);
    if (card && card.relation !== 'settled') {
      setSettleAmount(card.amount.toFixed(2));
    } else {
      setSettleAmount('');
    }
    setSettleError('');
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    setSettleError('');

    const amount = parseFloat(settleAmount);
    if (!settlePartnerId) {
      setSettleError('נא לבחור שותף');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setSettleError('נא להזין סכום חיובי');
      return;
    }

    const card = roommateCards.find((c) => c.id === settlePartnerId);
    if (!card || card.relation === 'settled') {
      setSettleError('אין חוב פתוח מול השותף שנבחר');
      return;
    }
    if (amount - card.amount > EPS) {
      setSettleError(`הסכום גדול מהחוב (₪${card.amount.toFixed(2)})`);
      return;
    }

    try {
      setSettleSaving(true);

      // Best-effort audit row (cards use balances as source of truth)
      const fromUser = card.relation === 'owes_me' ? settlePartnerId : user.id;
      const toUser = card.relation === 'owes_me' ? user.id : settlePartnerId;
      await supabase.from('settlements').insert({
        apartment_id: apartmentId,
        from_user: fromUser,
        to_user: toUser,
        amount,
      });

      if (card.relation === 'owes_me') {
        await applyBalanceDelta(user.id, -amount);
        await applyBalanceDelta(settlePartnerId, amount);
      } else {
        await applyBalanceDelta(user.id, amount);
        await applyBalanceDelta(settlePartnerId, -amount);
      }

      setSettleOpen(false);
      await fetchDashboardData();
    } catch (err) {
      setSettleError(err.message || 'שגיאה בהסדרת התשלום');
    } finally {
      setSettleSaving(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">טוען נתונים...</div>;
  }

  const headline = formatBalanceHeadline(balance);
  const openDebts = roommateCards.filter((c) => c.relation !== 'settled');

  return (
    <div className="dashboard-container" id="dashboard-page">
      <div className="balance-card">
        <div className="balance-label">מאזן הדירה שלך</div>
        <div className={`balance-title balance-title-${headline.tone}`}>
          {headline.text}
        </div>
        <div className="balance-subtitle">{headline.subtitle}</div>
        <div className="balance-update-time">
          עודכן לאחרונה: {lastUpdated.toLocaleTimeString('he-IL')}
        </div>

        <div className="balance-people-grid">
          {roommateCards.length === 0 ? (
            <div className="balance-people-empty">אין שותפים נוספים בדירה עדיין</div>
          ) : (
            roommateCards.map((card) => (
              <div
                key={card.id}
                className={`balance-person-card relation-${card.relation}`}
              >
                <div className="balance-person-name">{card.name}</div>
                <div className="balance-person-amount">
                  {card.relation === 'settled'
                    ? '₪0.00'
                    : `₪${card.amount.toFixed(2)}`}
                </div>
                <div className="balance-person-relation">
                  {card.relation === 'owes_me' && 'חייב/ת לך'}
                  {card.relation === 'i_owe' && `אתה חייב ל-${card.name}`}
                  {card.relation === 'settled' && 'מאוזנים'}
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          className="balance-btn"
          onClick={openSettleModal}
          disabled={openDebts.length === 0}
        >
          הסדרת תשלום
        </button>
      </div>

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
                <div className="expense-icon-square">💰</div>
                <div className="expense-info">
                  <div className="expense-name">{exp.description}</div>
                  <div className="expense-date">{formatLocalDate(exp.date)}</div>
                </div>
                <div className="expense-right">
                  <div className="expense-amount">₪{Number(exp.amount).toFixed(2)}</div>
                  <div
                    className={`expense-paid-by ${
                      exp.paid_by === user?.id ? 'paid-by-me' : 'paid-by-other'
                    }`}
                  >
                    {exp.paid_by === user?.id ? 'שילמתי אני' : 'שילם שותף'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Link to="/expenses/add" className="cta-button-link">
        + הוסף הוצאה חדשה
      </Link>

      {settleOpen && (
        <div className="settle-modal-overlay" onClick={() => setSettleOpen(false)}>
          <div
            className="settle-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settle-modal-title"
          >
            <h2 id="settle-modal-title" className="settle-modal-title">
              הסדרת תשלום
            </h2>
            <p className="settle-modal-subtitle">
              בחרו עם מי מסדירים וכמה הוחזר — היתרה תתקזז בהתאם.
            </p>

            <form onSubmit={handleSettleSubmit} className="settle-modal-form">
              <label className="settle-field-label" htmlFor="settle-partner">
                עם מי מסדירים?
              </label>
              <select
                id="settle-partner"
                className="settle-field-input"
                value={settlePartnerId}
                onChange={(e) => handleSettlePartnerChange(e.target.value)}
              >
                {roommateCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                    {card.relation === 'owes_me'
                      ? ` — חייב/ת לך ₪${card.amount.toFixed(2)}`
                      : card.relation === 'i_owe'
                        ? ` — אתה חייב ₪${card.amount.toFixed(2)}`
                        : ' — מאוזנים'}
                  </option>
                ))}
              </select>

              {selectedCard && selectedCard.relation !== 'settled' && (
                <div className="settle-hint">
                  {selectedCard.relation === 'owes_me'
                    ? `${selectedCard.name} מחזיר/ה לך`
                    : `אתה מחזיר ל-${selectedCard.name}`}
                </div>
              )}

              <label className="settle-field-label" htmlFor="settle-amount">
                סכום שהוחזר (₪)
              </label>
              <input
                id="settle-amount"
                type="number"
                min="0.01"
                step="0.01"
                className="settle-field-input"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                placeholder="0.00"
              />

              {settleError && <div className="settle-error">{settleError}</div>}

              <div className="settle-modal-actions">
                <button
                  type="submit"
                  className="settle-save-btn"
                  disabled={settleSaving || openDebts.length === 0}
                >
                  {settleSaving ? 'מעדכן...' : 'אישור קיזוז'}
                </button>
                <button
                  type="button"
                  className="settle-cancel-btn"
                  onClick={() => setSettleOpen(false)}
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
