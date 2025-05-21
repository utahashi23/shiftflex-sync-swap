
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed event:', event);
        
        setSession(newSession);
        
        if (newSession?.user) {
          // Ensure we're using ExtendedUser type
          const extendedUser = newSession.user as unknown as ExtendedUser;
          setUser(extendedUser);
          setIsEmailVerified(extendedUser.email_confirmed_at !== null);
          
          // Check if user is admin - enhanced to check both app_metadata and specific email
          const isUserAdmin = extendedUser.app_metadata?.role === 'admin' || 
            extendedUser.email === 'njalasankhulani@gmail.com' || 
            extendedUser.email === 'sfadmin';
          
          setIsAdmin(isUserAdmin);
          console.log('User auth state updated:', { 
            email: extendedUser.email, 
            isAdmin: isUserAdmin,
            appMetadata: extendedUser.app_metadata
          });

          // Handle authentication events
          if (event === 'SIGNED_IN') {
            // For admin user, check if they're in the user_roles table
            if (isUserAdmin) {
              console.log('Admin user signed in:', extendedUser.email);
              try {
                // Use type assertions to work around TypeScript errors with Supabase client
                const { data, error } = await supabase.rpc('has_role', { 
                  _user_id: extendedUser.id,
                  _role: 'admin'
                });
                
                if (!error && !data) {
                  // Add admin role if not already present
                  await supabase.from('user_roles')
                    .insert({
                      user_id: extendedUser.id,
                      role: 'admin'
                    });
                  console.log('Added admin role for user:', extendedUser.email);
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

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      
      if (currentSession?.user) {
        // Ensure we're using ExtendedUser type
        const extendedUser = currentSession.user as unknown as ExtendedUser;
        setUser(extendedUser);
        setIsEmailVerified(extendedUser.email_confirmed_at !== null);
        
        // Also check if specific admin user
        const isUserAdmin = extendedUser.app_metadata?.role === 'admin' || 
          extendedUser.email === 'njalasankhulani@gmail.com' || 
          extendedUser.email === 'sfadmin';
          
        setIsAdmin(isUserAdmin);
        console.log('Initial auth check:', { 
          email: extendedUser.email, 
          isAdmin: isUserAdmin, 
          appMetadata: extendedUser.app_metadata
        });
      }
      
      setIsLoading(false);
    }).catch(error => {
      console.error('Error getting session:', error);
      setIsLoading(false);
    });

    return () => {
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
