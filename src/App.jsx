import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';

import Layout from './components/Layout/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import AddExpensePage from './pages/AddExpensePage';
import ExpensesHistoryPage from './pages/ExpensesHistoryPage';
import ShoppingListPage from './pages/ShoppingListPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Unwrapped public and onboarding routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Layout-wrapped application routes */}
        <Route element={<Layout><Outlet /></Layout>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/expenses" element={<ExpensesHistoryPage />} />
          <Route path="/expenses/add" element={<AddExpensePage />} />
          <Route path="/shopping" element={<ShoppingListPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

