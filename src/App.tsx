
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Loading from '@/components/Loading';
import { AuthProvider } from '@/hooks/auth';

// Lazy load the landing page
const LandingPage = lazy(() => import('@/pages/LandingPage'));

// These imports are kept in case we need to revert back later
// Commenting them out for now as we're redirecting everything to landing page
/*
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
const RosteredShiftsPage = lazy(() => import('@/pages/RosteredShifts'));
*/

function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Show landing page for all routes */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Redirect all other routes to the landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
