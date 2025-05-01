
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
      // This way your row-level-security (RLS) policies are applied.
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Use our security definer function to bypass RLS issues
    const { data: matchesData, error: matchesError } = await supabaseClient
      .rpc('get_user_matches_with_rls', { user_id });
    
    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      throw matchesError;
    }
    
    // Ensure we have an array to work with
    const matches = matchesData || [];
    
    // Get only distinct matches by match_id to ensure no duplicates
    const uniqueMatchIds = new Set<string>();
    const distinctMatches = matches.filter(match => {
      if (uniqueMatchIds.has(match.match_id)) {
        return false;
      }
      uniqueMatchIds.add(match.match_id);
      return true;
    });
    
    console.log(`Found ${distinctMatches.length} potential matches`);
    
    if (distinctMatches.length === 0) {
      console.log('No matches found for this user');
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Return the distinct matches
    return new Response(
      JSON.stringify(distinctMatches),
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
