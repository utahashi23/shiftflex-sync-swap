
// Follow this setup guide to integrate the Supabase Edge Functions with your app:
// https://supabase.com/docs/guides/functions/getting-started

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    const { match_id } = await req.json();

    if (!match_id) {
      return new Response(
        JSON.stringify({ error: 'Missing match_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing accept_swap_match for match ID: ${match_id}`);

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Use service role for operations that might be restricted by RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // First, get the match details to obtain user IDs and shift information
    const { data: matchData, error: matchError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .select(`
        id,
        status,
        requester_request_id,
        acceptor_request_id,
        requester_shift_id,
        acceptor_shift_id
      `)
      .eq('id', match_id)
      .single();
    
    if (matchError) {
      throw new Error(`Error fetching match: ${matchError.message}`);
    }

    if (!matchData) {
      throw new Error('Match not found');
    }

    console.log(`Found match data:`, matchData);

    // Fetch the request data to get user IDs
    const requestsPromises = [
      supabaseAdmin
        .from('shift_swap_requests')
        .select('requester_id, requester_shift_id')
        .eq('id', matchData.requester_request_id)
        .single(),
      supabaseAdmin
        .from('shift_swap_requests')
        .select('requester_id, requester_shift_id')
        .eq('id', matchData.acceptor_request_id)
        .single()
    ];

    const [requesterRequest, acceptorRequest] = await Promise.all(requestsPromises);
    
    if (requesterRequest.error) {
      throw new Error(`Error fetching requester request: ${requesterRequest.error.message}`);
    }
    
    if (acceptorRequest.error) {
      throw new Error(`Error fetching acceptor request: ${acceptorRequest.error.message}`);
    }

    const requesterUserId = requesterRequest.data.requester_id;
    const acceptorUserId = acceptorRequest.data.requester_id;
    
    console.log(`Users involved: Requester ID: ${requesterUserId}, Acceptor ID: ${acceptorUserId}`);

    // Fetch users' email addresses
    const usersPromises = [
      supabaseAdmin.auth.admin.getUserById(requesterUserId),
      supabaseAdmin.auth.admin.getUserById(acceptorUserId)
    ];

    const [requesterUser, acceptorUser] = await Promise.all(usersPromises);
    
    if (requesterUser.error) {
      console.error(`Error fetching requester user: ${requesterUser.error.message}`);
      // Continue even if we can't get the user's email
    }
    
    if (acceptorUser.error) {
      console.error(`Error fetching acceptor user: ${acceptorUser.error.message}`);
      // Continue even if we can't get the user's email
    }

    const requesterEmail = requesterUser.data?.user?.email;
    const acceptorEmail = acceptorUser.data?.user?.email;
    
    console.log(`User emails: Requester: ${requesterEmail || 'unknown'}, Acceptor: ${acceptorEmail || 'unknown'}`);

    // Update match status to "accepted"
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .update({ status: 'accepted' })
      .eq('id', match_id)
      .select();
    
    if (updateError) {
      throw new Error(`Error updating match: ${updateError.message}`);
    }

    console.log(`Successfully updated match status to accepted`);

    // Send emails using the same format as resend_swap_notification
    // We'll call the resend_swap_notification function instead of duplicating the email creation logic
    try {
      // Call the resend_swap_notification edge function to handle the email sending
      // This will use the exact same email template and logic
      const emailResponse = await supabaseAdmin.functions.invoke('resend_swap_notification', {
        body: { match_id }
      });
      
      if (emailResponse.error) {
        console.error(`Error sending notification emails: ${emailResponse.error.message}`);
        // We don't throw here since the primary operation (updating the match) succeeded
      } else {
        console.log('Successfully sent notification emails');
      }
    } catch (emailError) {
      console.error('Error sending emails:', emailError);
      // We don't throw here since the primary operation (updating the match) succeeded
    }

    return new Response(
      JSON.stringify({ success: true, data: updateData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in accept_swap_match:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
