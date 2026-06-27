import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  const features = [
    {
      icon: '💰',
      title: 'ניהול הוצאות',
      text: 'חלקו הוצאות בין השותפים בצורה פשוטה ושקופה'
    },
    {
      icon: '🛒',
      title: 'רשימת קניות',
      text: 'רשימה משותפת שכולם יכולים לראות ולעדכן'
    },
    {
      icon: '⚡',
      title: 'תשלומים מהירים',
      text: 'דעו תמיד מי חייב למי ובכמה'
    }
  ];

  return (
    <div className="landing-container" id="landing-page">
      {/* 1. Top Bar */}
      <header className="landing-top-bar">
        <span className="landing-logo">RooMate</span>
        <Link to="/login" className="landing-login-btn">
          התחברות
        </Link>
      </header>

      {/* 2. Hero Section */}
      <section className="landing-hero">
        <h1 className="hero-title">ניהול הדירה המשותפת שלכם</h1>
        <p className="hero-subtitle">הוצאות, קניות ותשלומים — במקום אחד</p>
        
        <div className="hero-actions">
          <Link to="/onboarding" className="hero-btn-primary">
            התחילו עכשיו — בחינם
          </Link>
          <Link to="/login" className="hero-btn-secondary">
            כניסה למערכת
          </Link>
        </div>

        <p className="hero-social-proof">כבר משתמשים בהם אלפי שותפים בישראל</p>
      </section>

      {/* 3. Features Section */}
      <section className="landing-features">
        {features.map((feat, index) => (
          <div key={index} className="feature-card">
            <div className="feature-icon-circle">{feat.icon}</div>
            <h3 className="feature-title">{feat.title}</h3>
            <p className="feature-text">{feat.text}</p>
          </div>
        ))}
      </section>

      {/* 4. Bottom CTA Section */}
      <section className="landing-bottom-cta">
        <div className="cta-black-card">
          <h2 className="cta-title">מוכנים להתחיל?</h2>
          <Link to="/onboarding" className="cta-btn">
            צרו חשבון בחינם
          </Link>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="landing-footer">
        <p className="footer-text">RooMate © 2024 — כל הזכויות שמורות</p>
      </footer>
    </div>
  );
}
