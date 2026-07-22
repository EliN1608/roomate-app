import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute() {
  const { isLoggedIn, loading, hasApartment } = useAuth();
  const location = useLocation();
  const isOnboarding = location.pathname === '/onboarding';

  // AuthProvider already shows a boot screen while loading; keep a guard
  // so we never route on the default hasApartment=false.
  if (loading) return null;

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!hasApartment && !isOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (hasApartment && isOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
