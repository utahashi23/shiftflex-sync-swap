
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
    const { user_id, force_check = true, verbose = false, user_perspective_only = true, user_initiator_only = true, include_colleague_types = true, include_shift_data = true } = await req.json()

    if (!user_id) {
      throw new Error('Missing user_id parameter')
    }

    console.log(`Processing request for user_id: ${user_id}, verbose: ${verbose}, force_check: ${force_check}, user_perspective_only: ${user_perspective_only}, user_initiator_only: ${user_initiator_only}, include_colleague_types: ${include_colleague_types}`)

    // Create a Supabase admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('Using service role to fetch user\'s requests...')

    // Fetch all pending requests for the user
    const { data: userRequests, error: userRequestsError } = await supabaseAdmin
      .from('shift_swap_requests')
      .select('*')
      .eq('requester_id', user_id)
      .eq('status', 'matched')

    if (userRequestsError) {
      throw new Error(`Error fetching user requests: ${userRequestsError.message}`)
    }

    console.log(`Found ${userRequests?.length || 0} pending requests for user ${user_id}`)

    // Fetch all pending requests from other users
    const { data: otherRequests, error: otherRequestsError } = await supabaseAdmin
      .from('shift_swap_requests')
      .select('*')
      .neq('requester_id', user_id)
      .eq('status', 'matched')

    if (otherRequestsError) {
      throw new Error(`Error fetching other users' requests: ${otherRequestsError.message}`)
    }

    console.log(`Found ${otherRequests?.length || 0} pending requests from other users`)

    // Fetch all shifts data
    const { data: shiftsData, error: shiftsError } = await supabaseAdmin
      .from('shifts')
      .select('*')

    if (shiftsError) {
      throw new Error(`Error fetching shifts data: ${shiftsError.message}`)
    }
    
    console.log(`Fetched ${shiftsData?.length || 0} shifts data`)
    
    // Log the first shift to check colleague_type field
    if (shiftsData && shiftsData.length > 0) {
      console.log(`First shift from database: ${JSON.stringify(shiftsData[0])}`)
    }

    // Fetch all preferred dates
    const { data: preferredDates, error: preferredDatesError } = await supabaseAdmin
      .from('shift_swap_preferred_dates')
      .select('*')

    if (preferredDatesError) {
      throw new Error(`Error fetching preferred dates: ${preferredDatesError.message}`)
    }

    console.log(`Fetched ${preferredDates?.length || 0} preferred dates`)

    // Group preferred dates by request ID
    const preferredDatesByRequest: Record<string, any[]> = {}
    for (const date of preferredDates || []) {
      if (!preferredDatesByRequest[date.request_id]) {
        preferredDatesByRequest[date.request_id] = []
      }
      preferredDatesByRequest[date.request_id].push(date)
    }

    // Function to check if requests match
    const checkRequestsMatch = (request1: any, request2: any) => {
      // Log the user request
      console.log(`User request ${request1.id} has ${preferredDatesByRequest[request1.id]?.length || 0} preferred dates`)

      // Check if there is a match
      // Implement matching logic - this is simplified, you may want to expand this
      const match = { isMatch: true, reason: "Matched" }
      console.log(`MATCH FOUND between ${request1.id} and ${request2.id}`)
      return match
    }

    // Find potential matches
    const potentialMatches = []

    for (const userRequest of userRequests || []) {
      for (const otherRequest of otherRequests || []) {
        const match = checkRequestsMatch(userRequest, otherRequest)
        if (match.isMatch) {
          potentialMatches.push({ userRequest, otherRequest })
        }
      }
    }

    // Fetch existing matches from the database to avoid duplicates
    const { data: existingMatches, error: existingMatchesError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .select('*')

    if (existingMatchesError) {
      throw new Error(`Error fetching existing matches: ${existingMatchesError.message}`)
    }

    // Create an array to store all matches (existing and new)
    const allMatches = []

    // Process existing matches
    for (const match of existingMatches || []) {
      console.log(`Match already exists: ${JSON.stringify(match)}`)
      
      // Get shift information for this match
      const requesterShiftId = match.requester_shift_id
      const acceptorShiftId = match.acceptor_shift_id
      
      const requesterShift = shiftsData?.find((s) => s.id === requesterShiftId)
      const acceptorShift = shiftsData?.find((s) => s.id === acceptorShiftId)
      
      // Log shift colleague types for debugging
      if (include_colleague_types) {
        console.log(`Processing match with shifts: ${JSON.stringify({
          shift1: {
            id: requesterShiftId,
            colleague_type: requesterShift?.colleague_type
          },
          shift2: {
            id: acceptorShiftId,
            colleague_type: acceptorShift?.colleague_type
          }
        })}`)
      }

      // Get the request information
      const { data: requesterRequest } = await supabaseAdmin
        .from('shift_swap_requests')
        .select('*')
        .eq('id', match.requester_request_id)
        .single()

      const { data: acceptorRequest } = await supabaseAdmin
        .from('shift_swap_requests')
        .select('*')
        .eq('id', match.acceptor_request_id)
        .single()

      // Only include matches that involve this user if user_perspective_only is true
      if (user_perspective_only && 
          requesterRequest?.requester_id !== user_id && 
          acceptorRequest?.requester_id !== user_id) {
        continue
      }
      
      // Get user profiles for display names
      const otherUserId = requesterRequest?.requester_id === user_id 
        ? acceptorRequest?.requester_id 
        : requesterRequest?.requester_id
        
      const { data: otherUserProfile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', otherUserId)
        .single()
      
      // Find if there are other accepted matches using the same shift
      // This is the key part for implementing the "other_accepted" status
      let isOtherAccepted = false;
      
      if (match.status !== 'accepted') {
        // Check if there are any other matches involving these shifts that are already accepted
        const { data: acceptedMatches } = await supabaseAdmin
          .from('shift_swap_potential_matches')
          .select('*')
          .eq('status', 'accepted')
          .or(`requester_shift_id.eq.${requesterShiftId},acceptor_shift_id.eq.${requesterShiftId},requester_shift_id.eq.${acceptorShiftId},acceptor_shift_id.eq.${acceptorShiftId}`)
          .neq('id', match.id)
        
        // If we found any accepted matches involving these shifts, mark this one as "other_accepted"
        if (acceptedMatches && acceptedMatches.length > 0) {
          isOtherAccepted = true;
        }
      }

      // Format the match data for the client
      const matchData = {
        match_id: match.id,
        match_status: match.status,
        created_at: match.created_at,
        match_date: match.match_date,
        // User perspective: which request is theirs vs the other person's
        my_request_id: requesterRequest?.requester_id === user_id 
          ? requesterRequest?.id 
          : acceptorRequest?.id,
        other_request_id: requesterRequest?.requester_id === user_id 
          ? acceptorRequest?.id 
          : requesterRequest?.id,
        // Same for shifts
        my_shift_id: requesterRequest?.requester_id === user_id 
          ? requesterShiftId 
          : acceptorShiftId,
        my_shift_date: requesterRequest?.requester_id === user_id 
          ? requesterShift?.date 
          : acceptorShift?.date,
        my_shift_start_time: requesterRequest?.requester_id === user_id 
          ? requesterShift?.start_time 
          : acceptorShift?.start_time,
        my_shift_end_time: requesterRequest?.requester_id === user_id 
          ? requesterShift?.end_time 
          : acceptorShift?.end_time,
        my_shift_truck: requesterRequest?.requester_id === user_id 
          ? requesterShift?.truck_name 
          : acceptorShift?.truck_name,
        my_shift_colleague_type: requesterRequest?.requester_id === user_id 
          ? requesterShift?.colleague_type 
          : acceptorShift?.colleague_type,
        other_shift_id: requesterRequest?.requester_id === user_id 
          ? acceptorShiftId 
          : requesterShiftId,
        other_shift_date: requesterRequest?.requester_id === user_id 
          ? acceptorShift?.date 
          : requesterShift?.date,
        other_shift_start_time: requesterRequest?.requester_id === user_id 
          ? acceptorShift?.start_time 
          : requesterShift?.start_time,
        other_shift_end_time: requesterRequest?.requester_id === user_id 
          ? acceptorShift?.end_time 
          : requesterShift?.end_time,
        other_shift_truck: requesterRequest?.requester_id === user_id 
          ? acceptorShift?.truck_name 
          : requesterShift?.truck_name,
        other_shift_colleague_type: requesterRequest?.requester_id === user_id 
          ? acceptorShift?.colleague_type 
          : requesterShift?.colleague_type,
        other_user_id: otherUserId,
        other_user_name: otherUserProfile 
          ? `${otherUserProfile.first_name || ''} ${otherUserProfile.last_name || ''}` 
          : 'Unknown User',
        // Flag for "other_accepted" status
        is_other_accepted: isOtherAccepted
      }

      allMatches.push(matchData)
    }
    
    console.log(`Returning ${allMatches.length} formatted matches`)
    
    // Log the first match for debugging
    if (allMatches.length > 0) {
      console.log(`First formatted match: ${JSON.stringify({
        match_id: allMatches[0].match_id,
        my_shift_colleague_type: allMatches[0].my_shift_colleague_type,
        other_shift_colleague_type: allMatches[0].other_shift_colleague_type
      })}`)
    }

    return new Response(JSON.stringify(allMatches), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
