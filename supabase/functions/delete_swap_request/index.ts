
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
    const { request_id, auth_token } = await req.json()
    
    // Validate required parameters
    if (!request_id) {
      return new Response(
        JSON.stringify({ error: 'Request ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate auth_token
    if (!auth_token) {
      console.error('Missing auth token')
      return new Response(
        JSON.stringify({ error: 'Authentication token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Create a Supabase client with the auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: `Bearer ${auth_token}` } 
        } 
      }
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

    console.log('Authenticated user:', user.id)
    
    // Check if the user is an admin or owns the request
    const isAdmin = await checkIsAdmin(supabaseClient, user.id)
    const canDelete = await canDeleteRequest(supabaseClient, user.id, request_id, isAdmin)
    
    if (!canDelete) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to delete this request' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    
    // Use the RPC function to safely delete the request
    const { data, error: deleteError } = await supabaseClient.rpc(
      'delete_swap_request_safe',
      { p_request_id: request_id }
    )
    
    if (deleteError) {
      console.error('Error deleting swap request:', deleteError)
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error) {
    console.error('Error in delete_swap_request function:', error)
    
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

async function canDeleteRequest(client: any, userId: string, requestId: string, isAdmin: boolean): Promise<boolean> {
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
