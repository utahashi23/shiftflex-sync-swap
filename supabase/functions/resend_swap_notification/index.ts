
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

    // Fetch detailed user data including profile information 
    const usersPromises = [
      supabaseAdmin.auth.admin.getUserById(requesterUserId),
      supabaseAdmin.auth.admin.getUserById(acceptorUserId),
      supabaseAdmin
        .from('profiles')
        .select('first_name, last_name, employee_id')
        .eq('id', requesterUserId)
        .single(),
      supabaseAdmin
        .from('profiles')
        .select('first_name, last_name, employee_id')
        .eq('id', acceptorUserId)
        .single()
    ]

    const [requesterUser, acceptorUser, requesterProfile, acceptorProfile] = await Promise.all(usersPromises)
    
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
    
    const requesterName = requesterProfile.data ? 
      `${requesterProfile.data.first_name || ''} ${requesterProfile.data.last_name || ''}`.trim() : 
      'Unknown User'
    
    const acceptorName = acceptorProfile.data ? 
      `${acceptorProfile.data.first_name || ''} ${acceptorProfile.data.last_name || ''}`.trim() : 
      'Unknown User'
    
    const requesterEmployeeId = requesterProfile.data?.employee_id || 'Not specified'
    const acceptorEmployeeId = acceptorProfile.data?.employee_id || 'Not specified'
    
    console.log(`User emails: Requester: ${requesterEmail || 'unknown'}, Acceptor: ${acceptorEmail || 'unknown'}`)
    console.log(`User names: Requester: ${requesterName}, Acceptor: ${acceptorName}`)

    // Fetch detailed shift information including colleague types
    const shiftsPromises = [
      supabaseAdmin
        .from('shifts')
        .select('*')
        .eq('id', matchData.requester_shift_id)
        .single(),
      supabaseAdmin
        .from('shifts')
        .select('*')
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
    
    // Determine shift types based on time
    const getShiftType = (startTime) => {
      const hour = parseInt(startTime.split(':')[0], 10);
      if (hour <= 8) return 'day';
      if (hour > 8 && hour < 16) return 'afternoon';
      return 'night';
    };
    
    const requesterShiftType = requesterShift.data ? getShiftType(requesterShift.data.start_time) : 'unknown';
    const acceptorShiftType = acceptorShift.data ? getShiftType(acceptorShift.data.start_time) : 'unknown';

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

    // Check for Mailgun API key (primary email service)
    const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
    const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN') || "shiftflex.au";
    
    if (!MAILGUN_API_KEY) {
      console.error('Missing Mailgun API key');
      throw new Error('Missing Mailgun API configuration');
    }

    // Send emails with detailed information matching SwapDetailsDialog
    const emailResults = [];

    // Only attempt to send emails if we have email addresses
    if (requesterEmail) {
      // Prepare detailed information matching the SwapDetailsDialog format
      const requesterEmailContent = `
        <h2>Shift Swap Accepted</h2>
        <p>Your shift swap has been accepted by your colleague.</p>
        
        <div style="margin-top: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 5px; background-color: #f8fafc;">
          <h3 style="margin-top: 0; color: #4b5563; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Swap Status: <span style="color: #3b82f6; background-color: #dbeafe; padding: 3px 8px; border-radius: 20px; font-size: 14px;">Accepted</span></h3>
          
          <div style="margin-top: 20px;">
            <h4 style="color: #4b5563; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">YOUR ORIGINAL SHIFT</h4>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
              <div>
                <div style="font-size: 13px; color: #6b7280;">Person</div>
                <div style="font-weight: 500;">${requesterName}</div>
              </div>
              
              <div>
                <div style="font-size: 13px; color: #6b7280;">Date</div>
                <div style="font-weight: 500;">${formatDate(requesterShift.data?.date)}</div>
              </div>
              
              <div>
                <div style="font-size: 13px; color: #6b7280;">Shift Type</div>
                <div style="font-weight: 500; display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 12px; ${
                  requesterShiftType === 'day' ? "background-color: #fef3c7; color: #92400e;" :
                  requesterShiftType === 'afternoon' ? "background-color: #ffedd5; color: #9a3412;" :
                  "background-color: #dbeafe; color: #1e40af;"
                }">${requesterShiftType.charAt(0).toUpperCase() + requesterShiftType.slice(1)}</div>
              </div>
              
              <div>
                <div style="font-size: 13px; color: #6b7280;">Time</div>
                <div style="font-weight: 500;">${formatTime(requesterShift.data?.start_time)} - ${formatTime(requesterShift.data?.end_time)}</div>
              </div>
              
              <div style="grid-column: span 2;">
                <div style="font-size: 13px; color: #6b7280;">Colleague Type</div>
                <div style="font-weight: 500;">${requesterShift.data?.colleague_type || 'Not specified'}</div>
              </div>
              
              <div style="grid-column: span 2;">
                <div style="font-size: 13px; color: #6b7280;">Service#</div>
                <div style="font-weight: 500;">${requesterEmployeeId}</div>
              </div>
              
              <div style="grid-column: span 2;">
                <div style="font-size: 13px; color: #6b7280;">Location</div>
                <div style="font-weight: 500;">${requesterShift.data?.truck_name || 'Not specified'}</div>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 30px;">
            <h4 style="color: #4b5563; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">YOUR NEW SHIFT</h4>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
              <div>
                <div style="font-size: 13px; color: #6b7280;">Person</div>
                <div style="font-weight: 500;">${acceptorName}</div>
              </div>
              
              <div>
                <div style="font-size: 13px; color: #6b7280;">Date</div>
                <div style="font-weight: 500;">${formatDate(acceptorShift.data?.date)}</div>
              </div>
              
              <div>
                <div style="font-size: 13px; color: #6b7280;">Shift Type</div>
                <div style="font-weight: 500; display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 12px; ${
                  acceptorShiftType === 'day' ? "background-color: #fef3c7; color: #92400e;" :
                  acceptorShiftType === 'afternoon' ? "background-color: #ffedd5; color: #9a3412;" :
                  "background-color: #dbeafe; color: #1e40af;"
                }">${acceptorShiftType.charAt(0).toUpperCase() + acceptorShiftType.slice(1)}</div>
              </div>
              
              <div>
                <div style="font-size: 13px; color: #6b7280;">Time</div>
                <div style="font-weight: 500;">${formatTime(acceptorShift.data?.start_time)} - ${formatTime(acceptorShift.data?.end_time)}</div>
              </div>
              
              <div style="grid-column: span 2;">
                <div style="font-size: 13px; color: #6b7280;">Colleague Type</div>
                <div style="font-weight: 500;">${acceptorShift.data?.colleague_type || 'Not specified'}</div>
              </div>
              
              <div style="grid-column: span 2;">
                <div style="font-size: 13px; color: #6b7280;">Service#</div>
                <div style="font-weight: 500;">${acceptorEmployeeId}</div>
              </div>
              
              <div style="grid-column: span 2;">
                <div style="font-size: 13px; color: #6b7280;">Location</div>
                <div style="font-weight: 500;">${acceptorShift.data?.truck_name || 'Not specified'}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; border-left: 4px solid #f59e0b; background-color: #fffbeb;">
          <p style="margin: 0;"><strong>Important:</strong> This swap is pending approval from Rosters. Once approved, you'll be notified to finalize the swap.</p>
          <p style="margin-top: 10px;"><strong>Note:</strong> Please do not make any personal arrangements based on this swap until it has been finalized.</p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #6b7280;">
          <p>Thank you for using the Shift Swap system!</p>
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p>Swap Reference: ${match_id}</p>
        </div>
      `
      
      try {
        // Send email using Mailgun
        console.log(`Attempting to send email to requester (${requesterEmail}) via Mailgun`);
        
        // Prepare request for Mailgun
        const formData = new FormData();
        formData.append('from', `Shift Swap System <admin@${MAILGUN_DOMAIN}>`);
        formData.append('to', requesterEmail);
        formData.append('subject', 'Your Shift Swap Has Been Accepted');
        formData.append('html', requesterEmailContent);
        
        // Call Mailgun directly
        const mailgunApiUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
        const requesterEmailResponse = await fetch(mailgunApiUrl, {
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
      // Prepare detailed information matching the SwapDetailsDialog format
      const acceptorEmailContent = `
        <h2>Shift Swap Confirmation</h2>
        <p>You have successfully accepted a shift swap.</p>
        
        <div style="margin-top: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 5px; background-color: #f8fafc;">
          <h3 style="margin-top: 0; color: #4b5563; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Swap Status: <span style="color: #3b82f6; background-color: #dbeafe; padding: 3px 8px; border-radius: 20px; font-size: 14px;">Accepted</span></h3>
          
          <div style="margin-top: 20px;">
            <h4 style="color: #4b5563; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">YOUR ORIGINAL SHIFT</h4>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
              <div>
                <div style="font-size: 13px; color: #6b7280;">Person</div>
                <div style="font-weight: 500;">${acceptorName}</div>
              </div>
              
              <div>
                <div style="font-size: 13px; color: #6b7280;">Date</div>
                <div style="font-weight: 500;">${formatDate(acceptorShift.data?.date)}</div>
              </div>
              
              <div>
                <div style="font-size: 13px; color: #6b7280;">Shift Type</div>
                <div style="font-weight: 500; display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 12px; ${
                  acceptorShiftType === 'day' ? "background-color: #fef3c7; color: #92400e;" :
                  acceptorShiftType === 'afternoon' ? "background-color: #ffedd5; color: #9a3412;" :
                  "background-color: #dbeafe; color: #1e40af;"
                }">${acceptorShiftType.charAt(0).toUpperCase() + acceptorShiftType.slice(1)}</div>
              </div>
              
              <div>
                <div style="font-size: 13px; color: #6b7280;">Time</div>
                <div style="font-weight: 500;">${formatTime(acceptorShift.data?.start_time)} - ${formatTime(acceptorShift.data?.end_time)}</div>
              </div>
              
              <div style="grid-column: span 2;">
                <div style="font-size: 13px; color: #6b7280;">Colleague Type</div>
                <div style="font-weight: 500;">${acceptorShift.data?.colleague_type || 'Not specified'}</div>
              </div>
              
              <div style="grid-column: span 2;">
                <div style="font-size: 13px; color: #6b7280;">Service#</div>
                <div style="font-weight: 500;">${acceptorEmployeeId}</div>
              </div>
              
              <div style="grid-column: span 2;">
                <div style="font-size: 13px; color: #6b7280;">Location</div>
                <div style="font-weight: 500;">${acceptorShift.data?.truck_name || 'Not specified'}</div>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 30px;">
            <h4 style="color: #4b5563; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">YOUR NEW SHIFT</h4>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
              <div>
                <div style="font-size: 13px; color: #6b7280;">Person</div>
                <div style="font-weight: 500;">${requesterName}</div>
              </div>
              
              <div>
                <div style="font-size: 13px; color: #6b7280;">Date</div>
                <div style="font-weight: 500;">${formatDate(requesterShift.data?.date)}</div>
              </div>
              
              <div>
                <div style="font-size: 13px; color: #6b7280;">Shift Type</div>
                <div style="font-weight: 500; display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 12px; ${
                  requesterShiftType === 'day' ? "background-color: #fef3c7; color: #92400e;" :
                  requesterShiftType === 'afternoon' ? "background-color: #ffedd5; color: #9a3412;" :
                  "background-color: #dbeafe; color: #1e40af;"
                }">${requesterShiftType.charAt(0).toUpperCase() + requesterShiftType.slice(1)}</div>
              </div>
              
              <div>
                <div style="font-size: 13px; color: #6b7280;">Time</div>
                <div style="font-weight: 500;">${formatTime(requesterShift.data?.start_time)} - ${formatTime(requesterShift.data?.end_time)}</div>
              </div>
              
              <div style="grid-column: span 2;">
                <div style="font-size: 13px; color: #6b7280;">Colleague Type</div>
                <div style="font-weight: 500;">${requesterShift.data?.colleague_type || 'Not specified'}</div>
              </div>
              
              <div style="grid-column: span 2;">
                <div style="font-size: 13px; color: #6b7280;">Service#</div>
                <div style="font-weight: 500;">${requesterEmployeeId}</div>
              </div>
              
              <div style="grid-column: span 2;">
                <div style="font-size: 13px; color: #6b7280;">Location</div>
                <div style="font-weight: 500;">${requesterShift.data?.truck_name || 'Not specified'}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; border-left: 4px solid #f59e0b; background-color: #fffbeb;">
          <p style="margin: 0;"><strong>Important:</strong> This swap is pending approval from Rosters. Once approved, you'll be notified to finalize the swap.</p>
          <p style="margin-top: 10px;"><strong>Note:</strong> Please do not make any personal arrangements based on this swap until it has been finalized.</p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #6b7280;">
          <p>Thank you for using the Shift Swap system!</p>
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p>Swap Reference: ${match_id}</p>
        </div>
      `
      
      try {
        // Send email using Mailgun
        console.log(`Attempting to send email to acceptor (${acceptorEmail}) via Mailgun`);
        
        // Prepare request for Mailgun
        const formData = new FormData();
        formData.append('from', `Shift Swap System <admin@${MAILGUN_DOMAIN}>`);
        formData.append('to', acceptorEmail);
        formData.append('subject', 'Shift Swap Confirmation');
        formData.append('html', acceptorEmailContent);
        
        // Call Mailgun directly
        const mailgunApiUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
        const acceptorEmailResponse = await fetch(mailgunApiUrl, {
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
