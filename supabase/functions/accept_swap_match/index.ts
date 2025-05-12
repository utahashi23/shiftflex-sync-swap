
// Follow this setup guide to integrate the Supabase Edge Functions with your app:
// https://supabase.com/docs/guides/functions/getting-started

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Get the current user ID
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error(`Error getting user: ${userError?.message || 'User not found'}`);
    }
    
    const current_user_id = user.id;
    console.log(`Current user ID: ${current_user_id}`);

    // First, get the match details to obtain user IDs and shift information
    const { data: matchData, error: matchError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .select(`
        id,
        status,
        requester_request_id,
        acceptor_request_id,
        requester_shift_id,
        acceptor_shift_id
      `)
      .eq('id', match_id)
      .single();
    
    if (matchError) {
      throw new Error(`Error fetching match: ${matchError.message}`);
    }

    if (!matchData) {
      throw new Error('Match not found');
    }

    console.log(`Found match data:`, matchData);

    // Fetch the request data to get user IDs
    const requestsPromises = [
      supabaseAdmin
        .from('shift_swap_requests')
        .select('requester_id, requester_shift_id')
        .eq('id', matchData.requester_request_id)
        .single(),
      supabaseAdmin
        .from('shift_swap_requests')
        .select('requester_id, requester_shift_id')
        .eq('id', matchData.acceptor_request_id)
        .single()
    ];

    const [requesterRequest, acceptorRequest] = await Promise.all(requestsPromises);
    
    if (requesterRequest.error) {
      throw new Error(`Error fetching requester request: ${requesterRequest.error.message}`);
    }
    
    if (acceptorRequest.error) {
      throw new Error(`Error fetching acceptor request: ${acceptorRequest.error.message}`);
    }

    const requesterUserId = requesterRequest.data.requester_id;
    const acceptorUserId = acceptorRequest.data.requester_id;
    
    console.log(`Users involved: Requester ID: ${requesterUserId}, Acceptor ID: ${acceptorUserId}`);
    
    // Check which user is accepting (requester or acceptor)
    const isRequesterAccepting = current_user_id === requesterUserId;
    const isAcceptorAccepting = current_user_id === acceptorUserId;
    
    if (!isRequesterAccepting && !isAcceptorAccepting) {
      throw new Error("You are not involved in this swap match");
    }
    
    let newStatus = 'accepted';
    
    // Handle the two-step acceptance process
    if (matchData.status === 'pending') {
      // First user accepting
      newStatus = 'accepted';
      console.log(`First user acceptance - Setting status to ${newStatus}`);
    } 
    else if (matchData.status === 'accepted' || matchData.status === 'other_accepted') {
      // Second user accepting
      newStatus = 'dual_accepted';
      console.log(`Second user acceptance - Setting status to ${newStatus}`);
    }
    else if (matchData.status === 'dual_accepted') {
      // Already dual accepted
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "This swap has already been accepted by both users",
          status: matchData.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Update match status
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .update({ 
        status: newStatus,
        // Store who accepted this swap (for UI determination)
        ...(newStatus === 'accepted' ? { requester_id: current_user_id } : {})
      })
      .eq('id', match_id)
      .select();
    
    if (updateError) {
      throw new Error(`Error updating match: ${updateError.message}`);
    }

    console.log(`Successfully updated match status to ${newStatus}`);

    // Send emails only if both users have accepted
    if (newStatus === 'dual_accepted') {
      try {
        // Call the resend_swap_notification edge function to handle the email sending
        const emailResponse = await supabaseAdmin.functions.invoke('resend_swap_notification', {
          body: { match_id }
        });
        
        if (emailResponse.error) {
          console.error(`Error sending notification emails: ${emailResponse.error.message}`);
        } else {
          console.log('Successfully sent notification emails');
        }
      } catch (emailError) {
        console.error('Error sending emails:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: updateData,
        status: newStatus,
        message: newStatus === 'dual_accepted' 
          ? "Both users have accepted the swap" 
          : "You have accepted the swap"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in accept_swap_match:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
