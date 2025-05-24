
// Follow this setup guide to integrate the Supabase Edge Functions with your app:
// https://supabase.com/docs/guides/functions/getting-started

import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders, getAuthToken, createUnauthorizedResponse } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request body
    const { user_id, status = 'pending' } = await req.json()
    
    // Validate required parameters
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Extract the authentication token using the shared helper
    const token = getAuthToken(req);
    if (!token) {
      console.log('No authorization token provided');
      return createUnauthorizedResponse('No bearer token provided');
    }

    // Create a Supabase client with service role key for bypassing RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the user token with the anon client
    const anonClient = createClient(
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

    // Get the authenticated user to verify the token
    const {
      data: { user },
      error: userError,
    } = await anonClient.auth.getUser()

    if (userError || !user) {
      console.error('Auth error:', userError)
      return createUnauthorizedResponse('Invalid authentication token');
    }

    console.log('Authenticated user:', user.id)
    
    // Check if user is allowed to access this data
    if (user.id !== user_id) {
      // Check if user is admin
      const { data: adminCheck, error: adminError } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single()
      
      if (adminError || !adminCheck) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized to access this data' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }
    }
    
    // Use the RPC function to safely get user swap requests
    const { data, error: fetchError } = await supabaseClient.rpc(
      'get_user_swap_requests_safe',
      { 
        p_user_id: user_id,
        p_status: status 
      }
    )
    
    if (fetchError) {
      console.error('Error fetching swap requests:', fetchError)
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    return new Response(
      JSON.stringify(data || []),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error) {
    console.error('Error in get_swap_requests function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
