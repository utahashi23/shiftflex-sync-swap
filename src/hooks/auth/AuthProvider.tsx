
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
    isEmailVerified 
  } = useAuthState();

  const {
    signOut,
    refreshSession,
    signUp,
    signIn,
    resetPassword,
    updateUser,
    updatePassword,
    checkOrganizationCode,
  } = useAuthActions();

  // Handle authentication events in useEffect inside useAuthState

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
