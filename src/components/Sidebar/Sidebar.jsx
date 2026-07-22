import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import UserAvatar from '../UserAvatar';
import '../UserAvatar.css';
import './Sidebar.css';

export default function Sidebar() {
  const navigate = useNavigate();
  const { apartmentName, avatarUrl, displayName } = useAuth();

  const fullName = displayName || 'משתמש';

  const navItems = [
    {
      name: 'בית',
      path: '/dashboard',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      name: 'הוצאות',
      path: '/expenses',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="5" x2="12" y2="5" />
          <line x1="12" y1="5" x2="12" y2="19" />
          <path d="M12 19h6" />
          <path d="M6 19h6" />
          <line x1="6" y1="19" x2="6" y2="9" />
          <path d="M6 9h6" />
        </svg>
      )
    },
    {
      name: 'קניות',
      path: '/shopping',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      )
    },
    {
      name: 'פרופיל',
      path: '/profile',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    }
  ];

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-top">
        <span className="sidebar-logo">RooMate</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            <span className="sidebar-item-label">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-user-avatar-btn"
          onClick={() => navigate('/profile')}
          aria-label="פרופיל"
        >
          <UserAvatar
            src={avatarUrl}
            name={fullName}
            className="sidebar-user-avatar"
            size={36}
          />
        </button>
        <div className="sidebar-user-details">
          <div className="sidebar-user-name">{fullName}</div>
          <div className="sidebar-user-apartment">{apartmentName || 'לא מחובר לדירה'}</div>
        </div>
      </div>
    </aside>
  );
}
