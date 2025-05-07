
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContextType } from "./types";
import { useAuthState } from "./useAuthState";
import { useAuthActions } from "./useAuthActions";
import { AuthContext } from "./AuthContext";
import { toast } from "@/hooks/use-toast";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { 
    user, 
    session, 
    isLoading, 
    isAdmin, 
    isEmailVerified, 
    authChecked,
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

  // Enhanced sign out to ensure state is cleared and redirect happens correctly
  const signOut = async () => {
    try {
      console.log("Starting sign out process");
      
      // Clear local state first to improve perceived performance
      setUser(null);
      setSession(null);
      
      // Then call the actual sign out action
      const result = await signOutAction();
      
      // Show success toast
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      
      // Force navigation to home page
      console.log("Redirecting to home page after sign out");
      navigate('/', { replace: true });
      
      return;
    } catch (error) {
      console.error("Error in signOut:", error);
      
      // Show error toast
      toast({
        title: "Sign out error",
        description: "There was an issue signing out. Please try again.",
        variant: "destructive",
      });
      
      return;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAdmin,
    isEmailVerified,
    authChecked,
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
