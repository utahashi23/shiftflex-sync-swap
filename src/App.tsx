
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
const SwapPreferencesPage = lazy(() => import('@/pages/SwapPreferencesPage'));
const AdminPage = lazy(() => import('@/pages/Admin'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

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
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
