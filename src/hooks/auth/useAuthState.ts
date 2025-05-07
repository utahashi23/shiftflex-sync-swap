
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

  // Function to check admin role from the user_roles table
  const checkAdminRole = async (userId: string) => {
    try {
      // First check if the user has the admin role in app_metadata
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (!userError && userData?.user?.app_metadata?.role === 'admin') {
        console.log('Admin detected via app_metadata');
        return true;
      }
      
      // If not in app_metadata, check the user_roles table
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
      
      const isUserAdmin = !!data;
      console.log(`Admin check for user ${userId}: ${isUserAdmin ? 'is admin' : 'not admin'}`);
      return isUserAdmin;
    } catch (error) {
      console.error('Error in checkAdminRole:', error);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    console.log('Auth state hook initialized');

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed event:', event);
        
        if (!mounted) return;
        
        setSession(newSession);
        
        if (newSession?.user) {
          // Ensure we're using ExtendedUser type
          const extendedUser = newSession.user as unknown as ExtendedUser;
          setUser(extendedUser);
          setIsEmailVerified(extendedUser.email_confirmed_at !== null);
          
          // Check if user is admin - first check app_metadata then the user_roles table
          const userIsAdmin = extendedUser.app_metadata?.role === 'admin' || 
                            await checkAdminRole(extendedUser.id);
          
          setIsAdmin(userIsAdmin);

          // Handle authentication events
          if (event === 'SIGNED_IN') {
            // For sfadmin user, check if they're in the user_roles table
            if (extendedUser.email === 'sfadmin') {
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
        
        if (mounted && event !== null) {
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!mounted) return;
      
      setSession(currentSession);
      
      if (currentSession?.user) {
        // Ensure we're using ExtendedUser type
        const extendedUser = currentSession.user as unknown as ExtendedUser;
        setUser(extendedUser);
        setIsEmailVerified(extendedUser.email_confirmed_at !== null);
        
        // Check admin status from both app_metadata and user_roles table
        const userIsAdmin = extendedUser.app_metadata?.role === 'admin' || 
                          await checkAdminRole(extendedUser.id);
        
        console.log(`Setting isAdmin to ${userIsAdmin} for user ${extendedUser.id}`);
        setIsAdmin(userIsAdmin);
      }
      
      // Always set loading to false, regardless of session state
      setIsLoading(false);
    }).catch(error => {
      console.error('Error getting session:', error);
      if (mounted) {
        setIsLoading(false);
      }
    });

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
