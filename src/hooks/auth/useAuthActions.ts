import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "./supabase-client";
import { 
  checkOrganizationCode as checkOrgCode, 
  signUp as authSignUp,
  signIn as authSignIn,
  resetPassword as authResetPassword,
  updateUser as authUpdateUser,
  updatePassword as authUpdatePassword
} from "./auth-utils";

/**
 * Hook to provide authentication actions
 */
export const useAuthActions = () => {
  const navigate = useNavigate();

  // Sign out function
  const signOut = async () => {
    try {
      // Clear the session from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign out error:", error);
        toast({
          title: "Sign out failed",
          description: error.message,
          variant: "destructive",
        });
        return Promise.reject(error);
      }
      
      // Show toast notification for successful sign out
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      
      // Force navigation to the root page with replace to prevent back navigation
      navigate('/', { replace: true });
      
      // Return resolved promise for chaining
      return Promise.resolve();
    } catch (error: any) {
      console.error("Sign out exception:", error);
      toast({
        title: "Sign out failed",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive",
      });
      return Promise.reject(error);
    }
  };

  // Refresh session function
  const refreshSession = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData.session) {
        const { data: userData } = await supabase.auth.getUser();
        return { session: sessionData.session, user: userData.user };
      } else {
        return { session: null, user: null };
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      toast({
        title: "Session Refresh Failed",
        description: "There was a problem refreshing your session.",
        variant: "destructive",
      });
      throw error;
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

  // Sign in implementation
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await authSignIn(email, password);
      if (error) {
        return { success: false, error };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error };
    }
  };

  // Reset password implementation
  const resetPassword = async (email: string) => {
    try {
      const { error } = await authResetPassword(email);
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

  // Update password implementation
  const updatePassword = async (password: string) => {
    try {
      const { error } = await authUpdatePassword(password);
      if (error) {
        return { success: false, error };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error };
    }
  };

  // Check organization code
  const checkOrganizationCode = async (code: string) => {
    return Promise.resolve(checkOrgCode(code));
  };

  return {
    signOut,
    refreshSession,
    signUp,
    signIn,
    resetPassword,
    updateUser,
    updatePassword,
    checkOrganizationCode,
  };
};
