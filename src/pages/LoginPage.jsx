import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast/Toast';
import './LoginPage.css';

const ERROR_TOAST_MS = 3500;

export default function LoginPage() {
  const { refreshApartment, isLoggedIn, hasApartment, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', type: 'error' });
  const holdOnRegisterRef = useRef(false);

  const showToast = (message, type = 'error') => {
    setToast({ open: true, message, type });
  };

  const handleToastClose = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Wait until AuthContext finished apartment check — otherwise hasApartment
    // is still the default false and we flash /onboarding.
    if (authLoading) return;
    // After signup, auth becomes logged-in before we can set registerSuccess —
    // hold navigation until the success panel is shown / user continues.
    if (isLoggedIn && !isRecovery && !registerSuccess && !holdOnRegisterRef.current) {
      navigate(hasApartment ? '/dashboard' : '/onboarding', { replace: true });
    }
  }, [authLoading, isLoggedIn, hasApartment, navigate, isRecovery, registerSuccess]);

  const navigateAfterAuth = async (userId) => {
    holdOnRegisterRef.current = false;
    const hasApt = await refreshApartment(userId);
    navigate(hasApt ? '/dashboard' : '/onboarding', { replace: true });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      // AuthContext sets loading + resolves apartment once; the effect above
      // navigates to dashboard/onboarding when that finishes.
    } catch (err) {
      const msg = `${err?.message || ''}`.toLowerCase();
      if (/confirm|not confirmed/.test(msg)) {
        showToast('יש לאשר את האימייל לפני ההתחברות', 'error');
      } else {
        showToast('אימייל או סיסמה שגויים', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }
    setSubmitting(true);
    // Block auto-redirect while signup creates a session
    holdOnRegisterRef.current = true;
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (signUpError) throw signUpError;

      // Show in-page success panel instead of a browser alert / instant redirect
      if (!data.session) {
        setRegisterSuccess({
          needsEmailConfirm: true,
          email,
        });
        return;
      }

      setRegisterSuccess({
        needsEmailConfirm: false,
        userId: data.user.id,
        name: fullName.trim() || 'חבר/ה חדש/ה',
      });
    } catch (err) {
      holdOnRegisterRef.current = false;
      console.error('Register failed:', err);
      setError(err?.message ? `ההרשמה נכשלה: ${err.message}` : 'ההרשמה נכשלה');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueAfterRegister = async () => {
    if (!registerSuccess?.userId) return;
    setSubmitting(true);
    try {
      await navigateAfterAuth(registerSuccess.userId);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
      setIsRecovery(false);
      alert('הסיסמה עודכנה בהצלחה');
      const hasApt = await refreshApartment();
      navigate(hasApt ? '/dashboard' : '/onboarding', { replace: true });
    } catch (err) {
      setError('עדכון הסיסמה נכשל: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/password-forgot');
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError('');
    setRegisterSuccess(null);
    holdOnRegisterRef.current = false;
  };

  return (
    <div className="login-page-container">
      {/* 1. TOP BAR */}
      <header className="login-top-bar">
        <Link to="/" className="login-logo">
          <span className="logo-roo">Roo</span>
          <span className="logo-mate">Mate</span>
        </Link>
        <div className="login-top-left">
          <span className="login-prompt-text">אין לכם חשבון?</span>
          <button 
            type="button" 
            className="login-prompt-link" 
            onClick={() => handleTabSwitch('register')}
          >
            הירשמו בחינם
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTENT */}
      <main className="login-main-content">
        <div className="login-card">
          {isRecovery ? (
            <div className="login-tab-panel">
              <h1 className="login-title">בחרו סיסמה חדשה</h1>
              <p className="login-subtitle">הזינו סיסמה חדשה לחשבון שלכם</p>
              {error && <div className="login-error-msg">{error}</div>}
              <form onSubmit={handleRecoverySubmit} className="login-form">
                <div className="login-field">
                  <label className="login-label" htmlFor="recovery-password">סיסמה חדשה</label>
                  <input
                    id="recovery-password"
                    type="password"
                    className="login-input"
                    placeholder="לפחות 8 תווים"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div className="login-field">
                  <label className="login-label" htmlFor="recovery-confirm">אימות סיסמה</label>
                  <input
                    id="recovery-confirm"
                    type="password"
                    className="login-input"
                    placeholder="הזינו שוב את הסיסמה"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <button type="submit" className="login-submit-btn" disabled={submitting}>
                  {submitting ? 'מעדכן...' : 'עדכון סיסמה'}
                </button>
              </form>
            </div>
          ) : registerSuccess ? (
            <div className="login-success-panel">
              <div className="login-success-checkmark" aria-hidden="true">✓</div>
              <h1 className="login-success-title">ההרשמה הצליחה!</h1>
              <p className="login-success-subtitle">
                {registerSuccess.needsEmailConfirm
                  ? `שלחנו קישור אישור ל-${registerSuccess.email}. אחרי האישור תוכלו להתחבר למערכת.`
                  : `ברוכים הבאים${registerSuccess.name ? `, ${registerSuccess.name}` : ''}! החשבון נוצר בהצלחה.`}
              </p>
              {registerSuccess.needsEmailConfirm ? (
                <button
                  type="button"
                  className="login-submit-btn"
                  onClick={() => handleTabSwitch('login')}
                >
                  מעבר להתחברות
                </button>
              ) : (
                <button
                  type="button"
                  className="login-submit-btn"
                  onClick={handleContinueAfterRegister}
                  disabled={submitting}
                >
                  {submitting ? 'מעביר...' : 'המשיכו להגדרת דירה'}
                </button>
              )}
            </div>
          ) : (
            <>
          {/* TABS */}
          <div className="tabs-container">
            <button
              type="button"
              className={`tab-button ${activeTab === 'login' ? 'active' : 'inactive'}`}
              onClick={() => handleTabSwitch('login')}
            >
              התחברות
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'register' ? 'active' : 'inactive'}`}
              onClick={() => handleTabSwitch('register')}
            >
              הרשמה
            </button>
          </div>

          {activeTab === 'login' ? (
            /* --- LOGIN TAB --- */
            <div className="login-tab-panel">
              <h1 className="login-title">ברוכים השבים 👋</h1>
              <p className="login-subtitle">היכנסו לחשבון שלכם כדי להמשיך</p>
              {error && <div className="login-error-msg">{error}</div>}

              <form onSubmit={handleLoginSubmit} className="login-form">
                <div className="login-field">
                  <label className="login-label" htmlFor="login-email">אימייל</label>
                  <input
                    id="login-email"
                    type="email"
                    className="login-input"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="login-field">
                  <div className="login-label-row">
                    <label className="login-label" htmlFor="login-password">סיסמה</label>
                    <button 
                      type="button" 
                      className="forgot-password-link" 
                      onClick={handleForgotPassword}
                    >
                      שכחתם סיסמה?
                    </button>
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    className="login-input"
                    placeholder="הסיסמה שלכם"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="login-submit-btn" disabled={submitting}>
                  {submitting ? 'מתחבר...' : 'כניסה לחשבון'}
                </button>
              </form>
            </div>
          ) : (
            /* --- REGISTER TAB --- */
            <div className="login-tab-panel">
              <h1 className="login-title">צרו חשבון חינם 🏠</h1>
              <p className="login-subtitle">הצטרפו לאלפי דירות שכבר מנוהלות בחכמה</p>
              {error && <div className="login-error-msg">{error}</div>}

              <form onSubmit={handleRegisterSubmit} className="login-form">
                <div className="login-field">
                  <label className="login-label" htmlFor="register-name">שם מלא</label>
                  <input
                    id="register-name"
                    type="text"
                    className="login-input"
                    placeholder="יואב כהן"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="login-field">
                  <label className="login-label" htmlFor="register-email">אימייל</label>
                  <input
                    id="register-email"
                    type="email"
                    className="login-input"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="login-field">
                  <label className="login-label" htmlFor="register-password">סיסמה</label>
                  <input
                    id="register-password"
                    type="password"
                    className="login-input"
                    placeholder="לפחות 8 תווים"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <button type="submit" className="login-submit-btn" disabled={submitting}>
                  {submitting ? 'יוצר חשבון...' : 'יצירת חשבון'}
                </button>
              </form>

              <p className="login-terms">
                בלחיצה על יצירת חשבון, אתם מסכימים ל<a href="#terms" className="terms-link">תנאי השימוש</a> ו<a href="#privacy" className="terms-link">מדיניות הפרטיות</a>
              </p>
            </div>
          )}
            </>
          )}
        </div>

        {/* 3. BOTTOM LINK */}
        {!isRecovery && !registerSuccess && (
        <div className="login-bottom-link">
          {activeTab === 'login' ? (
            <>
              <span>אין לכם חשבון? </span>
              <button 
                type="button" 
                className="switch-tab-link" 
                onClick={() => handleTabSwitch('register')}
              >
                הירשמו כאן
              </button>
            </>
          ) : (
            <>
              <span>כבר יש לכם חשבון? </span>
              <button 
                type="button" 
                className="switch-tab-link" 
                onClick={() => handleTabSwitch('login')}
              >
                היכנסו כאן
              </button>
            </>
          )}
        </div>
        )}
      </main>

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        duration={ERROR_TOAST_MS}
        onClose={handleToastClose}
      />
    </div>
  );
}
