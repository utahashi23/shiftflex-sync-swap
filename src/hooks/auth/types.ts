
import { Session, User, UserResponse, AuthError, AuthTokenResponse } from "@supabase/supabase-js";
import { ExtendedUser } from "./supabase-client";

export type AuthContextType = {
  user: ExtendedUser | null;
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
