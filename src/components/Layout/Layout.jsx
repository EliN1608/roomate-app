import React from 'react';
import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';
import BottomNav from './BottomNav';
import './Layout.css';

export default function Layout({ children }) {
  return (
    <div className="layout-container">
      {/* Sidebar - fixed on the right on desktop, hidden on mobile */}
      <Sidebar />

      {/* Main viewport area */}
      <div className="layout-viewport">
        {/* Navbar - fixed at the top */}
        <Navbar />

        {/* Content area scrollable under Navbar */}
        <main className="layout-content">
          {children}
        </main>

        {/* Bottom Navigation - fixed at bottom on mobile/tablet, hidden on desktop */}
        <BottomNav />
      </div>
    </div>
  );
}
