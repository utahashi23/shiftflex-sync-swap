
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

  // Function to check if a user is an admin
  const checkIsAdmin = async (userId: string) => {
    console.log('Checking admin status for user:', userId);
    
    try {
      // First, check app_metadata
      if (user?.app_metadata?.role === 'admin') {
        console.log('User is admin via app_metadata');
        return true;
      }
      
      // Then check if the special admin user ID matches
      if (userId === '2e8fce25-0d63-4148-abd9-2653c31d9b0c') {
        console.log('User is admin via hardcoded ID match');
        return true;
      }
      
      // Check njalasankhulani@gmail.com - an admin email
      if (user?.email === 'njalasankhulani@gmail.com' || 
          user?.email === 'sfadmin') {
        console.log('User is admin via email match');
        return true;
      }

      // Finally, check user_roles table
      const { data, error } = await supabase.rpc('has_role', { 
        _user_id: userId,
        _role: 'admin'
      });
      
      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
      
      console.log('Admin check via user_roles:', data);
      return !!data;
    } catch (error) {
      console.error('Error in checkIsAdmin:', error);
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
          
          // Check if user is admin
          const adminStatus = await checkIsAdmin(extendedUser.id);
          setIsAdmin(adminStatus);
          console.log(`User ${extendedUser.id} admin status set to:`, adminStatus);

          // Handle authentication events
          if (event === 'SIGNED_IN') {
            // For admin user (sfadmin), check if they're in the user_roles table
            if (extendedUser.email === 'sfadmin' || 
                extendedUser.email === 'njalasankhulani@gmail.com' || 
                extendedUser.id === '2e8fce25-0d63-4148-abd9-2653c31d9b0c') {
              try {
                // Use type assertions to work around TypeScript errors with Supabase client
                const { data, error } = await supabase.rpc('has_role', { 
                  _user_id: extendedUser.id,
                  _role: 'admin'
                });
                
                if (!error && !data) {
                  // Add admin role if not already present
                  console.log('Adding admin role for user', extendedUser.id);
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
        
        // Check if user is admin
        const adminStatus = await checkIsAdmin(extendedUser.id);
        setIsAdmin(adminStatus);
        console.log(`Initial: User ${extendedUser.id} admin status set to:`, adminStatus);
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
