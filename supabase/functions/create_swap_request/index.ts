
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
    return new Response(null, { 
      headers: corsHeaders 
    });
  }

  try {
    // Parse request data and extract authorization header
    const { shift_id, preferred_dates } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    // Validate required parameters
    if (!shift_id) {
      return new Response(
        JSON.stringify({ error: 'Shift ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!preferred_dates || !Array.isArray(preferred_dates) || preferred_dates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one preferred date is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Debug logging for authentication troubleshooting
    console.log('Auth header received:', authHeader.substring(0, 20) + '...');
    
    // Extract the token from the authorization header (Bearer token)
    const token = authHeader.replace('Bearer ', '');
    
    // Create a client to validate the auth token
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: `Bearer ${token}` }
        }
      }
    );

    // Verify the user with the auth token
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token', details: authError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const userId = user.id;
    console.log('Authenticated user ID:', userId);

    // Create an admin client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Verify that the shift belongs to the user
    const { data: shiftData, error: shiftError } = await supabaseAdmin
      .from('shifts')
      .select('*')
      .eq('id', shift_id)
      .eq('user_id', userId)
      .single();
      
    if (shiftError || !shiftData) {
      console.error('Shift verification error:', shiftError || 'Shift not found or does not belong to user');
      return new Response(
        JSON.stringify({ error: 'You can only request swaps for your own shifts' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log('Shift verified, creating swap request');
    
    // 2. Insert the swap request
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('shift_swap_requests')
      .insert({
        requester_id: userId,
        requester_shift_id: shift_id,
        status: 'pending'
      })
      .select('id')
      .single();
      
    if (requestError) {
      console.error('Error creating swap request:', requestError);
      return new Response(
        JSON.stringify({ error: requestError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const requestId = requestData.id;
    console.log('Created swap request with ID:', requestId);
    
    // 3. Add all preferred dates
    const preferredDaysToInsert = preferred_dates.map(pd => ({
      request_id: requestId,
      date: pd.date,
      accepted_types: pd.acceptedTypes || ['day', 'afternoon', 'night']
    }));
    
    console.log('Inserting preferred dates:', preferredDaysToInsert);
    
    const { error: datesError } = await supabaseAdmin
      .from('shift_swap_preferred_dates')
      .insert(preferredDaysToInsert);
      
    if (datesError) {
      console.error('Error adding preferred dates:', datesError);
      // Delete the request if we couldn't add preferred dates
      await supabaseAdmin.from('shift_swap_requests').delete().eq('id', requestId);
      
      return new Response(
        JSON.stringify({ error: `Failed to add preferred dates: ${datesError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        request_id: requestId,
        message: 'Swap request created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
      
  } catch (error) {
    console.error('Error in create_swap_request function:', error);
    
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
