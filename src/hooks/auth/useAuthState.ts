
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
  const [initialSessionChecked, setInitialSessionChecked] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state changed event:', event);
        
        // Skip processing for INITIAL_SESSION to avoid duplicate work
        // This event will be handled by getSession() call below
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        setSession(newSession);
        
        if (newSession?.user) {
          // Ensure we're using ExtendedUser type
          const extendedUser = newSession.user as unknown as ExtendedUser;
          setUser(extendedUser);
          setIsEmailVerified(extendedUser.email_confirmed_at !== null);
          
          // Check if user is admin
          setIsAdmin(extendedUser.app_metadata?.role === 'admin');

          // Handle authentication events
          if (event === 'SIGNED_IN') {
            // For admin user (sfadmin), check if they're in the user_roles table
            if (extendedUser.email === 'sfadmin') {
              try {
                // Use type assertions to work around TypeScript errors with Supabase client
                const { data, error } = supabase.rpc('has_role', { 
                  _user_id: extendedUser.id,
                  _role: 'admin'
                });
                
                if (!error && !data) {
                  // Add admin role if not already present
                  supabase.from('user_roles')
                    .insert({
                      user_id: extendedUser.id,
                      role: 'admin'
                    });
                }
              } catch (error) {
                console.error("Error checking admin role:", error);
              }
            }
          } else if (event === 'SIGNED_OUT') {
            // Clear user state on sign out
            setUser(null);
            setIsEmailVerified(false);
            setIsAdmin(false);
          }
        } else {
          setUser(null);
          setIsEmailVerified(false);
          setIsAdmin(false);
        }
      }
    );

    // THEN check for existing session - only once
    if (!initialSessionChecked) {
      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        setInitialSessionChecked(true);
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Ensure we're using ExtendedUser type
          const extendedUser = currentSession.user as unknown as ExtendedUser;
          setUser(extendedUser);
          setIsEmailVerified(extendedUser.email_confirmed_at !== null);
          setIsAdmin(extendedUser.app_metadata?.role === 'admin');
        }
        
        setIsLoading(false);
      }).catch(error => {
        console.error('Error getting session:', error);
        setInitialSessionChecked(true);
        setIsLoading(false);
      });
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [initialSessionChecked]);

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
