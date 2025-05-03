
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
    console.log('Handling OPTIONS preflight request');
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request body
    const requestData = await req.json()
    console.log('Received request data:', requestData)

    // Extract data from the request
    const { shift_id, preferred_dates, auth_token } = requestData

    // Validate required parameters
    if (!shift_id || !preferred_dates || !Array.isArray(preferred_dates) || preferred_dates.length === 0) {
      console.error('Missing required parameters:', { shift_id, preferred_dates })
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate auth_token
    if (!auth_token) {
      console.error('Missing auth token')
      return new Response(
        JSON.stringify({ error: 'Authentication token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create a second client to verify the user token
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: `Bearer ${auth_token}` } 
        } 
      }
    )

    // Verify the user with the auth token
    const { data: authData, error: getUserError } = await supabaseAuth.auth.getUser()
    
    if (getUserError || !authData.user) {
      console.error('Auth error:', getUserError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid authentication token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const user = authData.user
    console.log('Authenticated user:', user.id)
    
    try {
      // 1. First verify that the shift belongs to the user
      const { data: shiftData, error: shiftError } = await supabaseAdmin
        .from('shifts')
        .select('*')
        .eq('id', shift_id)
        .eq('user_id', user.id)
        .single();
        
      if (shiftError || !shiftData) {
        console.error('Shift verification error:', shiftError);
        return new Response(
          JSON.stringify({ error: 'You can only request swaps for your own shifts' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
      
      // 2. Insert directly into the swap requests table using admin client to bypass RLS
      const { data: requestData, error: requestError } = await supabaseAdmin
        .from('shift_swap_requests')
        .insert({
          requester_id: user.id,
          requester_shift_id: shift_id,
          status: 'pending'
        })
        .select('id')
        .single();
      
      if (requestError) {
        console.error('Error creating swap request:', requestError);
        return new Response(
          JSON.stringify({ error: requestError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      const requestId = requestData.id;
      console.log('Successfully created swap request with ID:', requestId);
      
      // 3. Add all preferred days, also using admin client to bypass RLS
      let daysError = null;
      
      if (preferred_dates && preferred_dates.length > 0) {
        const preferredDaysToInsert = preferred_dates.map(pd => ({
          request_id: requestId,
          date: pd.date,
          accepted_types: pd.acceptedTypes || ['day', 'afternoon', 'night']
        }));
        
        console.log('Inserting preferred dates:', preferredDaysToInsert);
        
        const { error } = await supabaseAdmin
          .from('shift_swap_preferred_dates')
          .insert(preferredDaysToInsert);
        
        daysError = error;
        
        if (error) {
          console.error('Error adding preferred dates:', error);
        }
      }

      // Return success even if dates failed - we'll include a warning
      return new Response(
        JSON.stringify({ 
          success: true, 
          request_id: requestId,
          warning: daysError ? "Request created but preferred dates could not be added: " + daysError.message : null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return new Response(
        JSON.stringify({ error: dbError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in create_swap_request function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
