
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// In a real app, these would come from environment variables
const supabaseUrl = "https://ponhfgbpxehsdlxjpszg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbmhmZ2JweGVoc2RseGpwc3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5ODM0NDcsImV4cCI6MjA2MTU1OTQ0N30.-n7sUFjxDJUCpMMA0AGnXlQCkaVt31dER91ZQLO3jDs";

// Mock Supabase client for initial development
// This will be replaced with an actual Supabase integration
const createMockSupabaseClient = () => {
  let currentUser: ExtendedUser | null = null;
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
    email_verified: true,
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as unknown as ExtendedUser;

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
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: {}
        } as unknown as ExtendedUser;
        
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
        if (currentUser && !currentUser.email_verified) {
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

// Import the User and Session types specifically for the extended user type
import { User, Session, UserResponse, AuthError } from "@supabase/supabase-js";

// Extended User type to include the properties we need
export interface ExtendedUser extends User {
  email_verified?: boolean;
}

// Initialize the mock Supabase client
const mockSupabase = createMockSupabaseClient();
export const supabase = mockSupabase;
