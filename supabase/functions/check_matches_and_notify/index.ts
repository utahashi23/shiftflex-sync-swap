
// Follow this setup guide to integrate the Supabase Edge Functions with your app:
// https://supabase.com/docs/guides/functions/getting-started

import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("Starting scheduled check for matches that need notifications")
    
    // Create an admin Supabase client (to bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the current time for logging
    const triggerTime = new Date().toISOString()
    let requestBody = {}
    
    try {
      // Try to parse the request body if it exists
      requestBody = await req.json()
    } catch (e) {
      // No body or invalid JSON - that's fine for this endpoint
      requestBody = { triggered_at: triggerTime }
    }
    
    console.log(`Match notification check triggered at ${triggerTime}`)
    
    // 1. Find matches that need notifications
    // For this demo, we'll check for all 'accepted' matches that haven't been completed yet
    const { data: matchesToNotify, error: matchesError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .select(`
        id,
        status,
        created_at,
        requester_request_id,
        acceptor_request_id,
        requester_shift_id,
        acceptor_shift_id
      `)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
    
    if (matchesError) {
      throw new Error(`Error fetching matches: ${matchesError.message}`)
    }
    
    console.log(`Found ${matchesToNotify?.length || 0} accepted matches that may need notifications`)
    
    // 2. Process each match that needs notifications
    const results = await Promise.all((matchesToNotify || []).map(async (match) => {
      try {
        console.log(`Processing match ${match.id}`)
        
        // Get the requests related to this match
        const { data: requests, error: requestsError } = await supabaseAdmin
          .from('shift_swap_requests')
          .select(`
            id, 
            requester_id,
            profiles:requester_id(
              first_name,
              last_name,
              email,
              employee_id
            )
          `)
          .in('id', [match.requester_request_id, match.acceptor_request_id])
        
        if (requestsError) {
          throw new Error(`Error fetching requests: ${requestsError.message}`)
        }
        
        // Get the shifts related to this match
        const { data: shifts, error: shiftsError } = await supabaseAdmin
          .from('shifts')
          .select(`
            id, 
            date, 
            start_time, 
            end_time, 
            truck_name,
            colleague_type
          `)
          .in('id', [match.requester_shift_id, match.acceptor_shift_id])
        
        if (shiftsError) {
          throw new Error(`Error fetching shifts: ${shiftsError.message}`)
        }
        
        // Format this match data
        return {
          match_id: match.id,
          status: match.status,
          created_at: match.created_at,
          // Add shift colleague types to the response
          my_shift_colleague_type: shifts?.find(s => s.id === match.requester_shift_id)?.colleague_type || 'Unknown',
          other_shift_colleague_type: shifts?.find(s => s.id === match.acceptor_shift_id)?.colleague_type || 'Unknown',
          // Include employee IDs if available for notification purposes
          my_employee_id: requests?.find(r => r.id === match.requester_request_id)?.profiles?.employee_id || 'Unknown',
          other_employee_id: requests?.find(r => r.id === match.acceptor_request_id)?.profiles?.employee_id || 'Unknown'
        }
      } catch (err) {
        console.error(`Error processing match ${match.id}:`, err)
        return {
          match_id: match.id,
          error: err.message
        }
      }
    }))
    
    // Log a sample of the processed matches for debugging
    if (results.length > 0) {
      console.log(`First formatted match:`, results[0])
    }
    
    // 3. Return the results
    console.log(`Returning ${results.length} formatted matches`)
    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error in check_matches_and_notify:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
