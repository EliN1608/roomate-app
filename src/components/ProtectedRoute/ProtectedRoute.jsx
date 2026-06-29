import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute() {
  const { isLoggedIn, loading, hasApartment } = useAuth();
  const location = useLocation();

  if (loading) return null;
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!hasApartment && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
