
// Scheduled function that runs hourly to check for match notifications
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // This function is triggered on schedule, but can also be invoked manually
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Hourly match notification check started at:", new Date().toISOString());
    
    // Create Supabase client with admin role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // Call the main check_matches_and_notify function
    const { data, error } = await supabaseAdmin.functions.invoke("check_matches_and_notify", {
      body: { triggered_at: new Date().toISOString(), scheduled: true }
    });
    
    if (error) {
      throw new Error(`Error invoking check_matches_and_notify: ${error.message}`);
    }
    
    console.log("Hourly check completed with result:", data);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Hourly match notification check completed", 
        result: data,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in hourly_match_notification function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || String(error),
        timestamp: new Date().toISOString() 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
