
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
    const requestData = await req.json()
    console.log('Received request data:', requestData)

    // Extract data from the request
    const { shift_id, preferred_dates } = requestData

    // Validate required parameters
    if (!shift_id || !preferred_dates || !Array.isArray(preferred_dates) || preferred_dates.length === 0) {
      console.error('Missing required parameters:', { shift_id, preferred_dates })
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

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

    // Get the user id from the auth token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    console.log('Authenticated user:', user.id)
    
    // 1. Use the RPC function to safely create the swap request
    const { data: requestId, error: requestError } = await supabaseClient.rpc(
      'create_swap_request_safe',
      { 
        p_requester_shift_id: shift_id, 
        p_status: 'pending'
      }
    )
      
    if (requestError) {
      console.error('Error creating swap request with RPC:', requestError)
      return new Response(
        JSON.stringify({ error: requestError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log('Successfully created swap request with ID:', requestId)
    
    // 2. Add all preferred days - using direct insert which should work now that we have proper policies
    const preferredDaysToInsert = preferred_dates.map(pd => ({
      request_id: requestId,
      date: pd.date,
      accepted_types: pd.acceptedTypes || ['day', 'afternoon', 'night']
    }))
    
    console.log('Inserting preferred dates:', preferredDaysToInsert)
    
    const { error: daysError } = await supabaseClient
      .from('shift_swap_preferred_dates')
      .insert(preferredDaysToInsert)
    
    if (daysError) {
      console.error('Error adding preferred dates:', daysError)
      
      // Clean up on error - using RPC to delete to avoid recursion issues
      await supabaseClient.rpc(
        'delete_swap_request_safe',
        { p_request_id: requestId }
      )
        
      return new Response(
        JSON.stringify({ error: daysError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, request_id: requestId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in create_swap_request function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
