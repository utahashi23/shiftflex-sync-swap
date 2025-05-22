
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
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);

  useEffect(() => {
    // Flag to track component mount state
    let mounted = true;
    
    // Define admin check function to avoid code duplication
    const checkAdminStatus = async (userId: string) => {
      if (!mounted) return;
      
      try {
        console.log('Checking admin status for user:', userId);
        
        // Direct query to get the admin role for this user
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .single();
        
        if (!mounted) return;
        
        // Log the query results for debugging
        console.log('Admin check query result:', { data, error });
        
        // Set admin status based on whether data was returned
        const adminStatus = (data !== null);
        console.log(`Admin check result: ${adminStatus ? 'YES' : 'NO'} for user ${userId}`);
        setIsAdmin(adminStatus);
        setAdminCheckComplete(true);
      } catch (err) {
        console.error('Admin check error:', err);
        if (mounted) {
          // Fallback to metadata check
          const extendedUser = user as ExtendedUser;
          const isAdminFromMetadata = extendedUser?.app_metadata?.role === 'admin';
          console.log(`Admin metadata fallback: ${isAdminFromMetadata ? 'YES' : 'NO'}`);
          setIsAdmin(isAdminFromMetadata || false);
          setAdminCheckComplete(true);
        }
      }
    };
    
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
          
          // Check admin status
          await checkAdminStatus(extendedUser.id);
        } else if (mounted) {
          setUser(null);
          setIsEmailVerified(false);
          setIsAdmin(false);
          setAdminCheckComplete(true);
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
          
          console.log('Existing session found for user:', extendedUser.id);
          // Check admin status
          await checkAdminStatus(extendedUser.id);
        } else {
          setAdminCheckComplete(true);
        }
      } catch (error) {
        console.error('Session fetch error:', error);
        if (mounted) {
          setAdminCheckComplete(true);
        }
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
    adminCheckComplete,
    setUser,
    setSession
  };
};

