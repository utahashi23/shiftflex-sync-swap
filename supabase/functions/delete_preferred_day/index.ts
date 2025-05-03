
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    const { day_id, request_id } = await req.json();

    if (!day_id || !request_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // First, delete the preferred date
    const { error: deleteError } = await supabaseClient
      .from('shift_swap_preferred_dates')
      .delete()
      .eq('id', day_id);
      
    if (deleteError) {
      console.error('Error deleting preferred date:', deleteError);
      throw deleteError;
    }
    
    // Check if any preferred dates remain
    const { data: remainingDates, error: countError } = await supabaseClient
      .from('shift_swap_preferred_dates')
      .select('id')
      .eq('request_id', request_id);
      
    if (countError) {
      console.error('Error checking remaining dates:', countError);
      throw countError;
    }
    
    // If no dates left, delete the request using the safe RPC function
    let requestDeleted = false;
    
    if (!remainingDates || remainingDates.length === 0) {
      const { error: requestError } = await supabaseClient.rpc(
        'delete_swap_request_safe', 
        { p_request_id: request_id }
      );
        
      if (requestError) {
        console.error('Error deleting swap request:', requestError);
        throw requestError;
      }
      
      requestDeleted = true;
    }

    return new Response(
      JSON.stringify({ success: true, requestDeleted: requestDeleted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in delete_preferred_day function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
