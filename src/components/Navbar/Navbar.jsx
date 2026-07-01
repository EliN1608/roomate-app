import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user, apartmentName, logout } = useAuth();

  const fullName = user?.user_metadata?.full_name || 'משתמש';
  const initials = fullName
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

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
          {/* Logo on the right (start in RTL) */}
          <div className="navbar-logo-container">
            <span className="navbar-logo">RooMate</span>
          </div>
          {/* Actions on the left (end in RTL) */}
          <div className="navbar-left-actions">
            <button className="navbar-logout-btn" onClick={handleLogout}>התנתק</button>
            <div className="navbar-avatar">{initials}</div>
          </div>
        </div>

        {/* Mobile Layout: visible on < 1024px */}
        <div className="navbar-mobile">
          {/* Hamburger on the left (end in RTL) */}
          <button className="mobile-hamburger" onClick={toggleDrawer} aria-label="תפריט">
            ☰
          </button>
          
          {/* Logo centered */}
          <span className="mobile-logo">ROOMATE</span>

          {/* Avatar on the right (start in RTL) */}
          <div className="mobile-avatar">{initials}</div>
        </div>
      </nav>

      {/* Mobile Drawer (Left side slide-in) */}
      {isDrawerOpen && (
        <div className="mobile-drawer-overlay" onClick={toggleDrawer}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <button className="close-drawer" onClick={toggleDrawer}>✕</button>
              <div className="drawer-user-info">
                <div className="drawer-avatar">{initials}</div>
                <div className="drawer-user-details">
                  <div className="drawer-name">{fullName}</div>
                  <div className="drawer-apartment">{apartmentName || 'לא מחובר לדירה'}</div>
                </div>
              </div>
            </div>
            <div className="mobile-drawer-content">
              <div className="drawer-section-title">פעולות נוספות</div>
              <button className="drawer-btn" onClick={() => { handleLogout(); toggleDrawer(); }}>התנתק</button>
              <button className="drawer-btn" onClick={() => { alert('הגדרות שותפים'); toggleDrawer(); }}>הגדרות שותפים</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
