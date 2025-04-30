
import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";
import { AuthContextType, ExtendedUser } from "./types";
import { supabase } from "./supabase-client";
import { AppRole } from "@/types/database";
import { 
  checkOrganizationCode as checkOrgCode, 
  signUp as authSignUp, 
  signIn as authSignIn,
  resetPassword as authResetPassword,
  updateUser as authUpdateUser,
  updatePassword as authUpdatePassword
} from "./auth-utils";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const navigate = useNavigate();

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        
        if (newSession?.user) {
          // Ensure we're using ExtendedUser type
          const extendedUser = newSession.user as unknown as ExtendedUser;
          setUser(extendedUser);
          setIsEmailVerified(extendedUser.email_confirmed_at !== null);
          
          // Check if user is admin
          if (extendedUser.email === 'admin@shiftflex.com') {
            const { data, error } = await supabase.rpc('has_role', { 
              _user_id: extendedUser.id,
              _role: 'admin'
            });
            
            setIsAdmin(!!data && !error);
          } else {
            setIsAdmin(false);
          }

          // Handle authentication events
          if (event === 'SIGNED_IN') {
            // For admin user, check if they're in the user_roles table
            if (extendedUser.email === 'admin@shiftflex.com') {
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
          }
        } else {
          setUser(null);
          setIsEmailVerified(false);
          setIsAdmin(false);
        }

        // Handle authentication events
        switch (event) {
          case 'SIGNED_IN':
            // Navigate to dashboard on sign in
            navigate('/dashboard');
            break;
          case 'SIGNED_OUT':
            // Redirect to login on sign out
            navigate('/login');
            break;
          case 'USER_UPDATED':
            // Handle user updates
            break;
          case 'PASSWORD_RECOVERY':
            // Handle password recovery
            navigate('/reset-password');
            break;
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
        
        // Check admin status properly
        if (extendedUser.email === 'admin@shiftflex.com') {
          supabase.rpc('has_role', { 
            _user_id: extendedUser.id,
            _role: 'admin'
          }).then(({ data, error }) => {
            setIsAdmin(!!data && !error);
          }).catch(() => {
            setIsAdmin(false);
          });
        } else {
          setIsAdmin(false);
        }
      }
      
      setIsLoading(false);
    }).catch(error => {
      console.error('Error getting session:', error);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Sign out function
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Refresh session function
  const refreshSession = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session);
      
      if (sessionData.session) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          // Ensure we're using ExtendedUser type
          const extendedUser = userData.user as unknown as ExtendedUser;
          setUser(extendedUser);
          setIsEmailVerified(extendedUser.email_confirmed_at !== null);
          
          // Check admin status properly
          if (extendedUser.email === 'admin@shiftflex.com') {
            const { data, error } = await supabase.rpc('has_role', { 
              _user_id: extendedUser.id,
              _role: 'admin'
            });
            
            setIsAdmin(!!data && !error);
          } else {
            setIsAdmin(false);
          }
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsEmailVerified(false);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      toast({
        title: "Session Refresh Failed",
        description: "There was a problem refreshing your session.",
        variant: "destructive",
      });
    }
  };

  // Sign up implementation
  const signUp = async (email: string, password: string, metadata?: { firstName?: string, lastName?: string, organization?: string, organizationCode?: string, employeeId?: string }) => {
    try {
      // Transform the metadata to match what the backend expects
      const transformedMetadata = {
        first_name: metadata?.firstName,
        last_name: metadata?.lastName,
        organization: metadata?.organization,
        employee_id: metadata?.employeeId
      };
      
      const { error } = await authSignUp(email, password, transformedMetadata);
      
      if (error) {
        return { success: false, error };
      }
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error };
    }
  };

  // Update user implementation
  const updateUser = async (data: { firstName?: string; lastName?: string; employeeId?: string; }) => {
    try {
      // Transform the data to match what the backend expects
      const updates = {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          employee_id: data.employeeId
        }
      };
      
      const { error } = await authUpdateUser(updates);
      
      if (error) {
        return { success: false, error };
      }
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAdmin,
    isEmailVerified,
    signUp,
    signIn: async (email: string, password: string) => {
      try {
        const { error } = await authSignIn(email, password);
        if (error) {
          return { success: false, error };
        }
        return { success: true };
      } catch (error: any) {
        return { success: false, error };
      }
    },
    signOut,
    resetPassword: async (email: string) => {
      try {
        const { error } = await authResetPassword(email);
        if (error) {
          return { success: false, error };
        }
        return { success: true };
      } catch (error: any) {
        return { success: false, error };
      }
    },
    updateUser,
    updatePassword: async (password: string) => {
      try {
        const { error } = await authUpdatePassword(password);
        if (error) {
          return { success: false, error };
        }
        return { success: true };
      } catch (error: any) {
        return { success: false, error };
      }
    },
    refreshSession,
    checkOrganizationCode: async (code: string) => {
      return Promise.resolve(checkOrgCode(code));
    },
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
