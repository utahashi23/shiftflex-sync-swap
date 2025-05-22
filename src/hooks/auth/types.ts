
import { User, Session, UserAppMetadata } from '@supabase/supabase-js';
import { AppRole } from '@/types/database';

export interface ExtendedUser extends User {
  app_metadata: UserAppMetadata & {
    role?: AppRole;
  };
  email_confirmed_at?: string | null; 
  organization?: string | null;
}

export interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isEmailVerified: boolean;
  signUp: (email: string, password: string, metadata?: { firstName?: string, lastName?: string, organization?: string, organizationCode?: string, employeeId?: string }) => Promise<{ success: boolean; error?: any }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: any }>;
  signOut: () => Promise<void>; // Changed from boolean to void to match implementation
  resetPassword: (email: string) => Promise<{ success: boolean; error?: any }>;
  updateUser: (data: { firstName?: string; lastName?: string; employeeId?: string; }) => Promise<{ success: boolean; error?: any }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: any }>;
  refreshSession: () => Promise<{ session: Session | null; user: User | null } | void>;
  checkOrganizationCode: (code: string) => Promise<boolean>;
}
