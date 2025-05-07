
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContextType } from "./types";
import { useAuthState } from "./useAuthState";
import { useAuthActions } from "./useAuthActions";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { 
    user, 
    session, 
    isLoading, 
    isAdmin, 
    isEmailVerified, 
    setUser,
    setSession
  } = useAuthState();

  const {
    signOut: signOutAction,
    refreshSession,
    signUp,
    signIn,
    resetPassword,
    updateUser,
    updatePassword,
    checkOrganizationCode,
  } = useAuthActions();

  // Enhanced sign out to ensure state is cleared and user is redirected
  const signOut = async () => {
    try {
      // Clear local state immediately - this ensures UI updates even if API call fails
      setUser(null);
      setSession(null);
      
      // Force navigation to home immediately
      navigate('/', { replace: true });
      
      // Then attempt to sign out from Supabase (this happens after redirect)
      await signOutAction();
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error in signOut:", error);
      // Even if the API call fails, we've already cleared the local state and redirected
      return Promise.reject(error);
    }
  };

  const value: AuthContextType = {
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
