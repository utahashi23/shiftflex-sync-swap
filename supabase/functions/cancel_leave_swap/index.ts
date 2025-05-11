
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { match_id } = await req.json();
    
    if (!match_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing match_id parameter' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Processing cancel_leave_swap for match ID: ${match_id}`);
    
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Use service role for operations that might be restricted by RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // First, get the match details
    const { data: matchData, error: matchError } = await supabaseAdmin
      .from('leave_swap_matches')
      .select('id, status, requester_id, acceptor_id, requester_leave_block_id, acceptor_leave_block_id')
      .eq('id', match_id)
      .single();
    
    if (matchError) {
      console.error("Error fetching match:", matchError);
      throw new Error(`Error fetching match: ${matchError.message}`);
    }
    
    if (!matchData) {
      console.error("Match not found");
      throw new Error('Match not found');
    }
    
    if (matchData.status !== 'accepted') {
      console.log(`Match is in ${matchData.status} state, not 'accepted'. Cannot cancel.`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Match is in ${matchData.status} state. Only accepted matches can be cancelled.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Found match to cancel: ${JSON.stringify(matchData)}`);
    
    // Update the match status back to pending
    const { error: updateMatchError } = await supabaseAdmin
      .from('leave_swap_matches')
      .update({ status: 'pending' })
      .eq('id', match_id);
    
    if (updateMatchError) {
      console.error("Error updating match status:", updateMatchError);
      throw new Error(`Error updating match status: ${updateMatchError.message}`);
    }
    
    // Find associated leave swap requests SPECIFIC to this match only
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('leave_swap_requests')
      .select('id, requester_id, requester_leave_block_id, requested_leave_block_id, status')
      .or([
        `requester_id.eq.${matchData.requester_id},requested_leave_block_id.eq.${matchData.acceptor_leave_block_id}`,
        `requester_id.eq.${matchData.acceptor_id},requested_leave_block_id.eq.${matchData.requester_leave_block_id}`
      ])
      .in('status', ['accepted', 'matched']);
    
    if (requestsError) {
      console.error("Error fetching requests:", requestsError);
      throw new Error(`Error fetching swap requests: ${requestsError.message}`);
    }
    
    console.log(`Found ${requests?.length || 0} associated requests to reset to pending`);
    
    // Update associated requests status back to pending
    if (requests && requests.length > 0) {
      for (const request of requests) {
        const { error: updateRequestError } = await supabaseAdmin
          .from('leave_swap_requests')
          .update({ status: 'pending' })
          .eq('id', request.id);
        
        if (updateRequestError) {
          console.error(`Error updating request ${request.id}:`, updateRequestError);
          // Continue with other requests even if one fails
        } else {
          console.log(`Successfully updated request ${request.id} back to pending`);
        }
      }
    }
    
    // Get the updated match data
    const { data: updatedMatch, error: updatedMatchError } = await supabaseAdmin
      .from('leave_swap_matches')
      .select('id, status, requester_id, acceptor_id, requester_leave_block_id, acceptor_leave_block_id')
      .eq('id', match_id)
      .single();
    
    if (updatedMatchError) {
      console.error("Error fetching updated match:", updatedMatchError);
      // Continue with the response even if getting the updated data fails
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Match cancelled successfully and returned to pending status',
        data: updatedMatch || matchData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error in cancel_leave_swap function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
