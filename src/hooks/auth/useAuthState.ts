
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
    // Flag to track initial setup
    let mounted = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        console.log('Auth state changed event:', event);
        
        setSession(newSession);
        
        if (newSession?.user) {
          // Ensure we're using ExtendedUser type
          const extendedUser = newSession.user as unknown as ExtendedUser;
          setUser(extendedUser);
          setIsEmailVerified(!!extendedUser.email_confirmed_at);
          
          // Check if user is admin directly from the database
          try {
            // First try with RPC function
            const { data: isUserAdmin, error } = await supabase.rpc('has_role', {
              _user_id: extendedUser.id,
              _role: 'admin'
            });
            
            if (!error && mounted) {
              console.log('Admin check result:', isUserAdmin);
              setIsAdmin(!!isUserAdmin);
            } else if (error && mounted) {
              console.error('Error checking admin role:', error);
              
              // Fallback to direct query as a backup method
              const { data: userRoles, error: rolesError } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', extendedUser.id)
                .eq('role', 'admin');
                
              if (!rolesError && userRoles && userRoles.length > 0 && mounted) {
                console.log('User found in user_roles table as admin');
                setIsAdmin(true);
              } else {
                // Final fallback to app_metadata
                setIsAdmin(extendedUser.app_metadata?.role === 'admin');
              }
            }
          } catch (err) {
            if (mounted) {
              console.error('Error in admin role check:', err);
              // Fallback to app_metadata
              setIsAdmin(extendedUser.app_metadata?.role === 'admin');
            }
          }
          
          // Handle specific authentication events
          if (event === 'SIGNED_IN') {
            // Special handling for sfadmin user to ensure they have admin role
            if (extendedUser.email === 'sfadmin@example.com') {
              try {
                // Direct query to check if user is already an admin
                const { data: existingRole } = await supabase
                  .from('user_roles')
                  .select('*')
                  .eq('user_id', extendedUser.id)
                  .eq('role', 'admin')
                  .maybeSingle();
                
                if (!existingRole && mounted) {
                  // Add admin role if not already present
                  await supabase
                    .from('user_roles')
                    .insert({
                      user_id: extendedUser.id,
                      role: 'admin'
                    });
                  
                  // Update state to reflect new admin status
                  setIsAdmin(true);
                }
              } catch (error) {
                console.error("Error checking/setting admin role:", error);
              }
            }
          }
        } else if (mounted) {
          // Clear user state on sign out or session expiration
          setUser(null);
          setIsEmailVerified(false);
          setIsAdmin(false);
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
        setIsEmailVerified(!!extendedUser.email_confirmed_at);
        
        // Check if user is admin directly from the database
        try {
          // First try with RPC function
          const { data: isUserAdmin, error } = await supabase.rpc('has_role', {
            _user_id: extendedUser.id,
            _role: 'admin'
          });
          
          if (!error && mounted) {
            console.log('Initial admin check result:', isUserAdmin);
            setIsAdmin(!!isUserAdmin);
          } else if (error && mounted) {
            console.error('Error in initial admin check:', error);
            
            // Fallback to direct query
            const { data: userRoles, error: rolesError } = await supabase
              .from('user_roles')
              .select('*')
              .eq('user_id', extendedUser.id)
              .eq('role', 'admin');
              
            if (!rolesError && userRoles && userRoles.length > 0 && mounted) {
              console.log('User found in user_roles table as admin');
              setIsAdmin(true);
            } else {
              // Final fallback to app_metadata
              setIsAdmin(extendedUser.app_metadata?.role === 'admin');
            }
          }
        } catch (err) {
          if (mounted) {
            console.error('Error in initial admin role check:', err);
            // Fallback to app_metadata
            setIsAdmin(extendedUser.app_metadata?.role === 'admin');
          }
        }
      }
      
      if (mounted) {
        setIsLoading(false);
      }
    }).catch(error => {
      if (mounted) {
        console.error('Error getting session:', error);
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
