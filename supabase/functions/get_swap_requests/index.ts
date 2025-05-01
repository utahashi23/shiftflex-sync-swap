
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
    const { user_id, status = 'pending' } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id parameter' }),
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

    // Use our custom RPC function to bypass RLS issues
    const { data: rpcResponse, error: rpcError } = await supabaseClient.rpc('get_user_swap_requests', {
      p_user_id: user_id,
      p_status: status
    });
    
    if (rpcError) {
      console.error('RPC Error:', rpcError);
      
      // Fall back to direct query with service role if RPC fails
      console.log(`Falling back to direct query for user ${user_id} with status ${status}`);
      
      // Create admin client with service role
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
      );
      
      // Fetch the user's pending swap requests with service role (bypasses RLS)
      const { data: requests, error: requestsError } = await adminClient
        .from('shift_swap_requests')
        .select('id, status, requester_shift_id, created_at, requester_id')
        .eq('requester_id', user_id)
        .eq('status', status);
        
      if (requestsError) {
        console.error('Error fetching swap requests:', requestsError);
        throw requestsError;
      }
      
      console.log(`Found ${requests?.length || 0} swap requests`);
      
      if (!requests || requests.length === 0) {
        return new Response(
          JSON.stringify([]),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      // Get all shift IDs
      const shiftIds = requests.map(req => req.requester_shift_id);
      
      // Fetch shift data with service role
      const { data: shifts, error: shiftsError } = await adminClient
        .from('shifts')
        .select('id, date, start_time, end_time, truck_name')
        .in('id', shiftIds);
        
      if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError);
        throw shiftsError;
      }
      
      // Create a map for quick lookup
      const shiftsMap = {};
      shifts.forEach(shift => {
        // Determine shift type based on start time
        const startHour = new Date(`2000-01-01T${shift.start_time}`).getHours();
        let shiftType = 'day';
        
        if (startHour <= 8) {
          shiftType = 'day';
        } else if (startHour > 8 && startHour < 16) {
          shiftType = 'afternoon';
        } else {
          shiftType = 'night';
        }
        
        shiftsMap[shift.id] = {
          ...shift,
          type: shiftType, // Add the shift type
          startTime: shift.start_time,
          endTime: shift.end_time,
          truckName: shift.truck_name
        };
      });
      
      // Fetch preferred days for these requests with service role
      const requestIds = requests.map(req => req.id);
      
      const { data: preferredDays, error: daysError } = await adminClient
        .from('shift_swap_preferred_dates')
        .select('id, request_id, date, accepted_types')
        .in('request_id', requestIds);
        
      if (daysError) {
        console.error('Error fetching preferred days:', daysError);
        throw daysError;
      }
      
      // Group preferred days by request ID
      const preferredDaysByRequest = {};
      preferredDays.forEach(day => {
        if (!preferredDaysByRequest[day.request_id]) {
          preferredDaysByRequest[day.request_id] = [];
        }
        preferredDaysByRequest[day.request_id].push(day);
      });
      
      // Join the data together
      const result = requests.map(request => {
        return {
          id: request.id,
          status: request.status,
          requester_id: request.requester_id,
          requester_shift_id: request.requester_shift_id,
          shift: shiftsMap[request.requester_shift_id],
          preferred_days: preferredDaysByRequest[request.id] || []
        };
      });
      
      console.log(`Returning ${result.length} formatted swap requests`);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // If RPC was successful, return the results
    return new Response(
      JSON.stringify(rpcResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('Error in get_swap_requests:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
})
