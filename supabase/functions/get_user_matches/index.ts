
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
    const { user_id } = await req.json()

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

    // Now get all swap matches for this user - Fix column selection syntax
    const { data: matches, error: matchesError } = await supabaseClient
      .from('shift_swap_potential_matches')
      .select(`
        id,
        status,
        created_at,
        requester_request_id,
        acceptor_request_id,
        requester_shift_id,
        acceptor_shift_id,
        match_date
      `)
      .or(`requester_request_id.eq.${user_id},acceptor_request_id.eq.${user_id}`)
    
    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      throw matchesError;
    }

    if (!matches || matches.length === 0) {
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Now fetch details for all shifts involved in these matches
    const shiftIds = new Set();
    matches.forEach(match => {
      shiftIds.add(match.requester_shift_id);
      shiftIds.add(match.acceptor_shift_id);
    });

    const { data: shifts, error: shiftsError } = await supabaseClient
      .from('shifts')
      .select('id, date, start_time, end_time, truck_name, user_id')
      .in('id', Array.from(shiftIds));
    
    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError);
      throw shiftsError;
    }

    // Create a map for quick lookup
    const shiftsMap = {};
    shifts.forEach(shift => {
      shiftsMap[shift.id] = shift;
    });

    // Get user IDs for all users involved in these shifts
    const userIds = new Set();
    shifts.forEach(shift => {
      if (shift.user_id !== user_id) {
        userIds.add(shift.user_id);
      }
    });

    // Enrich the matches with shift and user data
    const enrichedMatches = matches.map(match => {
      // Find the shifts for this match
      const requesterShiftId = match.requester_shift_id;
      const acceptorShiftId = match.acceptor_shift_id;
      
      const requesterShift = shiftsMap[requesterShiftId];
      const acceptorShift = shiftsMap[acceptorShiftId];

      // Skip if we're missing shift data
      if (!requesterShift || !acceptorShift) {
        console.warn('Missing shift data for match:', match.id);
        return null;
      }

      // Determine if the current user is the requester or acceptor
      const isRequester = requesterShift.user_id === user_id;
      
      // Based on the user role, set my shift and other shift
      const myShift = isRequester ? requesterShift : acceptorShift;
      const otherShift = isRequester ? acceptorShift : requesterShift;
      const otherUserId = otherShift.user_id;

      return {
        match_id: match.id,
        match_status: match.status,
        created_at: match.created_at,
        match_date: match.match_date,
        my_request_id: isRequester ? match.requester_request_id : match.acceptor_request_id,
        other_request_id: isRequester ? match.acceptor_request_id : match.requester_request_id,
        my_shift_id: myShift.id,
        my_shift_date: myShift.date,
        my_shift_start_time: myShift.start_time,
        my_shift_end_time: myShift.end_time,
        my_shift_truck: myShift.truck_name,
        other_shift_id: otherShift.id,
        other_shift_date: otherShift.date,
        other_shift_start_time: otherShift.start_time,
        other_shift_end_time: otherShift.end_time,
        other_shift_truck: otherShift.truck_name,
        other_user_id: otherUserId
      };
    }).filter(Boolean);

    return new Response(
      JSON.stringify(enrichedMatches),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
