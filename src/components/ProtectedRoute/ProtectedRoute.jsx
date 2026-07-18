import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute() {
  const { isLoggedIn, loading, hasApartment } = useAuth();
  const location = useLocation();
  const isOnboarding = location.pathname === '/onboarding';

  if (loading) return null;
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!hasApartment && !isOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // Allow staying on /onboarding after create/join so success UI + toast can show.
  // OnboardingPage redirects already-membered users itself when appropriate.

  return <Outlet />;
}
