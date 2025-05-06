
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
    const { match_id } = await req.json()

    if (!match_id) {
      return new Response(
        JSON.stringify({ error: 'Missing match_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing complete_swap_match for match ID: ${match_id}`)

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Use admin client for operations that might be restricted by RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // First, get the match details
    const { data: matchData, error: matchError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .select(`
        id,
        status,
        requester_request_id,
        acceptor_request_id
      `)
      .eq('id', match_id)
      .single()
    
    if (matchError) {
      throw new Error(`Error fetching match: ${matchError.message}`)
    }

    if (!matchData) {
      throw new Error('Match not found')
    }

    console.log(`Found match data:`, matchData)

    // Update match status to "completed"
    const { data: updatedMatch, error: updateMatchError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .update({ status: 'completed' })
      .eq('id', match_id)
      .select()
      .single()

    if (updateMatchError) {
      throw new Error(`Error updating match status: ${updateMatchError.message}`)
    }

    console.log(`Successfully updated match status to completed`)

    // NEW CODE: Update both swap requests to completed status
    console.log(`Updating swap requests to completed status: ${matchData.requester_request_id}, ${matchData.acceptor_request_id}`)
    const updateRequestsPromises = [
      // Update requester's request to completed
      supabaseAdmin
        .from('shift_swap_requests')
        .update({ status: 'completed' })
        .eq('id', matchData.requester_request_id),
      
      // Update acceptor's request to completed
      supabaseAdmin
        .from('shift_swap_requests')
        .update({ status: 'completed' })
        .eq('id', matchData.acceptor_request_id)
    ]
    
    const [updateRequesterRequest, updateAcceptorRequest] = await Promise.all(updateRequestsPromises)
    
    if (updateRequesterRequest.error) {
      console.error(`Error updating requester request status: ${updateRequesterRequest.error.message}`)
      // Continue even if there's an error, as the main operation (marking match as completed) succeeded
    }
    
    if (updateAcceptorRequest.error) {
      console.error(`Error updating acceptor request status: ${updateAcceptorRequest.error.message}`)
      // Continue even if there's an error, as the main operation (marking match as completed) succeeded
    }

    return new Response(
      JSON.stringify({ success: true, data: updatedMatch }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in complete_swap_match:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
