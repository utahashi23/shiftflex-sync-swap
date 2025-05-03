
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
    const { user_id, shift_id, preferred_dates } = await req.json()

    if (!user_id || !shift_id || !preferred_dates || !Array.isArray(preferred_dates) || preferred_dates.length === 0) {
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

    // Use RPC function to safely create swap request
    const { data: requestId, error: requestError } = await supabaseClient.rpc(
      'create_swap_request_safe',
      { 
        p_requester_shift_id: shift_id, 
        p_status: 'pending'
      }
    )
      
    if (requestError) {
      console.error('Error creating swap request with RPC:', requestError)
      throw requestError
    }
    
    // 2. Add all preferred days
    const preferredDaysToInsert = preferred_dates.map(pd => ({
      request_id: requestId,
      date: pd.date,
      accepted_types: pd.accepted_types || ['day', 'afternoon', 'night']
    }))
    
    const { error: daysError } = await supabaseClient
      .from('shift_swap_preferred_dates')
      .insert(preferredDaysToInsert)
    
    if (daysError) {
      // Clean up on error
      await supabaseClient
        .from('shift_swap_requests')
        .delete()
        .eq('id', requestId)
        
      throw daysError
    }

    return new Response(
      JSON.stringify({ success: true, request_id: requestId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
