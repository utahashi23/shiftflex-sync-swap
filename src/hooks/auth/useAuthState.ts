
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

  // Helper function to check if user is admin
  const checkAdminStatus = async (userId: string) => {
    try {
      // Check admin role directly in user_roles table
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();
      
      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error('Error in checkAdminStatus:', error);
      return false;
    }
  };

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
          
          // Check admin status directly from database
          const isUserAdmin = await checkAdminStatus(extendedUser.id);
          console.log(`User ${extendedUser.id} admin check result:`, isUserAdmin);
          setIsAdmin(isUserAdmin);

          // For demonstration purpose, also log if the app_metadata has admin role
          if (extendedUser.app_metadata?.role === 'admin') {
            console.log('User has admin role in app_metadata');
          }

          // Handle authentication events
          if (event === 'SIGNED_IN') {
            // For admin handling - moved admin check to checkAdminStatus function
            if (extendedUser.email === 'admin@shiftflex.com' || extendedUser.email === 'sfadmin') {
              try {
                // Check if already has admin role
                const hasRole = await checkAdminStatus(extendedUser.id);
                
                if (!hasRole) {
                  // Add admin role if not already present
                  const { error } = await supabase.from('user_roles')
                    .insert({
                      user_id: extendedUser.id,
                      role: 'admin'
                    });
                    
                  if (error) {
                    console.error("Error assigning admin role:", error);
                  } else {
                    console.log("Admin role assigned successfully");
                    setIsAdmin(true);
                  }
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
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      
      if (currentSession?.user) {
        // Ensure we're using ExtendedUser type
        const extendedUser = currentSession.user as unknown as ExtendedUser;
        setUser(extendedUser);
        setIsEmailVerified(extendedUser.email_confirmed_at !== null);
        
        // Check admin status directly from database
        const isUserAdmin = await checkAdminStatus(extendedUser.id);
        console.log(`Initial session: User ${extendedUser.id} admin check result:`, isUserAdmin);
        setIsAdmin(isUserAdmin);
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
