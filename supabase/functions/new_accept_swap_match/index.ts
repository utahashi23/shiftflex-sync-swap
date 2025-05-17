// Edge function to accept a shift swap match using the new improved system
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight request
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get the request body
    const body = await req.json().catch(() => ({}));
    const { request_id, user_id } = body;

    if (!request_id) {
      return createErrorResponse('Missing request_id parameter', 400);
    }

    if (!user_id) {
      return createErrorResponse('Missing user_id parameter', 400);
    }

    console.log(`User ${user_id} is accepting request ${request_id}`);

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

    // First check if this is a request from the user or a match with the user's request
    const { data: userRequest, error: requestError } = await supabaseAdmin
      .from('improved_shift_swaps')
      .select('*')
      .eq('id', request_id)
      .eq('requester_id', user_id)
      .maybeSingle();

    if (requestError) {
      console.error(`Error fetching request: ${requestError.message}`);
      return createErrorResponse(`Error fetching request: ${requestError.message}`, 500);
    }

    // If it's the user's request, they're initiating a match
    if (userRequest) {
      console.log('User is initiating a match with their own request');
      
      // Find the best match
      const { data: matchesResponse, error: matchError } = await supabaseAdmin.functions.invoke('new_find_swap_matches', {
        body: { user_id: user_id }
      });

      if (matchError) {
        console.error(`Error finding matches: ${matchError.message}`);
        return createErrorResponse(`Error finding matches: ${matchError.message}`, 500);
      }

      console.log('Matches response:', matchesResponse);

      if (!matchesResponse?.data?.matches || matchesResponse.data.matches.length === 0) {
        return createErrorResponse('No potential matches found for this request', 400);
      }

      // Sort matches by compatibility score
      const sortedMatches = matchesResponse.data.matches
        .filter((m) => m.request1_id === request_id || m.request2_id === request_id)
        .sort((a, b) => b.compatibility_score - a.compatibility_score);

      if (sortedMatches.length === 0) {
        return createErrorResponse('No specific match found for this request', 400);
      }

      // Take the highest scoring match
      const bestMatch = sortedMatches[0];
      console.log('Best match:', bestMatch);
      
      const otherRequestId = bestMatch.request1_id === request_id 
        ? bestMatch.request2_id 
        : bestMatch.request1_id;

      // Update both requests to be matched
      const { error: updateError } = await supabaseAdmin
        .from('improved_shift_swaps')
        .update({ 
          status: 'matched', 
          matched_with_id: otherRequestId,
          updated_at: new Date().toISOString()
        })
        .eq('id', request_id);

      if (updateError) {
        console.error(`Error updating request: ${updateError.message}`);
        return createErrorResponse(`Error updating request: ${updateError.message}`, 500);
      }

      const { error: updateOtherError } = await supabaseAdmin
        .from('improved_shift_swaps')
        .update({ 
          status: 'matched', 
          matched_with_id: request_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', otherRequestId);

      if (updateOtherError) {
        console.error(`Error updating other request: ${updateOtherError.message}`);
        // Revert our change if the other update fails
        await supabaseAdmin
          .from('improved_shift_swaps')
          .update({ 
            status: 'pending', 
            matched_with_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', request_id);
          
        return createErrorResponse(`Error updating other request: ${updateOtherError.message}`, 500);
      }

      return createSuccessResponse({
        message: 'Match created successfully',
        match: {
          request_id: request_id,
          other_request_id: otherRequestId
        }
      });
    } 
    
    // Otherwise check if the user is accepting a match to someone else's request
    const { data: matchedWithUserRequest, error: matchedError } = await supabaseAdmin
      .from('improved_shift_swaps')
      .select('*')
      .eq('requester_id', user_id)
      .eq('matched_with_id', request_id)
      .maybeSingle();

    if (matchedError) {
      console.error(`Error checking match: ${matchedError.message}`);
      return createErrorResponse(`Error checking match: ${matchedError.message}`, 500);
    }

    if (!matchedWithUserRequest) {
      return createErrorResponse('You are not authorized to accept this swap', 403);
    }

    // User is accepting an existing match where their request is matched with the provided request_id
    console.log('User is accepting an existing match');
    
    // Update both requests to confirmed status
    const { error: updateUserError } = await supabaseAdmin
      .from('improved_shift_swaps')
      .update({ 
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', matchedWithUserRequest.id);

    if (updateUserError) {
      console.error(`Error updating user request: ${updateUserError.message}`);
      return createErrorResponse(`Error updating user request: ${updateUserError.message}`, 500);
    }

    const { error: updateOtherError } = await supabaseAdmin
      .from('improved_shift_swaps')
      .update({ 
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', request_id);

    if (updateOtherError) {
      console.error(`Error updating matched request: ${updateOtherError.message}`);
      return createErrorResponse(`Error updating matched request: ${updateOtherError.message}`, 500);
    }

    return createSuccessResponse({
      message: 'Swap confirmed successfully',
      status: 'confirmed'
    });

  } catch (error) {
    console.error('Error in new_accept_swap_match:', error);
    return createErrorResponse(error.message || 'Unknown error occurred', 500);
  }
});
