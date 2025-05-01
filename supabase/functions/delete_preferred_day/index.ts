
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
    const { day_id, request_id, user_id } = await req.json()

    if (!day_id || !request_id || !user_id) {
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

    // Try first with standard client
    try {
      // Verify the request belongs to this user
      const { data: request, error: verifyError } = await supabaseClient
        .from('shift_swap_requests')
        .select('id')
        .eq('id', request_id)
        .eq('requester_id', user_id)
        .single()
        
      if (verifyError || !request) {
        throw new Error('User verification failed')
      }

      // Delete the preferred day
      const { error: deleteError } = await supabaseClient
        .from('shift_swap_preferred_dates')
        .delete()
        .eq('id', day_id)
        .eq('request_id', request_id)
      
      if (deleteError) {
        throw deleteError
      }
      
      // Check if any preferred days remain for this request
      const { data: remainingDays, error: countError } = await supabaseClient
        .from('shift_swap_preferred_dates')
        .select('id')
        .eq('request_id', request_id)
        
      if (countError) {
        throw countError
      }
      
      // If no days left, delete the whole request
      let requestDeleted = false
      if (!remainingDays || remainingDays.length === 0) {
        const { error: deleteRequestError } = await supabaseClient
          .from('shift_swap_requests')
          .delete()
          .eq('id', request_id)
        
        if (deleteRequestError) {
          throw deleteRequestError
        }
        
        requestDeleted = true
      }

      return new Response(
        JSON.stringify({ success: true, request_deleted: requestDeleted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } catch (clientError) {
      console.log('Standard client failed:', clientError.message)
      
      // Fall back to admin client if standard client fails
      // Create admin client with service role
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
      )
      
      // Verify the request belongs to this user with admin privileges
      const { data: request, error: verifyError } = await adminClient
        .from('shift_swap_requests')
        .select('id')
        .eq('id', request_id)
        .eq('requester_id', user_id)
        .single()
        
      if (verifyError || !request) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized or request not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      // Delete the preferred day with admin privileges
      const { error: deleteError } = await adminClient
        .from('shift_swap_preferred_dates')
        .delete()
        .eq('id', day_id)
        .eq('request_id', request_id)
      
      if (deleteError) {
        throw deleteError
      }
      
      // Check if any preferred days remain for this request
      const { data: remainingDays, error: countError } = await adminClient
        .from('shift_swap_preferred_dates')
        .select('id')
        .eq('request_id', request_id)
        
      if (countError) {
        throw countError
      }
      
      // If no days left, delete the whole request
      let requestDeleted = false
      if (!remainingDays || remainingDays.length === 0) {
        const { error: deleteRequestError } = await adminClient
          .from('shift_swap_requests')
          .delete()
          .eq('id', request_id)
        
        if (deleteRequestError) {
          throw deleteRequestError
        }
        
        requestDeleted = true
      }

      return new Response(
        JSON.stringify({ success: true, request_deleted: requestDeleted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
  } catch (error) {
    console.error('Error in delete_preferred_day:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
