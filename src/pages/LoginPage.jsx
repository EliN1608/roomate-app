import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './LoginPage.css';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate('/dashboard');
    } catch (err) {
      setError('אימייל או סיסמה שגויים');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;
      navigate('/dashboard');
    } catch (err) {
      setError('ההרשמה נכשלה');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      await supabase.auth.resetPasswordForEmail(email);
      alert('קישור לאיפוס סיסמה נשלח לאימייל שלך');
    } catch (err) {
      alert('שגיאה: ' + err.message);
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError('');
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
        </div>

        {/* 3. BOTTOM LINK */}
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
      </main>
    </div>
  );
}
