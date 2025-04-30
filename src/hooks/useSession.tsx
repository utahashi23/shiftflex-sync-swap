
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export const useSession = () => {
  const { session, user, refreshSession } = useAuth();
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);
  const [sessionExpiring, setSessionExpiring] = useState(false);

  // Monitor session expiration
  useEffect(() => {
    if (!session) {
      setSessionTimeLeft(null);
      setSessionExpiring(false);
      return;
    }

    const checkSessionExpiry = () => {
      if (!session) return;
      
      // Calculate time left in session (using mock expiry for now)
      const expiresAt = Date.now() + 3600000; // 1 hour from now for demo
      const timeLeft = expiresAt - Date.now();
      
      setSessionTimeLeft(Math.max(0, timeLeft));
      
      // Warn user when session is about to expire (5 minutes before)
      if (timeLeft > 0 && timeLeft < 300000 && !sessionExpiring) {
        setSessionExpiring(true);
        toast({
          title: "Session Expiring Soon",
          description: "Your session will expire in 5 minutes. Please save your work.",
        });
      }
      
      // Session expired
      if (timeLeft <= 0) {
        setSessionExpiring(false);
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
      }
    };

    // Initial check
    checkSessionExpiry();
    
    // Set up interval to check session expiry
    const interval = setInterval(checkSessionExpiry, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [session, sessionExpiring]);

  // Function to extend session
  const extendSession = async () => {
    try {
      await refreshSession();
      setSessionExpiring(false);
      toast({
        title: "Session Extended",
        description: "Your session has been successfully extended.",
      });
    } catch (error) {
      toast({
        title: "Failed to Extend Session",
        description: "There was a problem extending your session. Please log in again.",
        variant: "destructive",
      });
    }
  };

  return {
    sessionTimeLeft,
    sessionExpiring,
    extendSession,
    isAuthenticated: !!session && !!user,
  };
};
