
import { createContext, useContext, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContextType } from "./types";
import { useAuthState } from "./useAuthState";
import { useAuthActions } from "./useAuthActions";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      const result = await signOutAction();
      
      // Clear local state regardless of API success
      if (user || session) {
        setUser(null);
        setSession(null);
      }
      
      // Return void instead of a boolean to match the type in AuthContextType
      return;
    } catch (error) {
      console.error("Error in signOut:", error);
      // Still return void to match the expected type
      return;
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
