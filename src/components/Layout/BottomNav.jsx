import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserAvatar from '../UserAvatar';
import '../UserAvatar.css';
import './BottomNav.css';

export default function BottomNav() {
  const { avatarUrl, displayName } = useAuth();
  const fullName = displayName || 'משתמש';

  const tabs = [
    {
      name: 'בית',
      path: '/dashboard',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      name: 'הוצאות',
      path: '/expenses',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      )
    },
    {
      name: 'פרופיל',
      path: '/profile',
      isProfile: true,
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    }
  ];

  return (
    <div className="bottom-nav" id="bottom-nav">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) => `bottom-nav-tab ${isActive ? 'active' : ''}`}
        >
          <span className="bottom-nav-icon">
            {tab.isProfile ? (
              <UserAvatar
                src={avatarUrl}
                name={fullName}
                className="bottom-nav-avatar"
                size={22}
              />
            ) : (
              tab.icon
            )}
          </span>
          <span className="bottom-nav-label">{tab.name}</span>
        </NavLink>
      ))}
    </div>
  );
}
