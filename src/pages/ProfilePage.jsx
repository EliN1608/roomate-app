import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();

  const handlePasswordChange = () => {
    console.log('Change password clicked');
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  return (
    <div className="profile-page-wrapper">
      <h1 className="profile-page-title">פרופיל</h1>

      {/* 1. USER CARD */}
      <section className="profile-card user-card">
        <div className="user-card-content">
          <div className="user-avatar">יא</div>
          <div className="user-info">
            <h2 className="user-name">יואב כהן</h2>
            <p className="user-email">yoav@example.com</p>
            <span className="user-role-badge">מנהל דירה</span>
          </div>
        </div>
      </section>

      {/* 2. APARTMENT CARD */}
      <section className="profile-card apartment-card">
        <h3 className="card-section-header">פרטי הדירה</h3>
        
        <div className="info-row">
          <span className="info-label">שם הדירה</span>
          <span className="info-value">דירה ברחוב הרצל</span>
        </div>
        
        <div className="info-row">
          <span className="info-label">מספר שותפים</span>
          <span className="info-value">3 שותפים</span>
        </div>
        
        <div className="info-row no-border">
          <span className="info-label">קוד הזמנה</span>
          <span className="info-value invite-code">AB72KX</span>
        </div>
      </section>

      {/* 3. ROOMMATES CARD */}
      <section className="profile-card roommates-card">
        <h3 className="card-section-header">שותפים בדירה</h3>

        {/* Roommate 1 */}
        <div className="roommate-row">
          <div className="roommate-left">
            <div className="roommate-avatar bg-dark">יא</div>
            <div className="roommate-details">
              <span className="roommate-name">יואב כהן</span>
              <span className="self-badge">את/ה</span>
            </div>
          </div>
          <div className="roommate-right">
            <span className="role-tag admin">מנהל</span>
          </div>
        </div>

        {/* Roommate 2 */}
        <div className="roommate-row">
          <div className="roommate-left">
            <div className="roommate-avatar bg-lime">מכ</div>
            <span className="roommate-name">מיכל לוי</span>
          </div>
          <div className="roommate-right">
            <span className="role-tag member">שותף/ה</span>
          </div>
        </div>

        {/* Roommate 3 */}
        <div className="roommate-row no-border">
          <div className="roommate-left">
            <div className="roommate-avatar bg-dark">דנ</div>
            <span className="roommate-name">דניאל כץ</span>
          </div>
          <div className="roommate-right">
            <span className="role-tag member">שותף/ה</span>
          </div>
        </div>
      </section>

      {/* 4. ACTIONS CARD */}
      <section className="profile-card actions-card">
        <h3 className="card-section-header">פעולות</h3>
        <div className="actions-buttons-container">
          <button 
            type="button" 
            className="action-btn change-password-btn"
            onClick={handlePasswordChange}
          >
            שינוי סיסמה
          </button>
          <button 
            type="button" 
            className="action-btn logout-btn"
            onClick={handleLogout}
          >
            התנתקות
          </button>
        </div>
      </section>

      {/* 5. APARTMENT ACTIONS CARD */}
      <section className="profile-card apartment-actions-card">
        <h3 className="card-section-header">הדירה שלי</h3>
        <button 
          type="button" 
          className="action-btn join-apartment-btn"
          onClick={() => navigate('/onboarding')}
        >
          צור או הצטרף לדירה
        </button>
      </section>
    </div>
  );
}
