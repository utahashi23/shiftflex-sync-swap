
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
    const { request_id } = await req.json()
    
    // Validate required parameters
    if (!request_id) {
      return new Response(
        JSON.stringify({ error: 'Request ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Create a Supabase client with the auth token from the request
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: authHeader } 
        } 
      }
    )

    // Get the user id from the auth token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Check authentication token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    console.log('Authenticated user:', user.id);
    
    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Check if the user is an admin using the admin client
    const { data: roleData } = await supabaseAdmin.rpc('has_role', { 
      _user_id: user.id,
      _role: 'admin'
    })
    
    const isAdmin = !!roleData
    
    // Check if the user owns the request
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('shift_swap_requests')
      .select('requester_id')
      .eq('id', request_id)
      .single()
    
    if (requestError) {
      console.error('Error finding request:', requestError);
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }
    
    // Verify the user has permission to delete this request
    if (!isAdmin && requestData.requester_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: You can only delete your own swap requests' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    
    // First, delete all preferred dates using the admin client
    const { error: datesError } = await supabaseAdmin
      .from('shift_swap_preferred_dates')
      .delete()
      .eq('request_id', request_id)
    
    if (datesError) {
      console.error('Error deleting preferred dates:', datesError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete preferred dates' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Then delete the request using the admin client
    const { error: deleteError } = await supabaseAdmin
      .from('shift_swap_requests')
      .delete()
      .eq('id', request_id)
    
    if (deleteError) {
      console.error('Error deleting request:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error) {
    console.error('Error in delete_swap_request function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
