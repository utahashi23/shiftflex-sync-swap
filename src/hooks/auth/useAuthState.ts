
import { useState, useEffect } from "react";
import { supabase } from "./supabase-client";
import { Session } from "@supabase/supabase-js";
import { ExtendedUser } from "./types";

/**
 * Hook to manage authentication state
 */
export const useAuthState = () => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    // Flag to track component mount state
    let mounted = true;
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event);
        setSession(newSession);
        
        if (newSession?.user) {
          const extendedUser = newSession.user as unknown as ExtendedUser;
          setUser(extendedUser);
          setIsEmailVerified(!!extendedUser.email_confirmed_at);
          
          // Simple admin check via direct database query
          try {
            const { data: userRoles, error } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', extendedUser.id)
              .eq('role', 'admin');
            
            if (mounted) {
              const adminStatus = !error && userRoles && userRoles.length > 0;
              console.log('Admin check result:', adminStatus, 'for user', extendedUser.id);
              setIsAdmin(adminStatus);
            }
          } catch (err) {
            console.error('Admin check error:', err);
            if (mounted) {
              // Fallback to metadata check
              setIsAdmin(extendedUser.app_metadata?.role === 'admin');
            }
          }
        } else if (mounted) {
          setUser(null);
          setIsEmailVerified(false);
          setIsAdmin(false);
        }
      }
    );

    // Then check for existing session
    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(currentSession);
        
        if (currentSession?.user) {
          const extendedUser = currentSession.user as unknown as ExtendedUser;
          setUser(extendedUser);
          setIsEmailVerified(!!extendedUser.email_confirmed_at);
          
          // Simple admin check via direct database query
          try {
            const { data: userRoles, error } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', extendedUser.id)
              .eq('role', 'admin');
            
            if (mounted) {
              const adminStatus = !error && userRoles && userRoles.length > 0;
              console.log('Initial admin check result:', adminStatus, 'for user', extendedUser.id);
              setIsAdmin(adminStatus);
            }
          } catch (err) {
            console.error('Initial admin check error:', err);
            if (mounted) {
              // Fallback to metadata check
              setIsAdmin(extendedUser.app_metadata?.role === 'admin');
            }
          }
        }
      } catch (error) {
        console.error('Session fetch error:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    initSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    session,
    isLoading,
    isAdmin,
    isEmailVerified,
    setUser,
    setSession
  };
};
