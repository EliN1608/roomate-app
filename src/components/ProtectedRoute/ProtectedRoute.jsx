import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function ProtectedRoute() {
  const { isLoggedIn, loading } = useContext(AuthContext);

  if (loading) {
    return <div style={{ color: 'var(--text-primary)', padding: 'var(--spacing-xl)', textAlign: 'center', fontFamily: 'var(--font-body)' }}>טוען...</div>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
