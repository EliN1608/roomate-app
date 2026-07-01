import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './LoginPage.css';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92( 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
      setError(err.message || 'Registration failed');
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

                <button type="submit" className="login-submit-btn">
                  כניסה לחשבון
                </button>
              </form>

              <div className="login-divider">
                <span className="divider-line"></span>
                <span className="divider-text">או</span>
                <span className="divider-line"></span>
              </div>

              <button type="button" className="google-btn" onClick={() => console.log('Google login clicked')}>
                <GoogleIcon />
                <span>המשיכו עם Google</span>
              </button>
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

                <button type="submit" className="login-submit-btn">
                  יצירת חשבון
                </button>
              </form>

              <div className="login-divider">
                <span className="divider-line"></span>
                <span className="divider-text">או</span>
                <span className="divider-line"></span>
              </div>

              <button type="button" className="google-btn" onClick={() => console.log('Google register clicked')}>
                <GoogleIcon />
                <span>המשיכו עם Google</span>
              </button>

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
