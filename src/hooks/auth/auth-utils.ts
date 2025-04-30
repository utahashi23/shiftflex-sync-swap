
import { supabase } from "./supabase-client";

// Check organization code validity
export const checkOrganizationCode = (code: string): boolean => {
  // For now, hardcode the validation
  return code === "AV-SS25";
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
    console.log("Admin login attempt - using special admin credentials");
    return await supabase.auth.signInWithPassword({
      email: 'admin@shiftflex.com',
      password: 'EzySodha1623%',
    });
  }
  
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
};

// Create admin user function (for initial setup)
export const createAdminUser = async () => {
  try {
    // Check if admin user already exists
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@shiftflex.com',
      password: 'EzySodha1623%',
    });
    
    if (user) {
      console.log("Admin user already exists");
      return { exists: true, user };
    }
    
    // Create admin user if it doesn't exist
    const { data, error } = await supabase.auth.signUp({
      email: 'admin@shiftflex.com',
      password: 'EzySodha1623%',
      options: {
        data: {
          first_name: 'Admin',
          last_name: 'User',
        },
      },
    });

    if (error) {
      console.error("Error creating admin user:", error);
      return { exists: false, error };
    }

    // Add admin role for the user
    if (data.user) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: 'admin'
        });

      if (roleError) {
        console.error("Error setting admin role:", roleError);
      }
    }

    return { exists: false, user: data.user };
  } catch (error) {
    console.error("Error in createAdminUser:", error);
    return { exists: false, error };
  }
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
