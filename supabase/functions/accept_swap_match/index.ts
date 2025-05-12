
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

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.log('No Authorization header found');
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required', 
          details: 'No authorization header found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function
      { global: { headers: { Authorization: authHeader } } }
    );

    // Use service role for operations that might be restricted by RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError) {
      console.error('Authentication error:', userError.message);
      return new Response(
        JSON.stringify({ error: 'Authentication required', details: userError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    if (!user) {
      console.error('No authenticated user found');
      return new Response(
        JSON.stringify({ error: 'Authentication required', details: 'No user found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log(`Authenticated as user: ${user.id}`);

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
      console.error('Error fetching match:', matchError.message);
      throw new Error(`Error fetching match: ${matchError.message}`);
    }

    if (!matchData) {
      console.error('Match not found');
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
      console.error('Error fetching requester request:', requesterRequest.error.message);
      throw new Error(`Error fetching requester request: ${requesterRequest.error.message}`);
    }
    
    if (acceptorRequest.error) {
      console.error('Error fetching acceptor request:', acceptorRequest.error.message);
      throw new Error(`Error fetching acceptor request: ${acceptorRequest.error.message}`);
    }

    const requesterUserId = requesterRequest.data.requester_id;
    const acceptorUserId = acceptorRequest.data.requester_id;
    
    console.log(`Users involved: Requester ID: ${requesterUserId}, Acceptor ID: ${acceptorUserId}`);

    // Check if the current user is part of this swap
    if (user.id !== requesterUserId && user.id !== acceptorUserId) {
      console.error('User not authorized to accept this swap');
      return new Response(
        JSON.stringify({ error: 'You are not authorized to accept this swap match' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Record the user's acceptance in the shift_swap_acceptances table
    const { data: acceptanceData, error: acceptanceError } = await supabaseAdmin
      .from('shift_swap_acceptances')
      .insert({
        match_id: match_id,
        user_id: user.id
      })
      .select()
      .single();
      
    if (acceptanceError) {
      // If it's a duplicate acceptance, just continue
      if (acceptanceError.code === '23505') {
        console.log(`User ${user.id} has already accepted this match`);
      } else {
        console.error('Error recording acceptance:', acceptanceError.message);
        throw new Error(`Error recording acceptance: ${acceptanceError.message}`);
      }
    } else {
      console.log(`Recorded acceptance for user ${user.id}`);
    }
    
    // Check if both users have accepted the swap
    const { data: acceptances, error: checkError } = await supabaseAdmin
      .from('shift_swap_acceptances')
      .select('user_id')
      .eq('match_id', match_id);
      
    if (checkError) {
      console.error('Error checking acceptances:', checkError.message);
      throw new Error(`Error checking acceptances: ${checkError.message}`);
    }
    
    console.log(`Found ${acceptances.length} acceptances for match ${match_id}`);
    
    // If both users have accepted (or if current user is both requester and acceptor)
    const requesterAccepted = acceptances.some(a => a.user_id === requesterUserId);
    const acceptorAccepted = acceptances.some(a => a.user_id === acceptorUserId);
    const bothAccepted = requesterAccepted && acceptorAccepted;
    
    let newStatus = 'pending';
    
    // Determine the new status based on acceptances
    if (bothAccepted || requesterUserId === acceptorUserId) {
      newStatus = 'accepted';
    } else if (user.id === requesterUserId && !acceptorAccepted) {
      // Requester accepted but acceptor hasn't
      newStatus = 'pending';
    } else if (user.id === acceptorUserId && !requesterAccepted) {
      // Acceptor accepted but requester hasn't
      newStatus = 'pending';
    }
    
    // Update match status based on acceptance state
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .update({ status: newStatus })
      .eq('id', match_id)
      .select();
    
    if (updateError) {
      console.error('Error updating match:', updateError.message);
      throw new Error(`Error updating match: ${updateError.message}`);
    }

    console.log(`Successfully updated match status to ${newStatus}`);
    
    // Send email notifications if both have accepted
    if (bothAccepted) {
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

    // Return the updated match data along with acceptance information
    return new Response(
      JSON.stringify({
        success: true, 
        data: { 
          match_id: match_id,
          status: newStatus,
          both_accepted: bothAccepted,
          requester_accepted: requesterAccepted,
          acceptor_accepted: acceptorAccepted,
          current_user_id: user.id,
          requester_id: requesterUserId,
          acceptor_id: acceptorUserId
        }
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
