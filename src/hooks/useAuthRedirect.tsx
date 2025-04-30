
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

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

    console.log("Auth redirect check:", { 
      path: location.pathname,
      isLoading,
      user: !!user,
      isAdmin,
      protectedRoute,
      adminRoute
    });

    // For routes requiring authentication (e.g., dashboard, settings)
    if (protectedRoute && !user) {
      console.log("Redirecting to login (protected route)");
      toast({
        title: "Authentication Required",
        description: "Please sign in to access this page.",
        variant: "default",
      });
      navigate('/login', { state: { returnUrl: location.pathname } });
      return;
    }

    // For admin-only routes
    if (adminRoute && (!user || !isAdmin)) {
      console.log("Redirecting to login (admin route)");
      toast({
        title: "Admin Access Required",
        description: "You need admin privileges to access this page.",
        variant: "default",
      });
      navigate('/login', { state: { returnUrl: location.pathname } });
      return;
    }

    // For routes requiring email verification
    if (verificationRequired && user && !isEmailVerified) {
      console.log("Redirecting to verify email");
      navigate('/verify-email');
      return;
    }

    // For authentication routes (login, register) - redirect authenticated users away
    if (authRoutes && user) {
      console.log("Redirecting to dashboard (auth route)");
      navigate('/dashboard');
      return;
    }

  }, [isLoading, user, isAdmin, protectedRoute, adminRoute, authRoutes, verificationRequired, isEmailVerified, navigate, location]);

  return {
    isAuthenticated: !!user,
    isAuthorized: adminRoute ? !!user && isAdmin : !!user,
  };
};
