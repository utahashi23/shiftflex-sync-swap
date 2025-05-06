
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
    console.log('Handling OPTIONS preflight request');
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request body
    const { match_id } = await req.json()
    
    if (!match_id) {
      return new Response(
        JSON.stringify({ error: 'Match ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Get the user id from the auth token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Use the service role to bypass RLS policies
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // 1. Get the match details
    const { data: match, error: matchError } = await serviceClient
      .from('shift_swap_potential_matches')
      .select('*')
      .eq('id', match_id)
      .single()
      
    if (matchError || !match) {
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }
    
    // 2. Get the requests involved
    const { data: requesterRequest, error: reqError } = await serviceClient
      .from('shift_swap_requests')
      .select('*')
      .eq('id', match.requester_request_id)
      .single()
      
    const { data: acceptorRequest, error: accError } = await serviceClient
      .from('shift_swap_requests')
      .select('*')
      .eq('id', match.acceptor_request_id)
      .single()
      
    if (reqError || accError || !requesterRequest || !acceptorRequest) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve swap request details' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // 3. Verify the user can accept this match
    const userIsRequester = requesterRequest.requester_id === user.id
    const userIsAcceptor = acceptorRequest.requester_id === user.id
    
    if (!userIsRequester && !userIsAcceptor) {
      return new Response(
        JSON.stringify({ error: 'You are not authorized to accept this match' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    
    // 4. Update the match status to accepted
    const { data: updateResult, error: updateError } = await serviceClient
      .from('shift_swap_potential_matches')
      .update({ status: 'accepted' })
      .eq('id', match_id)
      .select()
      .single()
      
    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to accept match', details: updateError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // 5. Mark conflicts - update any other pending matches involving these shifts to 'otherAccepted'
    // when a different user has already accepted a swap for these shifts
    const conflictingShiftIds = [match.requester_shift_id, match.acceptor_shift_id]
    const conflictingRequestIds = [match.requester_request_id, match.acceptor_request_id]
    
    // Find all other pending matches that involve these shifts or requests
    const { data: conflictingMatches, error: conflictError } = await serviceClient
      .from('shift_swap_potential_matches')
      .select('id')
      .eq('status', 'pending')
      .neq('id', match_id)
      .or(
        `requester_shift_id.in.(${conflictingShiftIds.join(',')}),` +
        `acceptor_shift_id.in.(${conflictingShiftIds.join(',')}),` +
        `requester_request_id.in.(${conflictingRequestIds.join(',')}),` +
        `acceptor_request_id.in.(${conflictingRequestIds.join(',')})`
      )
      
    if (!conflictError && conflictingMatches && conflictingMatches.length > 0) {
      console.log(`Marking ${conflictingMatches.length} matches as otherAccepted due to accepted match ${match_id}`);
      
      // Mark all these matches as otherAccepted
      const conflictingIds = conflictingMatches.map(m => m.id);
      
      await serviceClient
        .from('shift_swap_potential_matches')
        .update({ status: 'otherAccepted' })
        .in('id', conflictingIds);
    }
    
    return new Response(
      JSON.stringify({ success: true, match: updateResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error) {
    console.error('Error processing request:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
