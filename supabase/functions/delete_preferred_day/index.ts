
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
    const { day_id, request_id, auth_token } = await req.json()
    
    if (!day_id || !request_id) {
      return new Response(
        JSON.stringify({ error: 'Day ID and Request ID are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: auth_token ? `Bearer ${auth_token}` : '' } } }
    )

    // Get the user id from the auth token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Check authentication token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if the user is an admin or owns the request
    const isAdmin = await checkIsAdmin(supabaseClient, user.id)
    const canDelete = await canModifyRequest(supabaseClient, user.id, request_id, isAdmin)
    
    if (!canDelete) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to modify this request' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    
    // Delete the preferred date
    const { error: deleteError } = await supabaseClient
      .from('shift_swap_preferred_dates')
      .delete()
      .eq('id', day_id)
      .eq('request_id', request_id)
    
    if (deleteError) {
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Check if this was the last preferred date and the request was deleted by the trigger
    const { count, error: countError } = await supabaseClient
      .from('shift_swap_preferred_dates')
      .select('id', { count: 'exact', head: true })
      .eq('request_id', request_id)
    
    const requestDeleted = (count === 0)
    
    return new Response(
      JSON.stringify({ success: true, requestDeleted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error) {
    console.error('Error in delete_preferred_day function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

// Helper functions
async function checkIsAdmin(client: any, userId: string): Promise<boolean> {
  const { data, error } = await client.rpc('has_role', { 
    _user_id: userId,
    _role: 'admin'
  })
  
  if (error) {
    console.error('Error checking admin role:', error)
    return false
  }
  
  return !!data
}

async function canModifyRequest(client: any, userId: string, requestId: string, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true
  
  const { data, error } = await client
    .from('shift_swap_requests')
    .select('requester_id')
    .eq('id', requestId)
    .single()
    
  if (error || !data) {
    console.error('Error checking request ownership:', error)
    return false
  }
  
  return data.requester_id === userId
}
