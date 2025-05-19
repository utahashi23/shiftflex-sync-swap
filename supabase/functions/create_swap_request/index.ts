
import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders 
    });
  }

  try {
    // Parse request data
    const { shift_ids, preferred_dates, required_skillsets } = await req.json();
    
    // Validate inputs
    if (!shift_ids || !Array.isArray(shift_ids) || shift_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one shift ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!preferred_dates || !Array.isArray(preferred_dates) || preferred_dates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one preferred date is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate shift types for each preferred date
    for (const pd of preferred_dates) {
      if (!pd.date) {
        return new Response(
          JSON.stringify({ error: 'Each preferred date must have a date property' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      // Required: accepted shift types for strict filtering
      if (!pd.acceptedTypes || !Array.isArray(pd.acceptedTypes) || pd.acceptedTypes.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Each preferred date must have at least one accepted shift type' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      // Validate that accepted types only contain valid shift types
      const validShiftTypes = ['day', 'afternoon', 'night'];
      const invalidTypes = pd.acceptedTypes.filter(type => !validShiftTypes.includes(type));
      if (invalidTypes.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: `Invalid shift types detected: ${invalidTypes.join(', ')}. Valid types are: ${validShiftTypes.join(', ')}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }
    
    // Validate required_skillsets if provided
    if (required_skillsets && !Array.isArray(required_skillsets)) {
      return new Response(
        JSON.stringify({ error: 'Required skillsets must be an array' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('Request validation passed. Creating swap request with:');
    console.log('- Shift IDs:', shift_ids);
    console.log('- Preferred dates:', preferred_dates.map(pd => 
      `${pd.date} (accepted types: ${pd.acceptedTypes.join(', ')})`
    ).join(', '));
    console.log('- Required skillsets:', required_skillsets || 'None');
    
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
    console.log('Authenticated user ID:', userId);
    
    // Store for request IDs
    const request_ids = [];
    
    // Create a swap request for each shift ID
    for (const shift_id of shift_ids) {
      // 1. Create the swap request
      const { data: swapRequest, error: swapRequestError } = await supabaseAdmin
        .from('shift_swap_requests')
        .insert({
          requester_id: userId,
          requester_shift_id: shift_id,
          status: 'pending',
          required_skillsets: required_skillsets || []
        })
        .select('id')
        .single();
        
      if (swapRequestError) {
        console.error(`Error creating swap request for shift ${shift_id}:`, swapRequestError);
        continue; // Continue with other shifts even if one fails
      }
      
      const requestId = swapRequest.id;
      request_ids.push(requestId);
      console.log(`Created swap request with ID: ${requestId} for shift: ${shift_id}`);
      
      // 2. Add all preferred dates with their accepted types
      const preferredDaysToInsert = preferred_dates.map(pd => ({
        request_id: requestId,
        date: pd.date,
        accepted_types: pd.acceptedTypes  // This will be stored as accepted_types in the database
      }));
      
      console.log(`Inserting preferred dates for request ${requestId}:`);
      preferredDaysToInsert.forEach(pd => {
        console.log(`- Date ${pd.date}, accepted types: [${pd.accepted_types.join(', ')}]`);
      });
      
      const { data: insertedDates, error: datesError } = await supabaseAdmin
        .from('shift_swap_preferred_dates')
        .insert(preferredDaysToInsert)
        .select();
        
      if (datesError) {
        console.error(`Error adding preferred dates for request ${requestId}:`, datesError);
        // Do not delete the request, just log the error and continue
      } else {
        console.log(`Successfully inserted ${insertedDates.length} preferred dates for request ${requestId}`);
      }
    }
    
    if (request_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to create any swap requests' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        request_ids: request_ids,
        message: `Successfully created ${request_ids.length} swap requests`,
        preferred_dates_count: preferred_dates.length,
        required_skillsets: required_skillsets || []
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
