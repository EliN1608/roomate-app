import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './ForgotPasswordPage.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Sending password reset email to:', email);
    setSent(true);
  };

  return (
    <div className="forgot-page-container">
      {/* TOP BAR */}
      <header className="forgot-top-bar">
        <Link to="/" className="forgot-logo">
          <span className="logo-roo">Roo</span>
          <span className="logo-mate">Mate</span>
        </Link>
      </header>

      {/* MAIN CONTENT */}
      <main className="forgot-main-content">
        <div className="forgot-card">
          {!sent ? (
            <div className="forgot-form-panel">
              <h1 className="forgot-title">שכחתם סיסמה? 🔑</h1>
              <p className="forgot-subtitle">נשלח לכם קישור לאיפוס הסיסמה לאימייל</p>

              <form onSubmit={handleSubmit} className="forgot-form">
                <div className="forgot-field">
                  <label className="forgot-label" htmlFor="forgot-email">אימייל</label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="forgot-input"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="forgot-submit-btn">
                  שלחו קישור לאיפוס
                </button>
              </form>
            </div>
          ) : (
            <div className="forgot-success-panel">
              <div className="forgot-checkmark">✓</div>
              <h2 className="forgot-success-title">הקישור נשלח!</h2>
              <p className="forgot-success-subtitle">בדקו את תיבת הדואר שלכם</p>
            </div>
          )}
        </div>

        {/* BOTTOM LINK */}
        <div className="forgot-bottom-link">
          <Link to="/login" className="back-to-login-link">
            חזרה להתחברות
          </Link>
        </div>
      </main>
    </div>
  );
}
