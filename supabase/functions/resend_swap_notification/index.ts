
// Follow this setup guide to integrate the Supabase Edge Functions with your app:
// https://supabase.com/docs/guides/functions/getting-started

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const requestData = await req.json();
    const { match_id } = requestData;
    
    if (!match_id) {
      throw new Error('Missing match_id parameter');
    }
    
    console.log(`Resending notification for match ID: ${match_id}`);
    
    // Create a Supabase admin client for operations that might be restricted by RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // First, get the match details
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
    
    if (matchError || !matchData) {
      throw new Error(`Error fetching match: ${matchError?.message || 'Match not found'}`);
    }
    
    // Fetch the request data to get user IDs
    const requestsPromises = [
      supabaseAdmin
        .from('shift_swap_requests')
        .select('requester_id')
        .eq('id', matchData.requester_request_id)
        .single(),
      supabaseAdmin
        .from('shift_swap_requests')
        .select('requester_id')
        .eq('id', matchData.acceptor_request_id)
        .single()
    ];

    const [requesterRequest, acceptorRequest] = await Promise.all(requestsPromises);
    
    if (requesterRequest.error || acceptorRequest.error) {
      throw new Error('Error fetching request user IDs');
    }
    
    const requesterUserId = requesterRequest.data.requester_id;
    const acceptorUserId = acceptorRequest.data.requester_id;
    
    console.log(`Users involved: Requester: ${requesterUserId}, Acceptor: ${acceptorUserId}`);
    
    // Get user emails
    const usersPromises = [
      supabaseAdmin.auth.admin.getUserById(requesterUserId),
      supabaseAdmin.auth.admin.getUserById(acceptorUserId)
    ];

    const [requesterUser, acceptorUser] = await Promise.all(usersPromises);
    
    if (requesterUser.error || acceptorUser.error) {
      throw new Error('Error fetching user details');
    }
    
    const requesterEmail = requesterUser.data.user?.email;
    const acceptorEmail = acceptorUser.data.user?.email;
    
    if (!requesterEmail || !acceptorEmail) {
      throw new Error('Missing user email addresses');
    }
    
    console.log(`User emails: Requester: ${requesterEmail}, Acceptor: ${acceptorEmail}`);
    
    // Get shifts details for email content
    const shiftsPromises = [
      supabaseAdmin
        .from('shifts')
        .select('id, date, start_time, end_time, truck_name')
        .eq('id', matchData.requester_shift_id)
        .single(),
      supabaseAdmin
        .from('shifts')
        .select('id, date, start_time, end_time, truck_name')
        .eq('id', matchData.acceptor_shift_id)
        .single()
    ];

    const [requesterShift, acceptorShift] = await Promise.all(shiftsPromises);
    
    if (requesterShift.error || acceptorShift.error) {
      throw new Error('Error fetching shift details');
    }
    
    // Format dates and times for email content
    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    };

    const formatTime = (timeStr: string) => {
      return timeStr.substring(0, 5); // Format from "08:00:00" to "08:00"
    };
    
    // Get API key and domain for email
    const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
    const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN') || "shiftflex.au";
    
    if (!MAILGUN_API_KEY) {
      throw new Error('Missing Mailgun API key configuration');
    }
    
    // Send emails to both parties
    const emailResults = await Promise.all([
      // Requester email
      sendEmailWithMailgun({
        to: requesterEmail,
        from: `ShiftFlex <noreply@${MAILGUN_DOMAIN}>`,
        subject: `Shift Swap ${matchData.status.charAt(0).toUpperCase() + matchData.status.slice(1)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h2 style="color: #2563eb; margin-bottom: 20px;">Your Shift Swap Match ${matchData.status.charAt(0).toUpperCase() + matchData.status.slice(1)}</h2>
            <p>This is a resent notification about your shift swap match.</p>
            <h3>Swap Details:</h3>
            <p><strong>Your Current Shift:</strong> ${formatDate(requesterShift.data.date)} from ${formatTime(requesterShift.data.start_time)} to ${formatTime(requesterShift.data.end_time)} at ${requesterShift.data.truck_name || 'your assigned location'}</p>
            <p><strong>Your New Shift (after finalization):</strong> ${formatDate(acceptorShift.data.date)} from ${formatTime(acceptorShift.data.start_time)} to ${formatTime(acceptorShift.data.end_time)} at ${acceptorShift.data.truck_name || 'your colleague\'s location'}</p>
            <p>The swap currently has a status of: <strong>${matchData.status}</strong>.</p>
            <p>Thank you for using the Shift Swap system!</p>
          </div>
        `
      }),
      
      // Acceptor email
      sendEmailWithMailgun({
        to: acceptorEmail,
        from: `ShiftFlex <noreply@${MAILGUN_DOMAIN}>`,
        subject: `Shift Swap ${matchData.status.charAt(0).toUpperCase() + matchData.status.slice(1)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h2 style="color: #2563eb; margin-bottom: 20px;">Your Shift Swap Match ${matchData.status.charAt(0).toUpperCase() + matchData.status.slice(1)}</h2>
            <p>This is a resent notification about your shift swap match.</p>
            <h3>Swap Details:</h3>
            <p><strong>Your Current Shift:</strong> ${formatDate(acceptorShift.data.date)} from ${formatTime(acceptorShift.data.start_time)} to ${formatTime(acceptorShift.data.end_time)} at ${acceptorShift.data.truck_name || 'your assigned location'}</p>
            <p><strong>Your New Shift (after finalization):</strong> ${formatDate(requesterShift.data.date)} from ${formatTime(requesterShift.data.start_time)} to ${formatTime(requesterShift.data.end_time)} at ${requesterShift.data.truck_name || 'your colleague\'s location'}</p>
            <p>The swap currently has a status of: <strong>${matchData.status}</strong>.</p>
            <p>Thank you for using the Shift Swap system!</p>
          </div>
        `
      })
    ]);
    
    console.log('Email sending results:', emailResults);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Notifications resent successfully',
        emails: emailResults
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error resending notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || String(error)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Helper function to send emails using Mailgun
async function sendEmailWithMailgun(options: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY')!;
  const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN') || "shiftflex.au";
  
  // Create FormData for Mailgun request
  const formData = new FormData();
  formData.append('to', options.to);
  formData.append('from', options.from);
  formData.append('subject', options.subject);
  formData.append('html', options.html);
  
  if (options.text) {
    formData.append('text', options.text);
  }
  
  // Send request to Mailgun API
  const mailgunApiUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
  const response = await fetch(mailgunApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa('api:' + MAILGUN_API_KEY)}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mailgun API error: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}
