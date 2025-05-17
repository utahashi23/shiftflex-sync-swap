
// Follow this setup guide to integrate the Supabase Edge Functions with your app:
// https://supabase.com/docs/guides/functions/getting-started

import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request body
    const body = await req.json();
    const { match_id } = body;

    if (!match_id) {
      console.error('Missing match_id parameter');
      return new Response(
        JSON.stringify({ error: 'Missing match_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing match_id: ${match_id}`);

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Use service role for operations that might be restricted by RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      console.error('Not authenticated');
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    console.log(`User ${user.id} is accepting swap match ${match_id}`);

    // Get match data
    const { data: matchData, error: matchError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .select(`
        id, 
        status, 
        requester_request_id, 
        acceptor_request_id,
        requester_has_accepted,
        acceptor_has_accepted
      `)
      .eq('id', match_id)
      .single()

    if (matchError) {
      console.error(`Error fetching match: ${matchError.message}`);
      return new Response(
        JSON.stringify({ error: `Error fetching match: ${matchError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!matchData) {
      console.error('Match not found');
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get related requests to determine user roles
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('shift_swap_requests')
      .select(`
        id, 
        requester_id, 
        requester_shift_id
      `)
      .in('id', [matchData.requester_request_id, matchData.acceptor_request_id])

    if (requestsError) {
      console.error(`Error fetching requests: ${requestsError.message}`);
      return new Response(
        JSON.stringify({ error: `Error fetching requests: ${requestsError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!requests || requests.length !== 2) {
      console.error('Related swap requests not found');
      return new Response(
        JSON.stringify({ error: 'Related swap requests not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Determine if the current user is the requester or acceptor
    const requesterRequest = requests.find(r => r.id === matchData.requester_request_id)
    const acceptorRequest = requests.find(r => r.id === matchData.acceptor_request_id)

    if (!requesterRequest || !acceptorRequest) {
      console.error('Could not determine request roles');
      return new Response(
        JSON.stringify({ error: 'Could not determine request roles' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Determine if current user is requester or acceptor
    const isRequester = requesterRequest.requester_id === user.id
    const isAcceptor = acceptorRequest.requester_id === user.id

    if (!isRequester && !isAcceptor) {
      console.error('User is not associated with this match');
      return new Response(
        JSON.stringify({ error: 'User is not associated with this match' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    console.log(`User is ${isRequester ? 'requester' : isAcceptor ? 'acceptor' : 'unknown role'}`);

    // Update the relevant acceptance flag
    let updateData: Record<string, any> = {}
    let updateStatus = matchData.status
    
    if (isRequester) {
      updateData.requester_has_accepted = true
      console.log('Setting requester_has_accepted to true');
    }
    
    if (isAcceptor) {
      updateData.acceptor_has_accepted = true
      console.log('Setting acceptor_has_accepted to true');
    }

    // Check if both users have now accepted
    const bothAccepted = 
      (isRequester && matchData.acceptor_has_accepted) || 
      (isAcceptor && matchData.requester_has_accepted) ||
      (matchData.requester_has_accepted && matchData.acceptor_has_accepted)

    // Update status if both have accepted
    if (bothAccepted) {
      updateStatus = 'accepted'
      updateData.status = updateStatus
      console.log('Both users accepted, setting status to accepted');
    } else if (updateStatus === 'pending') {
      // If previously pending, change to reflect partial acceptance
      updateData.status = 'other_accepted'
      console.log('One user accepted, setting status to other_accepted');
    }

    console.log('Updating match with data:', updateData);

    // Update the match
    const { data: updatedMatch, error: updateError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .update(updateData)
      .eq('id', match_id)
      .select()

    if (updateError) {
      console.error(`Error updating match: ${updateError.message}`);
      return new Response(
        JSON.stringify({ error: `Error updating match: ${updateError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('Successfully updated match');

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: updatedMatch,
        requesterHasAccepted: updateData.requester_has_accepted || matchData.requester_has_accepted,
        acceptorHasAccepted: updateData.acceptor_has_accepted || matchData.acceptor_has_accepted,
        bothAccepted: bothAccepted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in accept_swap_match:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
