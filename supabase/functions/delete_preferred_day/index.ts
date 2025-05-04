
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
    const { day_id, request_id } = await req.json()
    
    // Validate required parameters
    if (!day_id || !request_id) {
      return new Response(
        JSON.stringify({ error: 'Day ID and Request ID are required' }),
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
    
    // Check if the user is an admin
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
    
    // Verify that the preferred date exists and belongs to this request
    const { data: dateData, error: dateError } = await supabaseAdmin
      .from('shift_swap_preferred_dates')
      .select('*')
      .eq('id', day_id)
      .eq('request_id', request_id)
      .single()
      
    if (dateError) {
      console.error('Error finding preferred date:', dateError);
      return new Response(
        JSON.stringify({ error: 'Preferred date not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }
    
    // Verify the user has permission to delete this date
    if (!isAdmin && requestData.requester_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: You can only delete your own swap preferred dates' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    
    // Get count of preferred dates for this request
    const { data: dateCount, error: countError } = await supabaseAdmin
      .from('shift_swap_preferred_dates')
      .select('id')
      .eq('request_id', request_id)
      
    if (countError) {
      console.error('Error counting preferred dates:', countError);
      return new Response(
        JSON.stringify({ error: 'Failed to check preferred dates' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // If this is the last preferred date, return that the request should be deleted entirely
    if (dateCount.length <= 1) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          requestDeleted: true,
          message: 'This is the last preferred date. Please delete the entire request.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
    
    // Delete the preferred date
    const { error: deleteError } = await supabaseAdmin
      .from('shift_swap_preferred_dates')
      .delete()
      .eq('id', day_id)
      
    if (deleteError) {
      console.error('Error deleting preferred date:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete preferred date' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        requestDeleted: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error) {
    console.error('Error in delete_preferred_day function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
