
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

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
      navigate('/login', { state: { returnUrl: location.pathname } });
      return;
    }

    // For admin-only routes
    if (adminRoute && (!user || !isAdmin)) {
      navigate('/login', { state: { returnUrl: location.pathname } });
      return;
    }

    // For routes requiring email verification
    if (verificationRequired && user && !isEmailVerified) {
      navigate('/verify-email');
      return;
    }

    // For authentication routes (login, register) - redirect authenticated users away
    if (authRoutes && user) {
      navigate('/dashboard');
      return;
    }

  }, [isLoading, user, isAdmin, protectedRoute, adminRoute, authRoutes, verificationRequired, isEmailVerified, navigate, location]);

  return {
    isAuthenticated: !!user,
    isAuthorized: adminRoute ? !!user && isAdmin : !!user,
  };
};
