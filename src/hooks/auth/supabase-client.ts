
// Import the existing supabase client from the integrations folder
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { ExtendedUser } from "./types";

// Export the supabase client
export const supabase = supabaseClient;
export type { ExtendedUser };
