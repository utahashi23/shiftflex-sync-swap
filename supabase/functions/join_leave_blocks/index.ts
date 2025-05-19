
import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders, getAuthToken } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request parameters
    const { block_a_id, block_b_id, user_id } = await req.json()
    
    // Validate required parameters
    if (!block_a_id || !block_b_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Both block IDs are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Get the authorization token using our helper
    const token = getAuthToken(req);
    if (!token) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

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
      )
    }

    // Verify request is from the user or an admin
    const { data: isAdmin } = await supabaseClient.rpc('has_role', { 
      _user_id: authUser.id,
      _role: 'admin'
    });
    
    if (authUser.id !== user_id && !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: You can only join your own leave blocks' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

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

    // Call the join_leave_blocks database function
    const { data: result, error: joinError } = await adminClient.rpc(
      'join_leave_blocks',
      { 
        block_a_id: block_a_id,
        block_b_id: block_b_id  
      }
    )

    if (joinError) {
      console.error('Error joining leave blocks:', joinError)
      return new Response(
        JSON.stringify({ success: false, error: joinError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify(result),
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
