
import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { 
  createClient,
  SupabaseClient,
  Session,
  User,
  UserResponse,
  AuthError,
  AuthTokenResponse
} from "@supabase/supabase-js";

// In a real app, these would come from environment variables
const supabaseUrl = "https://your-supabase-url.supabase.co";
const supabaseAnonKey = "your-supabase-anon-key";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isEmailVerified: boolean;
  signUp: (email: string, password: string, metadata: any) => Promise<{
    error: AuthError | null;
    data: UserResponse["data"] | null;
  }>;
  signIn: (email: string, password: string) => Promise<{
    error: AuthError | null;
    data: AuthTokenResponse["data"] | null;
  }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{
    error: AuthError | null;
    data: {} | null;
  }>;
  updateUser: (updates: any) => Promise<{
    error: AuthError | null;
    data: UserResponse["data"] | null;
  }>;
  updatePassword: (password: string) => Promise<{
    error: AuthError | null;
    data: UserResponse["data"] | null;
  }>;
  refreshSession: () => Promise<void>;
  checkOrganizationCode: (organization: string, code: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock Supabase client for initial development
// This will be replaced with an actual Supabase integration
const createMockSupabaseClient = () => {
  let currentUser: User | null = null;
  let currentSession: Session | null = null;
  let isAdmin = false;
  
  // For demo purposes, we'll create a predetermined admin user
  const adminUser = {
    id: '123',
    app_metadata: { role: 'admin' },
    user_metadata: {
      first_name: 'Admin',
      last_name: 'User',
      employee_id: 'ADMIN001',
    },
    email: 'sfadmin',
    email_verified: true
  } as User;

  return {
    auth: {
      getUser: async (): Promise<UserResponse> => {
        return { data: { user: currentUser }, error: null };
      },
      getSession: async () => {
        return { data: { session: currentSession }, error: null };
      },
      signUp: async ({ email, password, options }: any) => {
        // In a mock environment, we'll create a user
        const newUser = {
          id: Math.random().toString(36).substring(2, 11),
          email,
          user_metadata: options?.data || {},
          email_verified: false,
        } as User;
        
        // For demo - Create admin user if using predefined credentials
        if (email === 'sfadmin') {
          currentUser = adminUser;
          currentSession = { user: adminUser } as Session;
          isAdmin = true;
          return { 
            data: { user: adminUser, session: currentSession },
            error: null 
          };
        }
        
        currentUser = newUser;
        currentSession = { user: newUser } as Session;
        return { 
          data: { user: newUser, session: currentSession }, 
          error: null 
        };
      },
      signInWithPassword: async ({ email, password }: any) => {
        // For demo - Handle admin login
        if (email === 'sfadmin' && password === 'EzySodha1623%') {
          currentUser = adminUser;
          currentSession = { user: adminUser } as Session;
          isAdmin = true;
          return { 
            data: { user: adminUser, session: currentSession }, 
            error: null 
          };
        }
        
        // For demo - Reject if user hasn't verified email
        if (!currentUser?.email_verified) {
          return { 
            data: { user: currentUser, session: null },
            error: { message: 'Email not verified' } as AuthError 
          };
        }
        
        // For demo - Basic login validation
        if (email === currentUser?.email) {
          currentSession = { user: currentUser } as Session;
          return { 
            data: { user: currentUser, session: currentSession },
            error: null
          };
        }
        
        return { 
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' } as AuthError 
        };
      },
      signOut: async () => {
        currentUser = null;
        currentSession = null;
        isAdmin = false;
        return { error: null };
      },
      resetPasswordForEmail: async (email: string) => {
        return { data: {}, error: null };
      },
      updateUser: async (updates: any) => {
        if (!currentUser) {
          return { data: { user: null }, error: { message: 'Not authenticated' } as AuthError };
        }
        
        currentUser = { ...currentUser, ...updates };
        return { data: { user: currentUser }, error: null };
      },
      onAuthStateChange: (callback: any) => {
        // In a real implementation, this would set up listeners
        return { data: { subscription: { unsubscribe: () => {} } }, error: null };
      }
    }
  } as unknown as SupabaseClient;
};

// Initialize the mock Supabase client
const mockSupabase = createMockSupabaseClient();
const supabase = mockSupabase;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
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
            setUser(userData.user);
            setIsEmailVerified(userData.user.email_verified || false);
            
            // Check if user is admin
            setIsAdmin(userData.user.app_metadata?.role === 'admin');
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
        setUser(session?.user || null);
        
        if (session?.user) {
          setIsEmailVerified(session.user.email_verified || false);
          setIsAdmin(session.user.app_metadata?.role === 'admin');
        } else {
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

  // Check organization code validity
  const checkOrganizationCode = (organization: string, code: string): boolean => {
    // For now, hardcode the validation
    return organization === "Ambulance Victoria" && code === "AV-SS25";
  };

  // Sign up function
  const signUp = async (email: string, password: string, metadata: any) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  };

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

  // Reset password function
  const resetPassword = async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  };

  // Update user function
  const updateUser = async (updates: any) => {
    return await supabase.auth.updateUser(updates);
  };

  // Update password function
  const updatePassword = async (password: string) => {
    return await supabase.auth.updateUser({ password });
  };

  // Refresh session function
  const refreshSession = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session);
      
      if (sessionData.session) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          setUser(userData.user);
          setIsEmailVerified(userData.user.email_verified || false);
          setIsAdmin(userData.user.app_metadata?.role === 'admin');
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
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateUser,
    updatePassword,
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
