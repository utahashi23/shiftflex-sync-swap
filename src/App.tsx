
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Loading from '@/components/Loading';
import { AuthProvider } from '@/hooks/auth';

// Lazy load pages for better performance
const HomePage = lazy(() => import('@/pages/Index'));
const LoginPage = lazy(() => import('@/pages/Login'));
const DashboardPage = lazy(() => import('@/pages/Dashboard'));
const ShiftsPage = lazy(() => import('@/pages/Shifts'));
const ShiftSwapsPage = lazy(() => import('@/pages/ShiftSwaps'));
const LeaveSwapsPage = lazy(() => import('@/pages/LeaveSwaps'));
const SwapsListPage = lazy(() => import('@/pages/SwapsList'));
const SwapPreferencesPage = lazy(() => import('@/pages/SwapPreferencesPage'));
const AdminPage = lazy(() => import('@/pages/Admin'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const SystemSettingsPage = lazy(() => import('@/pages/SystemSettings'));
const FeedbackPage = lazy(() => import('@/pages/Feedback'));
const FAQPage = lazy(() => import('@/pages/FAQ'));
const CalendarManagementPage = lazy(() => import('@/pages/CalendarManagement'));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmail'));
const RosteredShiftsPage = lazy(() => import('@/pages/RosteredShifts')); // Add the new page

function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/shifts" element={<ShiftsPage />} />
            <Route path="/shift-swaps" element={<ShiftSwapsPage />} />
            <Route path="/leave-swaps" element={<LeaveSwapsPage />} />
            <Route path="/swap-preferences" element={<SwapPreferencesPage />} />
            <Route path="/swaps-list" element={<SwapsListPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/system-settings" element={<SystemSettingsPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/calendar" element={<CalendarManagementPage />} />
            <Route path="/roster-2" element={<RosteredShiftsPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
