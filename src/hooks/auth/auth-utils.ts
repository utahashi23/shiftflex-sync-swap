
import { supabase } from "./supabase-client";

// Check organization code validity
export const checkOrganizationCode = async (code: string): Promise<boolean> => {
  // Simulate a network request with a small delay for UX
  return new Promise((resolve) => {
    setTimeout(() => {
      // For now, hardcode the validation
      resolve(code === "AV-SS25");
    }, 500);
  });
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
  // Special case for the admin user
  if (email === 'sfadmin' && password === 'EzySodha1623%') {
    console.log("Admin login attempt");
  }
  
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
