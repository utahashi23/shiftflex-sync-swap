
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
    
    // Enhanced validation for request parameters
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

    // Enhanced validation for accepted types
    for (const pd of preferred_dates) {
      if (!pd.date) {
        return new Response(
          JSON.stringify({ error: 'Each preferred date must have a date property' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      if (!pd.acceptedTypes || !Array.isArray(pd.acceptedTypes) || pd.acceptedTypes.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Each preferred date must have at least one accepted shift type' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }
    
    // Debug logging for request info
    console.log('Request for shift ID:', shift_id);
    console.log('Preferred dates count:', preferred_dates.length);
    preferred_dates.forEach(pd => {
      console.log(`Date: ${pd.date}, accepted types:`, pd.acceptedTypes);
    });
    
    // Create an admin client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user session from the request authorization header
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError || 'User not found');
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const userId = user.id;
    console.log('Proceeding with user ID:', userId);
    
    // 1. Create the swap request
    const { data: swapRequest, error: swapRequestError } = await supabaseAdmin
      .from('shift_swap_requests')
      .insert({
        requester_id: userId,
        requester_shift_id: shift_id,
        status: 'pending'
      })
      .select('id')
      .single();
      
    if (swapRequestError) {
      console.error('Error creating swap request:', swapRequestError);
      return new Response(
        JSON.stringify({ error: swapRequestError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const requestId = swapRequest.id;
    console.log('Created swap request with ID:', requestId);
    
    // 2. Add all preferred dates with their accepted types
    // IMPORTANT: Make sure we're mapping client-side property "acceptedTypes" to database property "accepted_types"
    const preferredDaysToInsert = preferred_dates.map(pd => ({
      request_id: requestId,
      date: pd.date,
      accepted_types: pd.acceptedTypes // This will be converted to accepted_types in the database
    }));
    
    console.log('Inserting preferred dates with accepted types:');
    preferredDaysToInsert.forEach(pd => {
      console.log(`- Date ${pd.date}, types: ${pd.accepted_types ? pd.accepted_types.join(', ') : '[]'}`);
    });
    
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
