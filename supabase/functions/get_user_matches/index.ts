
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
    // Get the request body and parse any options
    const { user_id, verbose = false } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log(`Processing request for user_id: ${user_id}, verbose: ${verbose}`);

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Let's first check for active swap requests that might be matched
    const { data: requestsData, error: requestsError } = await supabaseClient
      .from('shift_swap_requests')
      .select('id, requester_id, requester_shift_id, status')
      .eq('status', 'pending');
      
    if (requestsError) {
      console.error('Error checking requests:', requestsError);
    }
    
    // Check how many requests we have to debug
    console.log(`Found ${requestsData?.length || 0} pending swap requests in total`);
    if (verbose && requestsData?.length) {
      console.log('Sample requests:', requestsData.slice(0, 3));
    }
    
    // Try the RPC function which has worked reliably
    console.log(`Using RPC function to get matches for user ${user_id}`);
    
    const { data: matchesData, error: matchesError } = await supabaseClient
      .rpc('get_user_matches_with_rls', { user_id });
    
    if (matchesError) {
      console.error('Error fetching matches via RPC:', matchesError);
      throw matchesError;
    }
    
    // Ensure we have an array to work with
    const matches = matchesData || [];
    
    console.log(`Found ${matches.length} potential matches via RPC`);
    
    // Debug output in verbose mode
    if (verbose && matches.length > 0) {
      console.log('First match details:', matches[0]);
    }
    
    // Get only distinct matches by match_id
    const seen = new Set<string>();
    const distinctMatches = matches.filter(match => {
      if (!match || !match.match_id || seen.has(match.match_id)) {
        return false;
      }
      seen.add(match.match_id);
      return true;
    });
    
    console.log(`Returning ${distinctMatches.length} distinct matches after deduplication`);
    
    // Check if we need to query the potential_matches table directly for debugging
    if (verbose) {
      const { data: potentialMatches, error: potentialMatchesError } = await supabaseClient
        .from('shift_swap_potential_matches')
        .select('*');
        
      if (potentialMatchesError) {
        console.error('Error checking potential matches directly:', potentialMatchesError);
      } else {
        console.log(`Direct check: Found ${potentialMatches?.length || 0} entries in potential_matches table`);
      }
      
      // Debug: Check if we have any matches in the database at all for this user
      const { data: userRequests, error: userRequestsError } = await supabaseClient
        .from('shift_swap_requests')
        .select('*')
        .eq('requester_id', user_id);
        
      if (userRequestsError) {
        console.error('Error checking user requests:', userRequestsError);
      } else {
        console.log(`User has ${userRequests?.length || 0} total swap requests`);
      }
    }
    
    return new Response(
      JSON.stringify(distinctMatches),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
