import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './OnboardingPage.css';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, hasApartment, activateApartment, refreshApartment } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [apartmentName, setApartmentName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedInviteCode, setGeneratedInviteCode] = useState('');
  const [street, setStreet] = useState('');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [apartmentCreated, setApartmentCreated] = useState(false);
  const [createdApartment, setCreatedApartment] = useState(null);
  const [city, setCity] = useState('');
  const [holdOnPage, setHoldOnPage] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (hasApartment && !apartmentCreated && !holdOnPage) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasApartment, apartmentCreated, holdOnPage, navigate]);

  const showToast = ({ type = 'success', title, message, actionLabel, onAction }) => {
    setToast({ type, title, message, actionLabel, onAction });
  };

  const dismissToast = () => setToast(null);

  const enterDashboard = (apartmentPayload) => {
    if (apartmentPayload) {
      activateApartment(apartmentPayload);
    }
    navigate('/dashboard', { replace: true });
  };

  const goToDashboard = async () => {
    setLoading(true);
    try {
      if (createdApartment) {
        enterDashboard({
          apartmentId: createdApartment.id,
          role: 'admin',
          apartment: createdApartment,
        });
        return;
      }

      const ok = await refreshApartment(user?.id);
      if (!ok) {
        showToast({
          type: 'error',
          title: 'לא הצלחנו להיכנס לדירה',
          message: 'נסו שוב בעוד רגע, או רעננו את העמוד.',
          actionLabel: 'סגור',
          onAction: dismissToast,
        });
        return;
      }
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      showToast({
        type: 'error',
        title: 'נדרשת התחברות',
        message: 'יש להתחבר לפני יצירת דירה.',
        actionLabel: 'להתחברות',
        onAction: () => navigate('/login'),
      });
      return;
    }
    if (!apartmentName.trim()) {
      showToast({
        type: 'error',
        title: 'חסר שם דירה',
        message: 'נא להזין שם לדירה לפני היצירה.',
        actionLabel: 'הבנתי',
        onAction: dismissToast,
      });
      return;
    }
    try {
      setLoading(true);

      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const generatedCode = Array.from(
        { length: 6 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join('');

      const { data: apartment, error: apartmentError } = await supabase
        .from('apartments')
        .insert({
          name: apartmentName,
          invite_code: generatedCode,
          created_by: user.id,
          street,
          building_number: buildingNumber,
          apartment_number: apartmentNumber,
          city,
        })
        .select()
        .single();

      if (apartmentError) throw apartmentError;

      const { error: memberError } = await supabase
        .from('members')
        .insert({
          user_id: user.id,
          apartment_id: apartment.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      setHoldOnPage(true);
      setCreatedApartment(apartment);
      setGeneratedInviteCode(generatedCode);
      setCreatedInviteCode(generatedCode);
      setApartmentCreated(true);
      showToast({
        type: 'success',
        title: 'הדירה נוצרה!',
        message: `קוד ההזמנה: ${generatedCode}. שתפו עם השותפים ואז היכנסו לדשבורד.`,
        actionLabel: 'כניסה לדשבורד',
        onAction: () => enterDashboard({
          apartmentId: apartment.id,
          role: 'admin',
          apartment,
        }),
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'שגיאה ביצירת דירה',
        message: err.message || 'משהו השתבש. נסו שוב.',
        actionLabel: 'סגור',
        onAction: dismissToast,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      showToast({
        type: 'error',
        title: 'נדרשת התחברות',
        message: 'יש להתחבר לפני הצטרפות לדירה.',
        actionLabel: 'להתחברות',
        onAction: () => navigate('/login'),
      });
      return;
    }
    if (!inviteCode.trim()) {
      showToast({
        type: 'error',
        title: 'חסר קוד הזמנה',
        message: 'נא להזין את קוד ההזמנה שקיבלתם.',
        actionLabel: 'הבנתי',
        onAction: dismissToast,
      });
      return;
    }
    try {
      setLoading(true);

      const normalizedCode = inviteCode
        .toUpperCase()
        .trim()
        .replace(/0/g, 'O')
        .replace(/1/g, 'I');

      const { data: apartment, error: findError } = await supabase
        .from('apartments')
        .select('id, name, street, building_number, apartment_number, invite_code, city')
        .eq('invite_code', normalizedCode)
        .maybeSingle();

      if (findError || !apartment) {
        showToast({
          type: 'error',
          title: 'קוד לא נמצא',
          message: 'קוד ההזמנה לא נמצא. בדקו את הקוד ונסו שוב.',
          actionLabel: 'סגור',
          onAction: dismissToast,
        });
        return;
      }

      const { data: anyMembership } = await supabase
        .from('members')
        .select('id, apartment_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (anyMembership) {
        if (anyMembership.apartment_id === apartment.id) {
          setHoldOnPage(true);
          showToast({
            type: 'success',
            title: 'כבר חברים בדירה',
            message: `אתם כבר חלק מ"${apartment.name}". אפשר להיכנס לדשבורד.`,
            actionLabel: 'מעבר לדשבורד',
            onAction: () => enterDashboard({
              apartmentId: apartment.id,
              role: anyMembership.role || 'member',
              apartment,
            }),
          });
        } else {
          showToast({
            type: 'error',
            title: 'כבר משויכים לדירה',
            message: 'אתם כבר חברים בדירה אחרת. עזבו אותה לפני הצטרפות לדירה חדשה.',
            actionLabel: 'סגור',
            onAction: dismissToast,
          });
        }
        return;
      }

      const { error: memberError } = await supabase
        .from('members')
        .insert({
          user_id: user.id,
          apartment_id: apartment.id,
          role: 'member',
        });

      if (memberError) throw memberError;

      setHoldOnPage(true);
      showToast({
        type: 'success',
        title: 'הצטרפתם בהצלחה!',
        message: `ברוכים הבאים ל"${apartment.name}". לחצו כדי לעבור לדשבורד.`,
        actionLabel: 'מעבר לדשבורד',
        onAction: () => enterDashboard({
          apartmentId: apartment.id,
          role: 'member',
          apartment,
        }),
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'שגיאה בהצטרפות',
        message: err.message || 'משהו השתבש. נסו שוב.',
        actionLabel: 'סגור',
        onAction: dismissToast,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page-container" id="onboarding-page">
      <header className="onboarding-header">
        <span className="onboarding-logo">RooMate</span>
      </header>

      <div className="onboarding-titles-section">
        <h1 className="onboarding-page-title">בואו נתחיל</h1>
        <p className="onboarding-page-subtitle">כל מגורים משותפים מוצלחים מתחילים בכלל אחד משותף</p>
      </div>

      <div className="onboarding-black-card">
        <div className="onboarding-tab-switcher">
          <button
            type="button"
            className={`onboarding-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            יצירת דירה
          </button>
          <button
            type="button"
            className={`onboarding-tab-btn ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            הצטרפות לדירה
          </button>
        </div>

        {activeTab === 'create' ? (
          apartmentCreated ? (
            <div className="invite-code-success">
              <div className="success-title">הדירה נוצרה! 🎉</div>
              <div className="success-subtitle">קוד ההזמנה לדירה שלך:</div>
              <div className="invite-code-display">{createdInviteCode}</div>
              <div className="success-hint">שתפו את הקוד עם השותפים שלכם</div>
              <button
                type="button"
                className="onboarding-submit-btn"
                onClick={goToDashboard}
                disabled={loading}
              >
                {loading ? 'מעביר...' : 'כניסה לדירה'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="onboarding-tab-form">
              <div className="onboarding-field-group">
                <label className="onboarding-field-label" htmlFor="create-apt-name">שם הדירה</label>
                <input
                  id="create-apt-name"
                  type="text"
                  className="onboarding-field-input"
                  placeholder="לדוגמה: דירת הרצל"
                  value={apartmentName}
                  onChange={(e) => setApartmentName(e.target.value)}
                />
              </div>

              <div className="onboarding-field-group">
                <label className="onboarding-field-label" htmlFor="create-city">עיר</label>
                <input
                  id="create-city"
                  type="text"
                  className="onboarding-field-input"
                  placeholder="לדוגמה: תל אביב, ירושלים, חיפה"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="onboarding-field-group">
                <label className="onboarding-field-label" htmlFor="create-street">רחוב</label>
                <input
                  id="create-street"
                  type="text"
                  className="onboarding-field-input"
                  placeholder="לדוגמה: הרצל"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>

              <div className="onboarding-field-group">
                <label className="onboarding-field-label" htmlFor="create-building-number">מספר בניין</label>
                <input
                  id="create-building-number"
                  type="text"
                  className="onboarding-field-input"
                  placeholder="לדוגמה: 12"
                  value={buildingNumber}
                  onChange={(e) => setBuildingNumber(e.target.value)}
                />
              </div>

              <div className="onboarding-field-group">
                <label className="onboarding-field-label" htmlFor="create-apartment-number">מספר דירה</label>
                <input
                  id="create-apartment-number"
                  type="text"
                  className="onboarding-field-input"
                  placeholder="לדוגמה: 4"
                  value={apartmentNumber}
                  onChange={(e) => setApartmentNumber(e.target.value)}
                />
              </div>

              <button type="submit" className="onboarding-submit-btn" disabled={loading}>
                {loading ? 'טוען...' : 'צור דירה חדשה'}
              </button>

              <div className="nested-onboarding-card">
                <div className="nested-card-label">לאחר היצירה תקבלו קוד הזמנה</div>
                <div className="nested-card-code">{generatedInviteCode || 'XXXXXX'}</div>
                <div className="nested-card-subtext">שתפו את הקוד עם השותפים שלכם</div>
              </div>
            </form>
          )
        ) : (
          <form onSubmit={handleJoin} className="onboarding-tab-form">
            <div className="onboarding-field-group">
              <label className="onboarding-field-label" htmlFor="join-invite-code">קוד הזמנה</label>
              <input
                id="join-invite-code"
                type="text"
                className="onboarding-field-input code-mono-field"
                placeholder="הזינו את קוד ההזמנה"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            </div>

            <button type="submit" className="onboarding-submit-btn" disabled={loading}>
              {loading ? 'טוען...' : 'הצטרפו לדירה'}
            </button>
          </form>
        )}
      </div>

      {activeTab === 'create' ? (
        <p className="onboarding-footer-text-link">
          כבר יש לכם קוד הזמנה?{' '}
          <button type="button" className="onboarding-link-action" onClick={() => setActiveTab('join')}>
            לחצו כאן
          </button>
        </p>
      ) : (
        <p className="onboarding-footer-text-link">
          רוצים ליצור דירה חדשה?{' '}
          <button type="button" className="onboarding-link-action" onClick={() => setActiveTab('create')}>
            לחצו כאן
          </button>
        </p>
      )}

      {toast && (
        <div className={`onboarding-toast onboarding-toast-${toast.type}`} role="status">
          <div className="onboarding-toast-text">
            <div className="onboarding-toast-title">{toast.title}</div>
            <div className="onboarding-toast-message">{toast.message}</div>
          </div>
          <div className="onboarding-toast-actions">
            {toast.actionLabel && (
              <button
                type="button"
                className="onboarding-toast-action"
                onClick={() => {
                  const action = toast.onAction;
                  dismissToast();
                  action?.();
                }}
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              className="onboarding-toast-close"
              aria-label="סגור"
              onClick={dismissToast}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
