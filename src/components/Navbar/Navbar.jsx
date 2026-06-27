import React, { useState } from 'react';
import './Navbar.css';

export default function Navbar() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
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
          {/* Avatar on the left (end in RTL) */}
          <div className="navbar-avatar">יא</div>
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
          <div className="mobile-avatar">יא</div>
        </div>
      </nav>

      {/* Mobile Drawer (Left side slide-in) */}
      {isDrawerOpen && (
        <div className="mobile-drawer-overlay" onClick={toggleDrawer}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <button className="close-drawer" onClick={toggleDrawer}>✕</button>
              <div className="drawer-user-info">
                <div className="drawer-avatar">JD</div>
                <div className="drawer-user-details">
                  <div className="drawer-name">יואב כהן</div>
                  <div className="drawer-apartment">דירה ברחוב הרצל</div>
                </div>
              </div>
            </div>
            <div className="mobile-drawer-content">
              <div className="drawer-section-title">פעולות נוספות</div>
              <button className="drawer-btn" onClick={() => { alert('התנתקות מהמערכת'); toggleDrawer(); }}>התנתק</button>
              <button className="drawer-btn" onClick={() => { alert('הגדרות שותפים'); toggleDrawer(); }}>הגדרות שותפים</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
