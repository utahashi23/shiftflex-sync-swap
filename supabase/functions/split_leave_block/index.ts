
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
    // Parse the request body more safely
    let requestBody;
    try {
      const text = await req.text();
      if (!text) {
        console.error('Empty request body');
        return new Response(
          JSON.stringify({ success: false, error: 'Empty request body' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      requestBody = JSON.parse(text);
      console.log('Parsed request body:', JSON.stringify(requestBody));
    } catch (parseError) {
      console.error('Error parsing request body:', parseError.message);
      return new Response(
        JSON.stringify({ success: false, error: `Invalid JSON: ${parseError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Get the request parameters
    const { user_leave_block_id, user_id } = requestBody;
    console.log(`Processing request with user_leave_block_id: ${user_leave_block_id}, user_id: ${user_id}`);
    
    // Validate required parameters
    if (!user_leave_block_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'User leave block ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Extract the authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    // Extract the token part (remove "Bearer " if present)
    const token = authHeader.split(' ')[1] || authHeader;
    if (!token) {
      console.error('Invalid Authorization header format');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid Authorization header format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('Auth token received, creating client');

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
    const { data: { user: authUser }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !authUser) {
      console.error('User authentication error:', userError)
      return new Response(
        JSON.stringify({ success: false, error: 'User authentication failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('Authenticated user:', authUser.id);
    
    // Verify request is from the user or an admin
    const { data: isAdmin } = await supabaseClient.rpc('has_role', { 
      _user_id: authUser.id,
      _role: 'admin'
    });
    
    if (authUser.id !== user_id && !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: You can only split your own leave blocks' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Get the user leave block
    const { data: userLeaveBlock, error: userLeaveBlockError } = await supabaseClient
      .from('user_leave_blocks')
      .select('*, leave_block:leave_block_id(*)')
      .eq('id', user_leave_block_id)
      .single()

    if (userLeaveBlockError || !userLeaveBlock) {
      console.error('Error fetching user leave block:', userLeaveBlockError)
      return new Response(
        JSON.stringify({ success: false, error: 'User leave block not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('Found user leave block:', JSON.stringify(userLeaveBlock));

    // Use the service role to bypass RLS
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

    // Call the split_leave_block database function
    console.log('Calling split_leave_block function with block_id:', userLeaveBlock.leave_block_id);
    const { data: result, error: splitError } = await adminClient.rpc(
      'split_leave_block',
      { block_id: userLeaveBlock.leave_block_id }
    )

    if (splitError) {
      console.error('Error splitting leave block:', splitError)
      return new Response(
        JSON.stringify({ success: false, error: splitError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('Split successful, result:', JSON.stringify(result));

    return new Response(
      JSON.stringify({ success: true, ...result }),
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
