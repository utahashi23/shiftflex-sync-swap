
// Import the existing supabase client from the integrations folder
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { User, Session, UserResponse, AuthError } from "@supabase/supabase-js";

// Extended User type to include the properties we need
export interface ExtendedUser extends User {
  email_verified?: boolean;
}

// Export the supabase client
export const supabase = supabaseClient;
