import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

import { AuthProvider } from './context/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Layout from './components/Layout/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import AddExpensePage from './pages/AddExpensePage';
import ExpensesHistoryPage from './pages/ExpensesHistoryPage';
import ShoppingListPage from './pages/ShoppingListPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/password-forgot" element={<ForgotPasswordPage />} />

          {/* Auth required: onboarding (no apartment yet) + app pages */}
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/expenses" element={<ExpensesHistoryPage />} />
              <Route path="/expenses/add" element={<AddExpensePage />} />
              <Route path="/shopping" element={<ShoppingListPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Wildcard 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
      <Analytics />
    </AuthProvider>
  );
}

export default App;
