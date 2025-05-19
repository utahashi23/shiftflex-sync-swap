
import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders, getAuthToken, createUnauthorizedResponse } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request parameters
    const { day_id, request_id } = await req.json()
    
    // Validate required parameters
    if (!day_id || !request_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Day ID and Request ID are required' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log(`Processing deletion request for day_id: ${day_id}, request_id: ${request_id}`)

    // Extract authorization token using the shared helper
    const token = getAuthToken(req);
    if (!token) {
      console.log('No authorization token provided');
      return createUnauthorizedResponse('No bearer token provided');
    }

    // Create a Supabase client with the auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      console.error('User authentication error:', userError)
      return createUnauthorizedResponse('Unauthorized - Invalid authentication token');
    }

    console.log(`Authenticated user: ${user.id}. Proceeding with deletion.`)
    
    // Check if the request exists first
    const { data: requestData, error: requestError } = await supabaseClient
      .from('shift_swap_requests')
      .select('*')
      .eq('id', request_id)
      .single();
      
    if (requestError || !requestData) {
      console.error('Request not found:', requestError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Request not found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    // Now check if the preferred date exists
    const { data: dateData, error: dateError } = await supabaseClient
      .from('shift_swap_preferred_dates')
      .select('*')
      .eq('id', day_id)
      .eq('request_id', request_id)
      .single();
      
    if (dateError || !dateData) {
      console.error('Preferred date not found:', dateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Preferred date not found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    // Call the RPC function we created for deleting preferred dates
    const { data: result, error: deleteError } = await supabaseClient.rpc(
      'delete_preferred_date_rpc',
      { 
        p_day_id: day_id, 
        p_request_id: request_id
      }
    )

    if (deleteError) {
      console.error('Error calling delete_preferred_date_rpc:', deleteError)
      return new Response(
        JSON.stringify({ success: false, error: deleteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('Delete operation result:', result)
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'An unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
