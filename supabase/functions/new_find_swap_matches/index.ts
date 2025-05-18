
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  return null
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get request body with user_id
    const { user_id, verbose = false, force_check = false } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing user_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Finding swap matches for user ${user_id}`)

    // 1. Get user's swap requests
    const { data: userRequests, error: requestsError } = await supabase
      .from('improved_shift_swaps')
      .select('*')
      .eq('requester_id', user_id)
      .eq('status', 'pending')

    if (requestsError) {
      console.error('Error fetching user requests:', requestsError)
      return new Response(
        JSON.stringify({ success: false, error: requestsError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log(`Found ${userRequests?.length || 0} active requests for user ${user_id}`)

    // If no requests found, return empty result
    if (!userRequests || userRequests.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { matches: [] } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Get shift details for user's requests
    const userShiftIds = userRequests.map(req => req.requester_shift_id)
    const { data: userShifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .in('id', userShiftIds)

    if (shiftsError) {
      console.error('Error fetching user shifts:', shiftsError)
      return new Response(
        JSON.stringify({ success: false, error: shiftsError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 3. Get all potential matching requests from other users
    const { data: otherRequests, error: otherRequestsError } = await supabase
      .from('improved_shift_swaps')
      .select('*')
      .neq('requester_id', user_id)
      .eq('status', 'pending')

    if (otherRequestsError) {
      console.error('Error fetching other requests:', otherRequestsError)
      return new Response(
        JSON.stringify({ success: false, error: otherRequestsError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log(`Found ${otherRequests?.length || 0} requests from other users`)

    // If no other requests found, return empty result
    if (!otherRequests || otherRequests.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { matches: [] } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Get shift details for other requests
    const otherShiftIds = otherRequests.map(req => req.requester_shift_id)
    const { data: otherShifts, error: otherShiftsError } = await supabase
      .from('shifts')
      .select('*')
      .in('id', otherShiftIds)

    if (otherShiftsError) {
      console.error('Error fetching other shifts:', otherShiftsError)
      return new Response(
        JSON.stringify({ success: false, error: otherShiftsError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 5. Get all wanted dates for the user's requests
    const userRequestIds = userRequests.map(req => req.id)
    const { data: userWantedDates, error: userWantedDatesError } = await supabase
      .from('improved_swap_wanted_dates')
      .select('*')
      .in('swap_id', userRequestIds)

    if (userWantedDatesError) {
      console.error('Error fetching user wanted dates:', userWantedDatesError)
      return new Response(
        JSON.stringify({ success: false, error: userWantedDatesError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 6. Get all wanted dates for the other requests
    const otherRequestIds = otherRequests.map(req => req.id)
    const { data: otherWantedDates, error: otherWantedDatesError } = await supabase
      .from('improved_swap_wanted_dates')
      .select('*')
      .in('swap_id', otherRequestIds)

    if (otherWantedDatesError) {
      console.error('Error fetching other wanted dates:', otherWantedDatesError)
      return new Response(
        JSON.stringify({ success: false, error: otherWantedDatesError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 7. Get user details for the matches
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', otherRequests.map(req => req.requester_id))

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return new Response(
        JSON.stringify({ success: false, error: profilesError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Process the data and find matches
    const matches = findMatches(
      userRequests,
      otherRequests,
      userShifts,
      otherShifts,
      userWantedDates,
      otherWantedDates,
      profiles
    )

    console.log(`Found ${matches.length} potential matches`)

    return new Response(
      JSON.stringify({ success: true, data: { matches } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

/**
 * Find matches between user requests and other requests
 */
function findMatches(
  userRequests: any[],
  otherRequests: any[],
  userShifts: any[],
  otherShifts: any[],
  userWantedDates: any[],
  otherWantedDates: any[],
  profiles: any[]
) {
  // Create a map of shift details by ID
  const userShiftMap = new Map()
  userShifts.forEach(shift => {
    userShiftMap.set(shift.id, {
      ...shift,
      type: determineShiftType(shift.start_time)
    })
  })

  const otherShiftMap = new Map()
  otherShifts.forEach(shift => {
    otherShiftMap.set(shift.id, {
      ...shift,
      type: determineShiftType(shift.start_time)
    })
  })

  // Create a map of wanted dates by swap ID
  const userWantedDatesMap = new Map()
  userWantedDates?.forEach(date => {
    if (!userWantedDatesMap.has(date.swap_id)) {
      userWantedDatesMap.set(date.swap_id, [])
    }
    userWantedDatesMap.get(date.swap_id).push(date)
  })

  const otherWantedDatesMap = new Map()
  otherWantedDates?.forEach(date => {
    if (!otherWantedDatesMap.has(date.swap_id)) {
      otherWantedDatesMap.set(date.swap_id, [])
    }
    otherWantedDatesMap.get(date.swap_id).push(date)
  })

  // Create a map of profiles by ID
  const profileMap = new Map()
  profiles?.forEach(profile => {
    profileMap.set(profile.id, profile)
  })

  // Find matches based on the specified criteria
  const matches = []

  for (const userRequest of userRequests) {
    const userShift = userShiftMap.get(userRequest.requester_shift_id)
    if (!userShift) continue

    for (const otherRequest of otherRequests) {
      const otherShift = otherShiftMap.get(otherRequest.requester_shift_id)
      if (!otherShift) continue

      // Check for matching criteria
      console.log(`Checking match: User ${userRequest.requester_id} and other user ${otherRequest.requester_id}`)

      // 1. Mutual Swap Dates Check
      const userWantsDates = userWantedDatesMap.get(userRequest.id) || []
      const otherWantsDates = otherWantedDatesMap.get(otherRequest.id) || []

      // Check if user wants other's shift date
      const userWantsOtherDate = userWantsDates.some(d => d.date === otherShift.date)
        || userRequest.wanted_date === otherShift.date
      
      // Check if other user wants user's shift date
      const otherWantsUserDate = otherWantsDates.some(d => d.date === userShift.date)
        || otherRequest.wanted_date === userShift.date

      console.log(`User wants other shift: ${userWantsOtherDate}, Other wants user shift: ${otherWantsUserDate}`)
      console.log(`User shift date: ${userShift.date}, Other shift date: ${otherShift.date}`)

      if (!userWantsOtherDate || !otherWantsUserDate) {
        continue
      }

      // 2. Accepted Types Match Check
      const userAcceptsOtherType = userRequest.accepted_shift_types.includes(otherShift.type)
      const otherAcceptsUserType = otherRequest.accepted_shift_types.includes(userShift.type)

      console.log(`User shift type: ${userShift.type}, Other accepts: ${otherAcceptsUserType}`)
      console.log(`Other shift type: ${otherShift.type}, User accepts: ${userAcceptsOtherType}`)

      if (!userAcceptsOtherType || !otherAcceptsUserType) {
        continue
      }

      // 3. Calculate a compatibility score
      const compatibilityScore = 80 // Base score for meeting all criteria

      // Match found! Add to results
      console.log(`✓ MATCH FOUND! Score: ${compatibilityScore}`)

      const otherProfile = profileMap.get(otherRequest.requester_id) || { first_name: 'Unknown', last_name: 'User' }

      matches.push({
        request1_id: userRequest.id,
        request2_id: otherRequest.id,
        requester1_id: userRequest.requester_id,
        requester2_id: otherRequest.requester_id,
        compatibility_score: compatibilityScore,
        my_shift: {
          id: userShift.id,
          date: userShift.date,
          startTime: userShift.start_time,
          endTime: userShift.end_time,
          type: userShift.type,
          truckName: userShift.truck_name
        },
        other_shift: {
          id: otherShift.id,
          date: otherShift.date,
          startTime: otherShift.start_time,
          endTime: otherShift.end_time,
          type: otherShift.type,
          truckName: otherShift.truck_name,
          userId: otherRequest.requester_id,
          userName: `${otherProfile.first_name} ${otherProfile.last_name}`
        },
        is_requester1: true
      })
    }
  }

  return matches
}

/**
 * Determine shift type based on start time
 */
function determineShiftType(startTime: string): 'day' | 'afternoon' | 'night' {
  const startHour = parseInt(startTime.split(':')[0], 10)
  
  if (startHour <= 8) {
    return 'day'
  } else if (startHour > 8 && startHour < 16) {
    return 'afternoon'
  } else {
    return 'night'
  }
}
