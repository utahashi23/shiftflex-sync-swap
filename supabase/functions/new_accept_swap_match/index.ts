
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
    const body = await req.json();
    const { request_id } = body;

    if (!request_id) {
      return createErrorResponse('Missing request_id parameter');
    }

    console.log(`Processing request_id: ${request_id}`);

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

    console.log(`User ${user.id} is accepting request ${request_id}`);

    // Call the database function to confirm the swap
    const { data: confirmResult, error: confirmError } = await supabaseAdmin.rpc(
      'confirm_shift_swap',
      {
        request_id: request_id,
        confirming_user_id: user.id
      }
    );

    if (confirmError) {
      console.error(`Error confirming swap: ${confirmError.message}`);
      return createErrorResponse(`Error confirming swap: ${confirmError.message}`, 500);
    }

    if (!confirmResult.success) {
      console.error(`Failed to confirm swap: ${confirmResult.error}`);
      return createErrorResponse(confirmResult.error || 'Failed to confirm swap', 400);
    }

    console.log('Successfully confirmed swap:', confirmResult);

    return createSuccessResponse({
      message: confirmResult.message,
      status: confirmResult.status
    });

  } catch (error) {
    console.error('Error in new_accept_swap_match:', error);
    return createErrorResponse(error.message || 'Unknown error occurred', 500);
  }
});
