
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Get the request body
    const { match_id } = await req.json();

    if (!match_id) {
      return new Response(
        JSON.stringify({ error: 'Missing match_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing accept_swap_match for match ID: ${match_id}`);

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Use service role for operations that might be restricted by RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check if the match exists first
    const { data: matchData, error: matchError } = await supabaseAdmin
      .from('leave_swap_matches')
      .select('id, status')
      .eq('id', match_id)
      .single();

    if (matchError) {
      console.error(`Error fetching match: ${matchError.message}`);
      return new Response(
        JSON.stringify({ error: `Error fetching match: ${matchError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!matchData) {
      console.error(`Match with ID ${match_id} not found`);
      return new Response(
        JSON.stringify({ error: `Match with ID ${match_id} not found` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Don't attempt to update if already accepted
    if (matchData.status === 'accepted') {
      return new Response(
        JSON.stringify({ success: true, message: "Match already accepted", data: matchData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found match with status: ${matchData.status}`);
    console.log(`Updating match status to 'accepted' for match ID: ${match_id}`);

    // Update match status to "accepted"
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('leave_swap_matches')
      .update({ status: 'accepted' })
      .eq('id', match_id)
      .select();
    
    if (updateError) {
      console.error(`Error updating match: ${updateError.message}`);
      return new Response(
        JSON.stringify({ error: `Error updating match: ${updateError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Successfully updated match status to accepted:`, updateData);

    // Log the update in the function execution log
    try {
      await supabaseAdmin
        .from('function_execution_log')
        .insert({
          function_name: 'accept_swap_match',
          status: 'success',
          details: `Match ID: ${match_id} status updated to 'accepted'`,
          user_id: req.headers.get('Authorization')?.split(' ')[1] || null
        });
    } catch (logError) {
      console.error('Error logging function execution:', logError);
      // Don't throw here, we don't want to fail the whole function if just the logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: updateData,
        message: "Match successfully accepted" 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in accept_swap_match:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "An unexpected error occurred" 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
