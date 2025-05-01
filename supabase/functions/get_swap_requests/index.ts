
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
    const { user_id, status = 'pending' } = await req.json()

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
      // This way your row-level-security (RLS) policies are applied.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Fetch the user's pending swap requests
    const { data: requests, error: requestsError } = await supabaseClient
      .from('swap_requests')
      .select('id, status, shift_id, created_at')
      .eq('user_id', user_id)
      .eq('status', status)
      
    if (requestsError) {
      throw requestsError
    }
    
    if (!requests || requests.length === 0) {
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
    
    // Get all shift IDs
    const shiftIds = requests.map(req => req.shift_id)
    
    // Fetch shift data
    const { data: shifts, error: shiftsError } = await supabaseClient
      .from('shifts')
      .select('id, date, start_time, end_time, truck_name')
      .in('id', shiftIds)
      
    if (shiftsError) {
      throw shiftsError
    }
    
    // Create a map for quick lookup
    const shiftsMap = {}
    shifts.forEach(shift => {
      shiftsMap[shift.id] = shift
    })
    
    // Fetch preferred days for these requests
    const requestIds = requests.map(req => req.id)
    
    const { data: preferredDays, error: daysError } = await supabaseClient
      .from('preferred_days')
      .select('id, swap_request_id, date, accepted_types')
      .in('swap_request_id', requestIds)
      
    if (daysError) {
      throw daysError
    }
    
    // Group preferred days by request ID
    const preferredDaysByRequest = {}
    preferredDays.forEach(day => {
      if (!preferredDaysByRequest[day.swap_request_id]) {
        preferredDaysByRequest[day.swap_request_id] = []
      }
      preferredDaysByRequest[day.swap_request_id].push(day)
    })
    
    // Join the data together
    const result = requests.map(request => {
      return {
        id: request.id,
        status: request.status,
        shift: shiftsMap[request.shift_id],
        preferred_days: preferredDaysByRequest[request.id] || []
      }
    })

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
