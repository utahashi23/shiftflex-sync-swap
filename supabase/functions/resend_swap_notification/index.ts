
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
    const { match_id } = await req.json()

    if (!match_id) {
      return new Response(
        JSON.stringify({ error: 'Missing match_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing resend_swap_notification for match ID: ${match_id}`)

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Use service role for operations that might be restricted by RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

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
      .single()
    
    if (matchError) {
      throw new Error(`Error fetching match: ${matchError.message}`)
    }

    if (!matchData) {
      throw new Error('Match not found')
    }
    
    // Verify match status is 'accepted'
    if (matchData.status !== 'accepted') {
      throw new Error(`Cannot resend notification for match with status ${matchData.status}. Match must be accepted.`)
    }

    console.log(`Found match data:`, matchData)

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
    ]

    const [requesterRequest, acceptorRequest] = await Promise.all(requestsPromises)
    
    if (requesterRequest.error) {
      throw new Error(`Error fetching requester request: ${requesterRequest.error.message}`)
    }
    
    if (acceptorRequest.error) {
      throw new Error(`Error fetching acceptor request: ${acceptorRequest.error.message}`)
    }

    const requesterUserId = requesterRequest.data.requester_id
    const acceptorUserId = acceptorRequest.data.requester_id
    
    console.log(`Users involved: Requester ID: ${requesterUserId}, Acceptor ID: ${acceptorUserId}`)

    // Fetch users' email addresses
    const usersPromises = [
      supabaseAdmin.auth.admin.getUserById(requesterUserId),
      supabaseAdmin.auth.admin.getUserById(acceptorUserId)
    ]

    const [requesterUser, acceptorUser] = await Promise.all(usersPromises)
    
    if (requesterUser.error) {
      console.error(`Error fetching requester user: ${requesterUser.error.message}`)
      // Continue even if we can't get the user's email
    }
    
    if (acceptorUser.error) {
      console.error(`Error fetching acceptor user: ${acceptorUser.error.message}`)
      // Continue even if we can't get the user's email
    }

    const requesterEmail = requesterUser.data?.user?.email
    const acceptorEmail = acceptorUser.data?.user?.email
    
    console.log(`User emails: Requester: ${requesterEmail || 'unknown'}, Acceptor: ${acceptorEmail || 'unknown'}`)

    // Fetch shift details for email content
    const shiftsPromises = [
      supabaseAdmin
        .from('shifts')
        .select('date, start_time, end_time, truck_name')
        .eq('id', matchData.requester_shift_id)
        .single(),
      supabaseAdmin
        .from('shifts')
        .select('date, start_time, end_time, truck_name')
        .eq('id', matchData.acceptor_shift_id)
        .single()
    ]

    const [requesterShift, acceptorShift] = await Promise.all(shiftsPromises)
    
    if (requesterShift.error) {
      console.error(`Error fetching requester shift: ${requesterShift.error.message}`)
      // Continue even if we can't get shift details
    }
    
    if (acceptorShift.error) {
      console.error(`Error fetching acceptor shift: ${acceptorShift.error.message}`)
      // Continue even if we can't get shift details
    }

    // Format the shift dates and times for email content
    const formatDate = (dateStr) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    }

    const formatTime = (timeStr) => {
      return timeStr.substring(0, 5) // Format from "08:00:00" to "08:00"
    }

    // Get mailgun config
    const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
    const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN');
    
    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      console.error('Missing Mailgun configuration. API Key exists:', !!MAILGUN_API_KEY, ', Domain exists:', !!MAILGUN_DOMAIN);
      throw new Error('Missing Mailgun configuration');
    }

    // Send emails
    const emailResults = [];

    // Only attempt to send emails if we have email addresses
    if (requesterEmail) {
      const requesterEmailContent = `
        <h2>Shift Swap Accepted (Re-sent Notification)</h2>
        <p>Your shift swap has been accepted by your colleague.</p>
        <h3>Swap Details:</h3>
        <p><strong>Your Original Shift:</strong> ${formatDate(requesterShift.data?.date)} from ${formatTime(requesterShift.data?.start_time)} to ${formatTime(requesterShift.data?.end_time)} at ${requesterShift.data?.truck_name || 'your assigned location'}</p>
        <p><strong>Your New Shift:</strong> ${formatDate(acceptorShift.data?.date)} from ${formatTime(acceptorShift.data?.start_time)} to ${formatTime(acceptorShift.data?.end_time)} at ${acceptorShift.data?.truck_name || 'your colleague\'s location'}</p>
        <p>This swap is pending approval from Rosters. Once approved, you'll be notified to finalize the swap.</p>
        <p><strong>Note:</strong> Please do not make any personal arrangements based on this swap until it has been finalized.</p>
        <p>Thank you for using the Shift Swap system!</p>
      `
      
      try {
        // Send email to requester using Mailgun
        const formData = new FormData();
        formData.append('from', `Shift Swap <no-reply@${MAILGUN_DOMAIN}>`);
        formData.append('to', requesterEmail);
        formData.append('subject', 'Your Shift Swap Has Been Accepted (Re-sent Notification)');
        formData.append('html', requesterEmailContent);
        
        console.log(`Attempting to send email to requester (${requesterEmail}) using domain: ${MAILGUN_DOMAIN}`);
        
        const requesterEmailResponse = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa('api:' + MAILGUN_API_KEY)}`
          },
          body: formData
        });
        
        if (!requesterEmailResponse.ok) {
          const errorText = await requesterEmailResponse.text();
          console.error(`Error sending email to requester: ${errorText}`);
          console.error(`HTTP Status: ${requesterEmailResponse.status}`);
          emailResults.push({ recipient: 'requester', success: false, error: errorText });
        } else {
          const responseData = await requesterEmailResponse.json();
          console.log(`Email sent to requester: ${requesterEmail}`, responseData);
          emailResults.push({ recipient: 'requester', success: true });
        }
      } catch (emailError) {
        console.error('Exception sending requester email:', emailError);
        emailResults.push({ recipient: 'requester', success: false, error: emailError.message });
      }
    } else {
      console.warn('No requester email available');
    }

    if (acceptorEmail) {
      const acceptorEmailContent = `
        <h2>Shift Swap Confirmation (Re-sent Notification)</h2>
        <p>You have successfully accepted a shift swap.</p>
        <h3>Swap Details:</h3>
        <p><strong>Your Original Shift:</strong> ${formatDate(acceptorShift.data?.date)} from ${formatTime(acceptorShift.data?.start_time)} to ${formatTime(acceptorShift.data?.end_time)} at ${acceptorShift.data?.truck_name || 'your assigned location'}</p>
        <p><strong>Your New Shift:</strong> ${formatDate(requesterShift.data?.date)} from ${formatTime(requesterShift.data?.start_time)} to ${formatTime(requesterShift.data?.end_time)} at ${requesterShift.data?.truck_name || 'your colleague\'s location'}</p>
        <p>This swap is pending approval from Rosters. Once approved, you'll be notified to finalize the swap.</p>
        <p><strong>Note:</strong> Please do not make any personal arrangements based on this swap until it has been finalized.</p>
        <p>Thank you for using the Shift Swap system!</p>
      `
      
      try {
        // Send email to acceptor using Mailgun
        const formData = new FormData();
        formData.append('from', `Shift Swap <no-reply@${MAILGUN_DOMAIN}>`);
        formData.append('to', acceptorEmail);
        formData.append('subject', 'Shift Swap Confirmation (Re-sent Notification)');
        formData.append('html', acceptorEmailContent);
        
        console.log(`Attempting to send email to acceptor (${acceptorEmail}) using domain: ${MAILGUN_DOMAIN}`);
        
        const acceptorEmailResponse = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa('api:' + MAILGUN_API_KEY)}`
          },
          body: formData
        });
        
        if (!acceptorEmailResponse.ok) {
          const errorText = await acceptorEmailResponse.text();
          console.error(`Error sending email to acceptor: ${errorText}`);
          console.error(`HTTP Status: ${acceptorEmailResponse.status}`);
          emailResults.push({ recipient: 'acceptor', success: false, error: errorText });
        } else {
          const responseData = await acceptorEmailResponse.json();
          console.log(`Email sent to acceptor: ${acceptorEmail}`, responseData);
          emailResults.push({ recipient: 'acceptor', success: true });
        }
      } catch (emailError) {
        console.error('Exception sending acceptor email:', emailError);
        emailResults.push({ recipient: 'acceptor', success: false, error: emailError.message });
      }
    } else {
      console.warn('No acceptor email available');
    }

    return new Response(
      JSON.stringify({ success: true, emailResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in resend_swap_notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
