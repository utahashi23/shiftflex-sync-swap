
// Edge function to find potential shift swap matches
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight request
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Client with auth context
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // Admin client for secure operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get current user
    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError?.message || 'No user found');
      return createErrorResponse('Authentication required', 401);
    }

    console.log(`Finding swap matches for user ${user.id}`);

    // Call the database function to find matches
    const { data: matches, error: matchError } = await supabaseAdmin.rpc(
      'find_shift_swap_matches'
    );

    if (matchError) {
      console.error(`Error finding matches: ${matchError.message}`);
      return createErrorResponse(`Error finding matches: ${matchError.message}`, 500);
    }

    // Filter matches to only include those relevant to the current user
    const userMatches = matches.filter(match => 
      match.requester1_id === user.id || match.requester2_id === user.id
    );

    // Get additional information about the shifts for better display
    const shiftIds = new Set();
    userMatches.forEach(match => {
      shiftIds.add(match.shift1_id);
      shiftIds.add(match.shift2_id);
    });

    const { data: shifts, error: shiftsError } = await supabaseAdmin
      .from('shifts')
      .select('id, date, start_time, end_time, truck_name, user_id, type')
      .in('id', Array.from(shiftIds));

    if (shiftsError) {
      console.error(`Error fetching shifts: ${shiftsError.message}`);
      return createErrorResponse(`Error fetching shifts: ${shiftsError.message}`, 500);
    }

    // Create an enriched version of the matches with shift details
    const enrichedMatches = userMatches.map(match => {
      const shift1 = shifts.find(s => s.id === match.shift1_id);
      const shift2 = shifts.find(s => s.id === match.shift2_id);
      
      return {
        ...match,
        shift1_details: shift1,
        shift2_details: shift2,
        // Determine if this user is requester1 or requester2
        is_requester1: match.requester1_id === user.id,
        my_shift: match.requester1_id === user.id ? shift1 : shift2,
        other_shift: match.requester1_id === user.id ? shift2 : shift1
      };
    });

    console.log(`Found ${enrichedMatches.length} matches for user`);

    return createSuccessResponse({
      matches: enrichedMatches,
      raw_matches: userMatches
    });

  } catch (error) {
    console.error('Error in new_find_swap_matches:', error);
    return createErrorResponse(error.message || 'Unknown error occurred', 500);
  }
});
