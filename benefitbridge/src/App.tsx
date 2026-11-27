import { Navigate, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { backendConfigured, hasBackendSession, hasDemoSession } from './services/backendClient';

import HomePage           from './pages/HomePage';
import SearchPage         from './pages/SearchPage';
import BenefitDetailPage  from './pages/BenefitDetailPage';
import OnboardingPage     from './pages/OnboardingPage';
import ResourcesPage      from './pages/ResourcesPage';

import DashboardPage      from './pages/DashboardPage';
import MyBenefitsPage     from './pages/MyBenefitsPage';
import EligibilityPage    from './pages/EligibilityPage';
import DocumentsPage      from './pages/DocumentsPage';
import ApplicationsPage   from './pages/ApplicationsPage';
import DeadlinesPage      from './pages/DeadlinesPage';
import NotificationsPage  from './pages/NotificationsPage';
import { ProfilePage, SettingsPage } from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';

import AdminPage          from './pages/admin/AdminPage';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-5xl font-bold text-neutral-200 mb-4">404</p>
      <h1 className="text-xl font-bold text-neutral-900 mb-2">Page not found</h1>
      <p className="text-neutral-500 text-sm mb-6 max-w-xs">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <a href="/" className="text-navy-600 hover:text-navy-800 text-sm font-medium transition-colors">
        ← Back to home
      </a>
    </div>
  );
}

function ProtectedDashboard() {
  if (backendConfigured && !hasBackendSession() && !hasDemoSession()) return <Navigate to="/login" replace />;
  return <DashboardLayout />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-blue-50 font-sans antialiased">
      <Navbar />
      <div role="note" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs leading-relaxed text-amber-900">
        {backendConfigured
          ? 'Eligibility guidance is preliminary. Verify scheme details and application links with the relevant authority.'
          : 'Demo mode: sample scheme details are illustrative, not verified or official. Eligibility results are preliminary; confirm dates, conditions, and links with the relevant authority.'}
      </div>
      <Routes>
        {/* Public pages */}
        <Route path="/"            element={<HomePage />} />
        <Route path="/search"      element={<SearchPage />} />
        <Route path="/benefits/:id" element={<BenefitDetailPage />} />
        <Route path="/onboarding"  element={<OnboardingPage />} />
        <Route path="/resources"   element={<ResourcesPage />} />
        <Route path="/login"       element={<AuthPage mode="login" />} />
        <Route path="/register"    element={<AuthPage mode="register" />} />

        {/* Demo dashboard; not protected by an account until backend auth is configured. */}
        <Route path="/dashboard" element={<ProtectedDashboard />}>
          <Route index                  element={<DashboardPage />} />
          <Route path="benefits"        element={<MyBenefitsPage />} />
          <Route path="eligibility"     element={<EligibilityPage />} />
          <Route path="documents"       element={<DocumentsPage />} />
          <Route path="applications"    element={<ApplicationsPage />} />
          <Route path="deadlines"       element={<DeadlinesPage />} />
          <Route path="notifications"   element={<NotificationsPage />} />
          <Route path="profile"         element={<ProfilePage />} />
          <Route path="settings"        element={<SettingsPage />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<AdminPage />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
