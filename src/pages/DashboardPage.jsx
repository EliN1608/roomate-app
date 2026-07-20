import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { firstDayOfLocalMonth, formatLocalDate } from '../lib/dates';
import {
  EPS,
  computePairwiseNets,
  buildRoommateCardsFromPairwise,
  sumPairwiseBalance,
} from '../lib/balances';
import { EXPENSE_CATEGORIES } from '../lib/expenseSplits';
import { useApartmentMembers } from '../hooks/useApartmentMembers';
import { IconPlus, IconReceipt } from '../components/icons/TablerIcons';
import './DashboardPage.css';

function formatBalanceHeadline(balance) {
  const abs = Math.abs(Number(balance) || 0);
  if (abs < EPS) {
    return { text: 'יתרה: ₪0.00', tone: 'neutral' };
  }
  if (balance > 0) {
    return { text: `חייבים לך ₪${abs.toFixed(2)}`, tone: 'positive' };
  }
  return { text: `אתה חייב ₪${abs.toFixed(2)}`, tone: 'negative' };
}

function categoryLabel(value) {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label || 'אחר';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, apartmentId, apartmentName, refreshApartment } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [balance, setBalance] = useState(0);
  const [roommateCards, setRoommateCards] = useState([]);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [monthExpenseCount, setMonthExpenseCount] = useState(0);
  const [totalMonth, setTotalMonth] = useState(0);
  const [categoryBars, setCategoryBars] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [settleCard, setSettleCard] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleError, setSettleError] = useState('');
  const [settleSaving, setSettleSaving] = useState(false);

  const { members: apartmentMembers } = useApartmentMembers(apartmentId, user?.id);

  const fetchDashboardData = useCallback(async () => {
    if (!apartmentId || !user?.id) return;

    try {
      setLoading(true);

      const members = apartmentMembers.map((m) => ({
        user_id: String(m.id),
        name: m.name,
      }));

      const firstDay = firstDayOfLocalMonth();

      const loadSettlements = async () => {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_apartment_settlements',
          { apt_id: apartmentId }
        );
        if (!rpcError && rpcData) return rpcData;

        const { data: rows } = await supabase
          .from('settlements')
          .select('id, from_user, to_user, amount, created_at')
          .eq('apartment_id', apartmentId)
          .order('created_at', { ascending: true });
        return rows || [];
      };

      const [
        expensesRes,
        allExpensesRes,
        monthRes,
        settlements,
        shoppingRes,
        boughtRes,
      ] = await Promise.all([
        supabase
          .from('expenses')
          .select('id, description, amount, date, paid_by, category, created_at')
          .eq('apartment_id', apartmentId)
          .order('date', { ascending: false })
          .limit(5),
        supabase
          .from('expenses')
          .select('id, paid_by, amount, created_at, date, expense_shares(user_id, amount)')
          .eq('apartment_id', apartmentId),
        supabase
          .from('expenses')
          .select('amount, category')
          .eq('apartment_id', apartmentId)
          .gte('date', firstDay),
        loadSettlements(),
        supabase
          .from('shopping_items')
          .select('id', { count: 'exact', head: true })
          .eq('apartment_id', apartmentId)
          .eq('is_done', false),
        supabase
          .from('shopping_items')
          .select('id, name, added_by, completed_at, created_at, is_done')
          .eq('apartment_id', apartmentId)
          .eq('is_done', true)
          .order('completed_at', { ascending: false, nullsFirst: false })
          .limit(5),
      ]);

      const expensesData = expensesRes.data || [];
      setExpenses(expensesData.slice(0, 3));

      const monthExpenses = monthRes.data || [];
      setTotalMonth(
        monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
      );
      setMonthExpenseCount(monthExpenses.length);

      const byCat = {};
      monthExpenses.forEach((e) => {
        const key = e.category || 'other';
        byCat[key] = (byCat[key] || 0) + Number(e.amount);
      });
      const catEntries = Object.entries(byCat)
        .map(([key, amount]) => ({
          key,
          label: categoryLabel(key),
          amount,
        }))
        .sort((a, b) => b.amount - a.amount);
      const maxCat = catEntries[0]?.amount || 1;
      setCategoryBars(
        catEntries.map((c) => ({
          ...c,
          pct: Math.max(6, Math.round((c.amount / maxCat) * 100)),
        }))
      );

      const pairwise = computePairwiseNets(
        user.id,
        members,
        allExpensesRes.data || [],
        settlements || []
      );
      setBalance(sumPairwiseBalance(pairwise));
      setRoommateCards(
        buildRoommateCardsFromPairwise(user.id, members, pairwise)
      );

      setShoppingCount(shoppingRes.count || 0);

      const feed = [];
      expensesData.slice(0, 3).forEach((exp) => {
        const actorId = String(exp.paid_by);
        const memberMatch = apartmentMembers.find((m) => String(m.id) === actorId);
        const actor =
          actorId === String(user.id)
            ? 'את/ה'
            : memberMatch?.name || 'שותף';
        feed.push({
          id: `exp-${exp.id}`,
          at: exp.created_at || exp.date,
          text: `${actor} הוסיף/ה הוצאה: ${exp.description}`,
        });
      });
      (boughtRes.data || []).slice(0, 3).forEach((item) => {
        const actorId = String(item.added_by || '');
        const memberMatch = apartmentMembers.find((m) => String(m.id) === actorId);
        const actor =
          actorId === String(user.id)
            ? 'את/ה'
            : memberMatch?.name || 'שותף';
        feed.push({
          id: `shop-${item.id}`,
          at: item.completed_at || item.created_at,
          text: `${actor} סימן/ה כנקנה: ${item.name}`,
        });
      });
      feed.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
      setActivity(feed.slice(0, 2));

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [apartmentId, user?.id, apartmentMembers]);

  useEffect(() => {
    if (apartmentId && user?.id && !apartmentName?.trim()) {
      refreshApartment(user.id);
    }
  }, [apartmentId, user?.id, apartmentName, refreshApartment]);

  useEffect(() => {
    if (!apartmentId || !user?.id) {
      setLoading(false);
      return;
    }
    fetchDashboardData();
  }, [apartmentId, user?.id, fetchDashboardData]);

  const openSettleForCard = (card) => {
    if (!card || card.relation === 'settled') return;
    setSettleCard(card);
    setSettleAmount(card.amount.toFixed(2));
    setSettleError('');
  };

  const closeSettleModal = () => {
    if (settleSaving) return;
    setSettleCard(null);
    setSettleAmount('');
    setSettleError('');
  };

  const handleSettleConfirm = async () => {
    if (!settleCard || settleSaving) return;
    setSettleError('');

    const max = Number(settleCard.amount) || 0;
    const amount = Number(settleAmount);
    if (!Number.isFinite(amount) || amount <= EPS) {
      setSettleError('נא להזין סכום חיובי');
      return;
    }
    if (amount > max + EPS) {
      setSettleError(
        `הסכום לא יכול לעלות על ₪${max.toFixed(2)} מול ${settleCard.name}`
      );
      return;
    }

    try {
      setSettleSaving(true);
      const { error } = await supabase.rpc('settle_with_member', {
        apt_id: apartmentId,
        partner_id: settleCard.id,
        settle_amount: Number(amount.toFixed(2)),
        i_am_owed: settleCard.relation === 'owes_me',
      });
      if (error) throw error;
      setSettleCard(null);
      setSettleAmount('');
      await fetchDashboardData();
    } catch (err) {
      setSettleError(err.message || 'שגיאה בהסדרת התשלום');
    } finally {
      setSettleSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container" id="dashboard-page">
        <div className="dashboard-skeleton balance-skeleton" />
        <div className="dashboard-skeleton-row">
          <div className="dashboard-skeleton metric-skeleton" />
          <div className="dashboard-skeleton metric-skeleton" />
        </div>
        <div className="dashboard-skeleton actions-skeleton" />
        <div className="dashboard-skeleton list-skeleton" />
      </div>
    );
  }

  const headline = formatBalanceHeadline(balance);
  const isBalanced = Math.abs(balance) < EPS;
  const isEmptyApartment =
    expenses.length === 0 && shoppingCount === 0 && monthExpenseCount === 0;

  return (
    <div className="dashboard-container" id="dashboard-page">
      <header className="dashboard-apartment-header">
        <h1 className="dashboard-apartment-name">
          {apartmentName?.trim() || 'הדירה שלי'}
        </h1>
      </header>

      {isEmptyApartment ? (
        <section className="dashboard-empty-state">
          <h2 className="dashboard-empty-title">הדירה עדיין ריקה</h2>
          <p className="dashboard-empty-text">
            הוסיפו הוצאה ראשונה או פריט לקניות — והמאזן יתחיל להתעדכן אוטומטית.
          </p>
          <div className="dashboard-empty-actions">
            <button
              type="button"
              className="balance-btn"
              onClick={() => navigate('/expenses/add')}
            >
              <IconPlus size={16} stroke={2.25} />
              הוסף הוצאה
            </button>
            <button
              type="button"
              className="dashboard-empty-secondary"
              onClick={() => navigate('/shopping')}
            >
              לרשימת הקניות
            </button>
          </div>
        </section>
      ) : (
        <div className="balance-card">
          <div className="balance-card-header">
            <div className="balance-label">מאזן הדירה שלך</div>
            <div className="balance-update-time">
              עודכן {lastUpdated.toLocaleTimeString('he-IL')}
            </div>
          </div>
          <div className={`balance-title balance-title-${headline.tone}`}>
            {headline.text}
          </div>

          <div className="balance-people-grid">
            {roommateCards.length === 0 ? (
              <div className="balance-people-empty">
                אין שותפים נוספים בדירה עדיין
              </div>
            ) : (
              roommateCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className={`balance-person-card relation-${card.relation}${
                    card.relation !== 'settled' ? ' is-actionable' : ''
                  }`}
                  onClick={() => openSettleForCard(card)}
                  disabled={card.relation === 'settled'}
                >
                  <div className="balance-person-name">{card.name}</div>
                  <div className="balance-person-amount">
                    {card.relation === 'settled'
                      ? '₪0.00'
                      : `₪${card.amount.toFixed(2)}`}
                  </div>
                  <div className="balance-person-relation">
                    {card.relation === 'owes_me' && 'חייב/ת לך · לחצו להסדרה'}
                    {card.relation === 'i_owe' &&
                      `אתה חייב ל-${card.name} · לחצו להסדרה`}
                    {card.relation === 'settled' && 'מאוזנים'}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="metrics-row">
        <div className="metric-card">
          <button
            type="button"
            className="metric-card-main"
            onClick={() => navigate('/expenses')}
          >
            <div className="metric-label">הוצאות החודש</div>
            <div className="metric-value">{monthExpenseCount}</div>
            <div className="metric-secondary">
              סה״כ ₪
              {totalMonth.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
            </div>
          </button>
          <button
            type="button"
            className="metric-add-btn"
            onClick={() => navigate('/expenses/add')}
            aria-label="הוסף הוצאה"
            title="הוסף הוצאה"
          >
            <IconPlus size={18} stroke={2.5} aria-hidden="true" />
          </button>
        </div>
        <div className="metric-card">
          <button
            type="button"
            className="metric-card-main"
            onClick={() => navigate('/shopping')}
          >
            <div className="metric-label">פריטים לקנייה</div>
            <div className="metric-value">{shoppingCount}</div>
            <div className="metric-secondary">ברשימה הפתוחה</div>
          </button>
          <button
            type="button"
            className="metric-add-btn"
            onClick={() => navigate('/shopping')}
            aria-label="הוסף לרשימת קניות"
            title="הוסף לרשימת קניות"
          >
            <IconPlus size={18} stroke={2.5} aria-hidden="true" />
          </button>
        </div>
      </div>

      {!isEmptyApartment && (
        <>
          {activity.length > 0 && (
            <section className="activity-section">
              <h2 className="section-title">פעילות אחרונה</h2>
              <ul className="activity-list">
                {activity.map((item) => (
                  <li key={item.id} className="activity-row">
                    {item.text}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {categoryBars.length > 0 && (
            <section className="chart-section">
              <h2 className="section-title">הוצאות לפי קטגוריה (החודש)</h2>
              <div className="category-bars">
                {categoryBars.map((bar) => (
                  <div key={bar.key} className="category-bar-row">
                    <div className="category-bar-meta">
                      <span>{bar.label}</span>
                      <span>₪{bar.amount.toFixed(0)}</span>
                    </div>
                    <div className="category-bar-track">
                      <div
                        className="category-bar-fill"
                        style={{ width: `${bar.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="expenses-section">
            <div className="section-header">
              <h2 className="section-title">הוצאות אחרונות</h2>
              <Link to="/expenses" className="view-all-link">
                צפה בהכל
              </Link>
            </div>

            <div className="expenses-list">
              {expenses.length === 0 ? (
                <div className="expenses-empty-state">
                  <div className="expenses-empty-icon" aria-hidden="true">
                    <IconReceipt size={28} stroke={1.75} />
                  </div>
                  <p className="expenses-empty-text">
                    עדיין לא נוספו הוצאות — הוסף את הראשונה
                  </p>
                  <button
                    type="button"
                    className="expenses-empty-cta"
                    onClick={() => navigate('/expenses/add')}
                  >
                    <IconPlus size={16} stroke={2.25} />
                    הוסף הוצאה
                  </button>
                </div>
              ) : (
                expenses.map((exp) => (
                  <div key={exp.id} className="expense-row-card">
                    <div className="expense-icon-square">₪</div>
                    <div className="expense-info">
                      <div className="expense-name">{exp.description}</div>
                      <div className="expense-date">
                        {formatLocalDate(exp.date)}
                      </div>
                    </div>
                    <div className="expense-right">
                      <div className="expense-amount">
                        ₪{Number(exp.amount).toFixed(2)}
                      </div>
                      <div
                        className={`expense-paid-by ${
                          exp.paid_by === user?.id
                            ? 'paid-by-me'
                            : 'paid-by-other'
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

          {!isBalanced && (
            <Link to="/expenses/add" className="cta-button-link">
              <IconPlus size={18} stroke={2.25} />
              הוסף הוצאה חדשה
            </Link>
          )}
        </>
      )}

      {settleCard && (
        <div
          className="settle-modal-overlay"
          onClick={closeSettleModal}
          role="presentation"
        >
          <div
            className="settle-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settle-modal-title"
          >
            <h2 id="settle-modal-title" className="settle-modal-title">
              הסדרת תשלום עם {settleCard.name}
            </h2>
            <p className="settle-modal-subtitle">
              {settleCard.relation === 'owes_me'
                ? `פתוח מול ${settleCard.name}: חייב/ת לך ₪${settleCard.amount.toFixed(2)}. אפשר להסדיר חלק או את כל הסכום.`
                : `פתוח מול ${settleCard.name}: אתה חייב ₪${settleCard.amount.toFixed(2)}. אפשר להסדיר חלק או את כל הסכום.`}
            </p>

            <div className="settle-modal-form">
              <label className="settle-field-label" htmlFor="settle-amount">
                סכום להסדרה (₪)
              </label>
              <input
                id="settle-amount"
                className="settle-field-input"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                max={settleCard.amount}
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                disabled={settleSaving}
              />
              <div className="settle-hint">
                מקסימום מול שותף זה: ₪{settleCard.amount.toFixed(2)} — שותפים
                אחרים לא יושפעו
              </div>
            </div>

            {settleError && <div className="settle-error">{settleError}</div>}

            <div className="settle-modal-actions">
              <button
                type="button"
                className="settle-save-btn"
                onClick={handleSettleConfirm}
                disabled={settleSaving}
              >
                {settleSaving ? 'מעדכן...' : 'הסדר תשלום'}
              </button>
              <button
                type="button"
                className="settle-cancel-btn"
                onClick={closeSettleModal}
                disabled={settleSaving}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
