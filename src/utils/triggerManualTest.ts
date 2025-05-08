
import { supabase } from "@/integrations/supabase/client";

// Create a global function that can be called from the browser console
// This makes the function accessible without import statements
if (typeof window !== 'undefined') {
  console.log('Test functions are now available in console');
}
