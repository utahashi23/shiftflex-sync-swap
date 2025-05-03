
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
    // Parse request data
    const { shift_id, preferred_dates } = await req.json();
    
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

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    
    // Debug logging for request info
    console.log('Request for shift ID:', shift_id);
    console.log('Preferred dates count:', preferred_dates.length);
    
    // Create an admin client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract user ID from auth header if present (for validation)
    let userId = null;
    if (authHeader) {
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

      userId = user.id;
      console.log('Authenticated user ID:', userId);
    } else {
      console.log('No auth header provided - using admin powers only');
    }

    // 1. Verify that the shift belongs to the user if we have a user ID
    if (userId) {
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
      
      console.log('Shift verified, belongs to user:', userId);
    } else {
      // Just get the shift to determine the user ID if not provided
      const { data: shiftData, error: shiftError } = await supabaseAdmin
        .from('shifts')
        .select('user_id')
        .eq('id', shift_id)
        .single();
        
      if (shiftError || !shiftData) {
        console.error('Shift lookup error:', shiftError || 'Shift not found');
        return new Response(
          JSON.stringify({ error: 'Shift not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      
      userId = shiftData.user_id;
      console.log('Using shift owner as requester:', userId);
    }
    
    console.log('Proceeding with user ID:', userId);
    
    // 2. Use the create_swap_request_safe function to avoid RLS issues
    const { data: requestData, error: requestError } = await supabaseAdmin
      .rpc('create_swap_request_safe', {
        p_requester_shift_id: shift_id,
        p_status: 'pending'
      });
      
    if (requestError) {
      console.error('Error creating swap request:', requestError);
      return new Response(
        JSON.stringify({ error: requestError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const requestId = requestData;
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
