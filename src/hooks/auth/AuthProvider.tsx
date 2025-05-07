
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

  // Enhanced sign out to ensure state is cleared
  const signOut = async () => {
    try {
      await signOutAction();
      // Clear local state regardless of API success
      setUser(null);
      setSession(null);
      return Promise.resolve();
    } catch (error) {
      console.error("Error in signOut:", error);
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
