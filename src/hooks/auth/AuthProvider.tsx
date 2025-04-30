
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
import { AuthContextType } from "./types";
import { ExtendedUser, supabase } from "./supabase-client";
import { 
  checkOrganizationCode, 
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
    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        // Get current session
        const { data: sessionData } = await supabase.auth.getSession();
        setSession(sessionData.session);
        
        if (sessionData.session) {
          // Get user data
          const { data: userData } = await supabase.auth.getUser();
          
          if (userData.user) {
            // Ensure we're using ExtendedUser type
            const extendedUser = userData.user as ExtendedUser;
            setUser(extendedUser);
            setIsEmailVerified(extendedUser.email_verified || false);
            
            // Check if user is admin
            setIsAdmin(extendedUser.app_metadata?.role === 'admin');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        toast({
          title: "Authentication Error",
          description: "There was a problem retrieving your login status.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
    
    // Listen for auth changes
    const { data } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Ensure we're using ExtendedUser type
          const extendedUser = session.user as ExtendedUser;
          setUser(extendedUser);
          setIsEmailVerified(extendedUser.email_verified || false);
          setIsAdmin(extendedUser.app_metadata?.role === 'admin');
        } else {
          setUser(null);
          setIsEmailVerified(false);
          setIsAdmin(false);
        }

        // Handle authentication events
        switch (event) {
          case 'SIGNED_IN':
            // For demo purposes, we'll navigate to dashboard on sign in
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

    return () => {
      data.subscription.unsubscribe();
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
          const extendedUser = userData.user as ExtendedUser;
          setUser(extendedUser);
          setIsEmailVerified(extendedUser.email_verified || false);
          setIsAdmin(extendedUser.app_metadata?.role === 'admin');
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

  const value = {
    user,
    session,
    isLoading,
    isAdmin,
    isEmailVerified,
    signUp: authSignUp,
    signIn: authSignIn,
    signOut,
    resetPassword: authResetPassword,
    updateUser: authUpdateUser,
    updatePassword: authUpdatePassword,
    refreshSession,
    checkOrganizationCode,
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
