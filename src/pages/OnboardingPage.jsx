import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OnboardingPage.css';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'join'
  const [apartmentName, setApartmentName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [createdCode] = useState('AB72KX');

  const handleCreateApartment = (e) => {
    e.preventDefault();
    if (!apartmentName.trim()) {
      alert('נא להזין שם דירה');
      return;
    }
    alert(`הדירה "${apartmentName}" נוצרה בהצלחה! קוד הזמנה: ${createdCode}`);
    navigate('/dashboard');
  };

  const handleJoinApartment = (e) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) {
      alert('נא להזין קוד הזמנה');
      return;
    }
    alert(`הצטרפת בהצלחה לדירה עם הקוד ${inviteCodeInput.trim()}!`);
    navigate('/dashboard');
  };

  return (
    <div className="onboarding-container" id="onboarding-page">
      {/* 1. Page Title */}
      <h1 className="onboarding-title">בואו נתחיל</h1>

      {/* 2. Black Card Wrapper */}
      <div className="onboarding-card">
        {/* Tabs for switching Create / Join */}
        <div className="onboarding-tabs">
          <button
            type="button"
            className={`onboarding-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            יצירת דירה
          </button>
          <button
            type="button"
            className={`onboarding-tab ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            הצטרפות לדירה
          </button>
        </div>

        {activeTab === 'create' ? (
          <form onSubmit={handleCreateApartment} className="onboarding-form">
            <div className="onboarding-group">
              <label className="onboarding-label" htmlFor="apt-name">שם הדירה</label>
              <input
                id="apt-name"
                type="text"
                className="onboarding-input"
                placeholder="למשל: דירה ברחוב הרצל..."
                value={apartmentName}
                onChange={(e) => setApartmentName(e.target.value)}
              />
            </div>

            <button type="submit" className="onboarding-btn">
              צור דירה חדשה
            </button>

            {/* Nested dark card: invite code */}
            <div className="nested-code-card">
              <div className="invite-code-label">קוד הזמנה לדירה החדשה:</div>
              <div className="invite-code-value">{createdCode}</div>
              <div className="invite-code-subtitle">שתפו את הקוד עם השותפים שלכם</div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJoinApartment} className="onboarding-form">
            <div className="onboarding-group">
              <label className="onboarding-label" htmlFor="invite-code">קוד הזמנה</label>
              <input
                id="invite-code"
                type="text"
                className="onboarding-input code-input-field"
                placeholder="למשל: AB72KX"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
              />
            </div>

            <button type="submit" className="onboarding-btn">
              הצטרף לדירה
            </button>
          </form>
        )}
      </div>

      {/* 3. Footer link */}
      {activeTab === 'create' ? (
        <button
          type="button"
          className="onboarding-footer-link-btn"
          onClick={() => setActiveTab('join')}
        >
          יש לכם כבר קוד הזמנה? לחצו כאן
        </button>
      ) : (
        <button
          type="button"
          className="onboarding-footer-link-btn"
          onClick={() => setActiveTab('create')}
        >
          רוצים ליצור דירה חדשה? לחצו כאן
        </button>
      )}
    </div>
  );
}
