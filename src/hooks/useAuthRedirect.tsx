
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth'; // Import from the main auth barrel file

type UseAuthRedirectOptions = {
  protectedRoute?: boolean;
  adminRoute?: boolean;
  authRoutes?: boolean;
  verificationRequired?: boolean;
};

export const useAuthRedirect = ({
  protectedRoute = false,
  adminRoute = false,
  authRoutes = false,
  verificationRequired = false,
}: UseAuthRedirectOptions = {}) => {
  const { user, isAdmin, isLoading, isEmailVerified } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait until auth state is loaded
    if (isLoading) return;

    // For routes requiring authentication (e.g., dashboard, settings)
    if (protectedRoute && !user) {
      // Store the current path to redirect back after login
      navigate('/login', { 
        state: { returnUrl: location.pathname },
        replace: true  // Use replace to prevent back button issues
      });
      return;
    }

    // For admin-only routes
    if (adminRoute && (!user || !isAdmin)) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // For routes requiring email verification
    if (verificationRequired && user && !isEmailVerified) {
      navigate('/verify-email', { replace: true });
      return;
    }

    // For authentication routes (login, register) - redirect authenticated users away
    if (authRoutes && user) {
      const returnUrl = location.state?.returnUrl || '/dashboard';
      navigate(returnUrl, { replace: true });
      return;
    }

  }, [isLoading, user, isAdmin, protectedRoute, adminRoute, authRoutes, verificationRequired, isEmailVerified, navigate, location]);

  return {
    isAuthenticated: !!user,
    isAuthorized: adminRoute ? !!user && isAdmin : !!user,
    protectedRoute, // Return this property to match what Dashboard component expects
  };
};
