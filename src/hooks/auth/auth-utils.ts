
import { supabase } from "./supabase-client";

// Check organization code validity
export const checkOrganizationCode = (organization: string, code: string): boolean => {
  // For now, hardcode the validation
  return organization === "Ambulance Victoria" && code === "AV-SS25";
};

// Sign up function
export const signUp = async (email: string, password: string, metadata: any) => {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
};

// Sign in function
export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
};

// Reset password function
export const resetPassword = async (email: string) => {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
};

// Update user function
export const updateUser = async (updates: any) => {
  return await supabase.auth.updateUser(updates);
};

// Update password function
export const updatePassword = async (password: string) => {
  return await supabase.auth.updateUser({ password });
};
