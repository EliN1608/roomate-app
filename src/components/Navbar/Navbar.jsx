import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import UserAvatar from '../UserAvatar';
import '../UserAvatar.css';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { apartmentName, logout, avatarUrl, displayName } = useAuth();

  const fullName = displayName || 'משתמש';

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <nav className="navbar" id="navbar">
        {/* Desktop Layout: visible on >= 1024px */}
        <div className="navbar-desktop">
          <div className="navbar-logo-container">
            <span className="navbar-logo">RooMate</span>
          </div>
          <div className="navbar-left-actions">
            <button className="navbar-logout-btn" onClick={handleLogout}>
              התנתק
            </button>
          </div>
        </div>

        {/* Mobile Layout: visible on < 1024px */}
        <div className="navbar-mobile">
          <button
            className="mobile-hamburger"
            onClick={toggleDrawer}
            aria-label="תפריט"
          >
            ☰
          </button>

          <span className="mobile-logo">RooMate</span>

          {/* Spacer keeps the logo centered after removing the header avatar */}
          <span className="mobile-header-spacer" aria-hidden="true" />
        </div>
      </nav>

      {isDrawerOpen && (
        <div className="mobile-drawer-overlay" onClick={toggleDrawer}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <button className="close-drawer" onClick={toggleDrawer}>
                ✕
              </button>
              <button
                type="button"
                className="drawer-user-info"
                onClick={() => {
                  toggleDrawer();
                  navigate('/profile');
                }}
              >
                <UserAvatar
                  src={avatarUrl}
                  name={fullName}
                  className="drawer-avatar"
                  size={48}
                />
                <div className="drawer-user-details">
                  <div className="drawer-name">{fullName}</div>
                  <div className="drawer-apartment">
                    {apartmentName || 'לא מחובר לדירה'}
                  </div>
                </div>
              </button>
            </div>
            <div className="mobile-drawer-content">
              <div className="drawer-section-title">פעולות נוספות</div>
              <button
                className="drawer-btn"
                onClick={() => {
                  handleLogout();
                  toggleDrawer();
                }}
              >
                התנתק
              </button>
              <button
                className="drawer-btn"
                onClick={() => {
                  navigate('/profile');
                  toggleDrawer();
                }}
              >
                הפרופיל שלי
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
