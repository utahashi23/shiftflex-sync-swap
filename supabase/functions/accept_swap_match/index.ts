
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
    const { match_id, bypass_auth } = await req.json();

    if (!match_id) {
      return new Response(
        JSON.stringify({ error: 'Missing match_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing accept_swap_match for match ID: ${match_id}`);

    // Use the service role client directly when bypass_auth is true
    // This skips RLS policies and auth checks
    let supabaseClient;
    
    if (bypass_auth) {
      console.log('Using service role for bypass_auth=true');
      supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
    } else {
      // Create a Supabase client with the Auth context of the logged in user
      supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        // Create client with Auth context of the user that called the function
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
      );
    }

    // Always use service role for operations that might be restricted by RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Only check user auth if not bypassing auth
    let currentUserId = null;
    
    if (!bypass_auth) {
      // Get the current user ID
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user:', userError);
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      
      currentUserId = user.id;
      console.log(`Current user ID: ${currentUserId}`);
    } else {
      console.log('Bypassing authentication check');
    }

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

    // Check if user is involved in the swap (skip if bypass_auth is true)
    if (!bypass_auth && currentUserId !== requesterUserId && currentUserId !== acceptorUserId) {
      return new Response(
        JSON.stringify({ error: 'You are not authorized to accept this swap' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // For bypass_auth=true, we'll use the requesterUserId as the accepting user
    const userIdForAcceptance = bypass_auth ? requesterUserId : currentUserId;
    
    // Check for existing acceptance record for this user on this match
    const { data: existingAcceptance, error: acceptanceError } = await supabaseAdmin
      .from('shift_swap_acceptances')
      .select('*')
      .eq('match_id', match_id)
      .eq('user_id', userIdForAcceptance)
      .maybeSingle();
    
    if (acceptanceError) {
      console.error(`Error checking for existing acceptance: ${acceptanceError.message}`);
    }

    if (!existingAcceptance) {
      // Record this user's acceptance
      const { data: acceptanceData, error: insertError } = await supabaseAdmin
        .from('shift_swap_acceptances')
        .insert({
          match_id: match_id,
          user_id: userIdForAcceptance
        })
        .select();
        
      if (insertError) {
        throw new Error(`Error recording acceptance: ${insertError.message}`);
      }
      
      console.log(`Recorded acceptance for user ${userIdForAcceptance}`);
    } else {
      console.log(`User ${userIdForAcceptance} has already accepted this swap`);
    }
    
    // Count how many distinct users have accepted this swap
    const { data: acceptances, error: countError } = await supabaseAdmin
      .from('shift_swap_acceptances')
      .select('user_id')
      .eq('match_id', match_id);
      
    if (countError) {
      throw new Error(`Error counting acceptances: ${countError.message}`);
    }
    
    // Get unique user IDs who have accepted
    const acceptedUserIds = [...new Set(acceptances?.map(a => a.user_id) || [])];
    console.log(`Users who have accepted: ${acceptedUserIds.join(', ')}`);
    
    // Determine if both users have accepted
    const bothAccepted = 
      acceptedUserIds.includes(requesterUserId) && 
      acceptedUserIds.includes(acceptorUserId);
      
    // Determine if other user (not userIdForAcceptance) has accepted
    const otherAccepted = 
      (userIdForAcceptance === requesterUserId && acceptedUserIds.includes(acceptorUserId)) ||
      (userIdForAcceptance === acceptorUserId && acceptedUserIds.includes(requesterUserId));
      
    // Update match status based on acceptance state
    let newStatus = 'pending';
    
    if (bothAccepted) {
      newStatus = 'accepted';
      console.log('Both users have accepted, setting status to accepted');
    } else if (otherAccepted || acceptedUserIds.length === 1) {
      newStatus = 'other_accepted';
      console.log('One user has accepted, setting status to other_accepted');
    }

    // Update match status
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('shift_swap_potential_matches')
      .update({ status: newStatus })
      .eq('id', match_id)
      .select();
    
    if (updateError) {
      throw new Error(`Error updating match: ${updateError.message}`);
    }

    console.log(`Successfully updated match status to ${newStatus}`);

    // Fetch users' email addresses for notification
    const usersPromises = [
      supabaseAdmin.auth.admin.getUserById(requesterUserId),
      supabaseAdmin.auth.admin.getUserById(acceptorUserId)
    ];

    const [requesterUser, acceptorUser] = await Promise.all(usersPromises);

    // Only send email notifications if the match is fully accepted
    if (newStatus === 'accepted') {
      try {
        // Call the resend_swap_notification edge function to handle the email sending
        const emailResponse = await supabaseAdmin.functions.invoke('resend_swap_notification', {
          body: { match_id }
        });
        
        if (emailResponse.error) {
          console.error(`Error sending notification emails: ${emailResponse.error.message}`);
        } else {
          console.log('Successfully sent notification emails');
        }
      } catch (emailError) {
        console.error('Error sending emails:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: updateData,
        status: newStatus,
        bothAccepted,
        otherAccepted
      }),
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
