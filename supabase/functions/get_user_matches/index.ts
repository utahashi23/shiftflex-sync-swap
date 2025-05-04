
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
    
    console.log(`Processing request for user_id: ${user_id}`);

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Use a different approach for querying - use two separate queries to avoid filter syntax issues
    const { data: requesterMatches, error: requesterError } = await supabaseClient
      .from('shift_swap_potential_matches')
      .select(`
        id, 
        status, 
        created_at, 
        match_date,
        requester_request_id, 
        acceptor_request_id,
        requester_shift_id,
        acceptor_shift_id,
        shift_swap_requests!requester_request_id(requester_id)
      `)
      .filter('shift_swap_requests.requester_id', 'eq', user_id);
    
    if (requesterError) {
      console.log('Error fetching requester matches:', requesterError);
      throw requesterError;
    }
    
    const { data: acceptorMatches, error: acceptorError } = await supabaseClient
      .from('shift_swap_potential_matches')
      .select(`
        id, 
        status, 
        created_at, 
        match_date,
        requester_request_id, 
        acceptor_request_id,
        requester_shift_id,
        acceptor_shift_id,
        shift_swap_requests!acceptor_request_id(requester_id)
      `)
      .filter('shift_swap_requests.requester_id', 'eq', user_id);
      
    if (acceptorError) {
      console.log('Error fetching acceptor matches:', acceptorError);
      throw acceptorError;
    }
    
    // Combine and deduplicate results
    const allMatches = [...(requesterMatches || []), ...(acceptorMatches || [])];
    const uniqueMatchIds = new Set();
    const existingMatches = allMatches.filter(match => {
      if (uniqueMatchIds.has(match.id)) return false;
      uniqueMatchIds.add(match.id);
      return true;
    });
    
    console.log(`Found ${existingMatches?.length || 0} potential matches that include user ${user_id}`);
    
    if (!existingMatches || existingMatches.length === 0) {
      console.log(`No matches found for user ${user_id}, checking for direct matches...`);
      
      // As a fallback, try to use the RPC function
      const { data: matchesData, error: matchesError } = await supabaseClient
        .rpc('get_user_matches_with_rls', { user_id });
      
      if (matchesError) {
        console.error('Error fetching matches via RPC:', matchesError);
        throw matchesError;
      }
      
      // Ensure we have an array to work with
      const matches = matchesData || [];
      
      // Get only distinct matches by match_id
      const seen = new Set<string>();
      const distinctMatches = matches.filter(match => {
        if (!match || !match.match_id || seen.has(match.match_id)) {
          return false;
        }
        seen.add(match.match_id);
        return true;
      });
      
      console.log(`Found ${distinctMatches.length} potential matches via RPC`);
      
      if (distinctMatches.length === 0) {
        console.log('No matches found for this user via any method');
        return new Response(
          JSON.stringify([]),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      return new Response(
        JSON.stringify(distinctMatches),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Process the matches to format them properly
    const processedMatches = [];
    
    for (const match of existingMatches) {
      // Get the shift data for both sides of the match
      const requesterRequestId = match.requester_request_id;
      const acceptorRequestId = match.acceptor_request_id;
      
      // Get the requester information for both requests
      const { data: requesterData } = await supabaseClient
        .from('shift_swap_requests')
        .select('requester_id')
        .eq('id', requesterRequestId)
        .single();
        
      const { data: acceptorData } = await supabaseClient
        .from('shift_swap_requests')
        .select('requester_id')
        .eq('id', acceptorRequestId)
        .single();
      
      if (!requesterData || !acceptorData) {
        console.log(`Missing request data for match ${match.id}, skipping`);
        continue;
      }
      
      // Determine which request belongs to the current user
      const isRequester = requesterData.requester_id === user_id;
      const isAcceptor = acceptorData.requester_id === user_id;
      
      if (!isRequester && !isAcceptor) {
        console.log(`Match ${match.id} does not involve user ${user_id}, skipping`);
        continue;
      }
      
      // Get shift details for both sides
      let myShiftId, otherShiftId, myRequestId, otherRequestId, otherUserId;
      
      if (isRequester) {
        myShiftId = match.requester_shift_id;
        otherShiftId = match.acceptor_shift_id;
        myRequestId = requesterRequestId;
        otherRequestId = acceptorRequestId;
        otherUserId = acceptorData.requester_id;
      } else {
        myShiftId = match.acceptor_shift_id;
        otherShiftId = match.requester_shift_id;
        myRequestId = acceptorRequestId;
        otherRequestId = requesterRequestId;
        otherUserId = requesterData.requester_id;
      }
      
      // Get shift details
      const { data: myShift } = await supabaseClient
        .from('shifts')
        .select('*')
        .eq('id', myShiftId)
        .single();
        
      const { data: otherShift } = await supabaseClient
        .from('shifts')
        .select('*')
        .eq('id', otherShiftId)
        .single();
        
      if (!myShift || !otherShift) {
        console.log(`Missing shift data for match ${match.id}, skipping`);
        continue;
      }
      
      // Get user profile for the other user
      const { data: otherUserProfile } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', otherUserId)
        .maybeSingle();
      
      const otherUserName = otherUserProfile 
        ? `${otherUserProfile.first_name || ''} ${otherUserProfile.last_name || ''}`.trim()
        : 'Unknown User';
      
      // Format the match data
      processedMatches.push({
        match_id: match.id,
        match_status: match.status,
        created_at: match.created_at,
        match_date: match.match_date,
        my_request_id: myRequestId,
        other_request_id: otherRequestId,
        my_shift_id: myShiftId,
        my_shift_date: myShift.date,
        my_shift_start_time: myShift.start_time,
        my_shift_end_time: myShift.end_time,
        my_shift_truck: myShift.truck_name,
        other_shift_id: otherShiftId,
        other_shift_date: otherShift.date,
        other_shift_start_time: otherShift.start_time,
        other_shift_end_time: otherShift.end_time,
        other_shift_truck: otherShift.truck_name,
        other_user_id: otherUserId,
        other_user_name: otherUserName
      });
    }
    
    console.log(`Processed ${processedMatches.length} matches for user ${user_id}`);
    
    return new Response(
      JSON.stringify(processedMatches),
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
