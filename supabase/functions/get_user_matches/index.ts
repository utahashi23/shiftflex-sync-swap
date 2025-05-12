
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
    const { 
      user_id, 
      user_perspective_only = true, 
      user_initiator_only = true,
      include_colleague_types = true,
      include_shift_data = true
    } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // For admin operations, use the service role client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Query for potential matches involving this user
    // Fix the SQL syntax error and remove reference to requester_id column
    const { data: potentialMatches, error: matchesError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .select(`
        id,
        status,
        requester_request_id,
        acceptor_request_id,
        requester_shift_id,
        acceptor_shift_id,
        match_date,
        created_at
      `)
      .or(`requester_request_id.in.(select id from shift_swap_requests where requester_id='${user_id}'),acceptor_request_id.in.(select id from shift_swap_requests where requester_id='${user_id}')`)
      .order('created_at', { ascending: false })

    if (matchesError) {
      throw new Error(`Error fetching potential matches: ${matchesError.message}`)
    }

    if (!potentialMatches || potentialMatches.length === 0) {
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Collect all the request IDs we need to fetch
    const requestIds = new Set<string>()
    const shiftIds = new Set<string>()
    
    potentialMatches.forEach(match => {
      requestIds.add(match.requester_request_id)
      requestIds.add(match.acceptor_request_id)
      if (include_shift_data) {
        shiftIds.add(match.requester_shift_id)
        shiftIds.add(match.acceptor_shift_id)
      }
    })

    // Fetch all requests in one go
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('shift_swap_requests')
      .select('id, requester_id, requester_shift_id, status')
      .in('id', Array.from(requestIds))

    if (requestsError) {
      throw new Error(`Error fetching requests: ${requestsError.message}`)
    }

    // Create a map of request id -> request data
    const requestMap = new Map()
    requests.forEach(req => {
      requestMap.set(req.id, req)
    })

    // Fetch all shifts if needed
    let shifts = []
    let shiftMap = new Map()
    
    if (include_shift_data && shiftIds.size > 0) {
      const { data: shiftsData, error: shiftsError } = await supabaseAdmin
        .from('shifts')
        .select('id, date, start_time, end_time, truck_name, user_id, colleague_type')
        .in('id', Array.from(shiftIds))

      if (shiftsError) {
        throw new Error(`Error fetching shifts: ${shiftsError.message}`)
      }

      shifts = shiftsData
      
      // Create a map of shift id -> shift data
      shiftsData.forEach(shift => {
        shiftMap.set(shift.id, shift)
      })
    }

    // Fetch all user profiles for involved users
    const userIds = new Set<string>()
    requests.forEach(req => {
      userIds.add(req.requester_id)
    })

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, employee_id')
      .in('id', Array.from(userIds))

    if (profilesError) {
      throw new Error(`Error fetching profiles: ${profilesError.message}`)
    }

    // Create a map of user id -> profile data
    const profileMap = new Map()
    profiles.forEach(profile => {
      profileMap.set(profile.id, profile)
    })

    // Process matches from the user's perspective
    const results = potentialMatches.map(match => {
      // Determine if this user is the requester or acceptor in this match
      const requesterRequest = requestMap.get(match.requester_request_id)
      const acceptorRequest = requestMap.get(match.acceptor_request_id)
      
      if (!requesterRequest || !acceptorRequest) {
        console.log(`Missing request data for match ${match.id}`)
        return null
      }
      
      const isRequester = requesterRequest.requester_id === user_id
      const isAcceptor = acceptorRequest.requester_id === user_id
      
      if (!isRequester && !isAcceptor) {
        console.log(`User ${user_id} not involved in match ${match.id}`)
        return null
      }
      
      // Determine which is "my" request vs "other" request
      const myRequest = isRequester ? requesterRequest : acceptorRequest
      const otherRequest = isRequester ? acceptorRequest : requesterRequest
      
      // Get shift data
      const myShift = isRequester ? 
        shiftMap.get(match.requester_shift_id) : 
        shiftMap.get(match.acceptor_shift_id)
        
      const otherShift = isRequester ?
        shiftMap.get(match.acceptor_shift_id) :
        shiftMap.get(match.requester_shift_id)
      
      if (!myShift || !otherShift) {
        console.log(`Missing shift data for match ${match.id}`)
        return null
      }
      
      // Get user profile data
      const otherProfile = profileMap.get(otherRequest.requester_id)
      
      if (!otherProfile) {
        console.log(`Missing profile for user ${otherRequest.requester_id}`)
      }
      
      const otherUserName = otherProfile ? 
        `${otherProfile.first_name || ''} ${otherProfile.last_name || ''}`.trim() : 
        'Unknown User'
      
      // Determine status from the user's perspective
      let userPerspectiveStatus = match.status
      
      // Store the requester_id for this match to track who accepted it
      // We can determine this from the requests data instead
      const matchRequesterId = requesterRequest.requester_id
      
      // If the match is in 'accepted' status but current user is not the one who accepted it
      if (match.status === 'accepted' && matchRequesterId && matchRequesterId !== user_id) {
        userPerspectiveStatus = 'other_accepted'
      }
      
      return {
        match_id: match.id,
        match_status: userPerspectiveStatus, // Use the perspective-adjusted status
        created_at: match.created_at,
        my_request_id: myRequest.id,
        my_shift_id: myShift.id,
        my_shift_date: myShift.date,
        my_shift_start_time: myShift.start_time,
        my_shift_end_time: myShift.end_time,
        my_shift_truck: myShift.truck_name,
        my_shift_colleague_type: myShift.colleague_type,
        other_request_id: otherRequest.id,
        other_user_id: otherRequest.requester_id,
        other_user_name: otherUserName,
        other_shift_id: otherShift.id,
        other_shift_date: otherShift.date, 
        other_shift_start_time: otherShift.start_time,
        other_shift_end_time: otherShift.end_time,
        other_shift_truck: otherShift.truck_name,
        other_shift_colleague_type: otherShift.colleague_type,
        other_employee_id: otherProfile?.employee_id
      }
    })
    
    // Filter out null results
    const validResults = results.filter(result => result !== null)
    
    console.log(`Returning ${validResults.length} matches for user ${user_id}`)

    return new Response(
      JSON.stringify(validResults),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in get_user_matches:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
