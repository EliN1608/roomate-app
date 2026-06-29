import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';
import BottomNav from './BottomNav';
import Footer from '../Footer/Footer';
import './Layout.css';

export default function Layout() {
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
          <Outlet />
        </main>

        {/* Bottom Navigation - fixed at bottom on mobile/tablet, hidden on desktop */}
        <BottomNav />

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
