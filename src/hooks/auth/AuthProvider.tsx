
import React, { useState } from 'react';
import { useAuthState } from './useAuthState';
import { useAuthActions } from './useAuthActions';
import { AuthContext } from './AuthContext';

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get auth state
  const { 
    user, 
    session, 
    isLoading, 
    isAdmin, 
    isEmailVerified, 
    adminCheckComplete,
    setUser, 
    setSession 
  } = useAuthState();
  
  // Get auth actions
  const { 
    signUp, 
    signIn, 
    signOut, 
    resetPassword, 
    updateUser, 
    updatePassword,
    refreshSession,
    checkOrganizationCode
  } = useAuthActions(setUser, setSession);
  
  // Provide auth context to children
  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAdmin,
      isEmailVerified,
      adminCheckComplete,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updateUser,
      updatePassword,
      refreshSession,
      checkOrganizationCode
    }}>
      {children}
    </AuthContext.Provider>
  );
};
