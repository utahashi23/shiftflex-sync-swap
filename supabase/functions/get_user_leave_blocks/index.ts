
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
    // Get the authorization header directly from request headers
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Authorization header missing or invalid');
      return createUnauthorizedResponse('No bearer token provided');
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      console.error('Authorization token not found or invalid');
      return createUnauthorizedResponse('Invalid authentication token');
    }

    // Get the request body
    const { user_id } = await req.json();
    
    // Validate required parameters
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Log the request details for debugging
    console.log(`Processing request for user_id: ${user_id} with token: ${token.substring(0, 10)}...`);

    // Create a Supabase client with the auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: `Bearer ${token}` } 
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the user id from the auth token to verify identity
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      console.error('Auth error:', userError)
      return createUnauthorizedResponse('Unauthorized - Invalid authentication token');
    }

    console.log('Authenticated user:', user.id)
    
    // Check if user is the same or is admin
    const { data: isAdmin } = await supabaseClient.rpc('has_role', { 
      _user_id: user.id,
      _role: 'admin'
    })
    
    if (user.id !== user_id && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to access this data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    
    // Use the service role key for admin access to bypass RLS
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Fetch user leave blocks with detailed information
    const { data, error } = await adminClient
      .from('user_leave_blocks')
      .select(`
        id,
        user_id,
        leave_block_id,
        status,
        created_at,
        leave_block:leave_block_id (
          block_number,
          start_date,
          end_date,
          original_block_id,
          split_designation
        )
      `)
      .eq('user_id', user_id)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching leave blocks:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Transform the data to a flatter structure for easier use in the frontend
    const transformedData = data.map(item => ({
      id: item.id,
      user_id: item.user_id,
      leave_block_id: item.leave_block_id,
      block_number: item.leave_block.block_number,
      start_date: item.leave_block.start_date,
      end_date: item.leave_block.end_date,
      status: item.status,
      created_at: item.created_at,
      split_designation: item.leave_block.split_designation,
      original_block_id: item.leave_block.original_block_id
    }))
    
    return new Response(
      JSON.stringify(transformedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error) {
    console.error('Error in get_user_leave_blocks function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
