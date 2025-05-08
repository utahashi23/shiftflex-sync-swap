
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
    // Get the request body
    const { match_id } = await req.json();

    if (!match_id) {
      return new Response(
        JSON.stringify({ error: 'Missing match_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing resend_swap_notification for match ID: ${match_id}`);

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
    
    // Verify match status is 'accepted'
    if (matchData.status !== 'accepted') {
      throw new Error(`Cannot resend notification for match with status ${matchData.status}. Match must be accepted.`);
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
    ];

    const [requesterUser, acceptorUser, requesterProfile, acceptorProfile] = await Promise.all(usersPromises);
    
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
    
    const requesterName = requesterProfile.data ? 
      `${requesterProfile.data.first_name || ''} ${requesterProfile.data.last_name || ''}`.trim() : 
      'Unknown User';
    
    const acceptorName = acceptorProfile.data ? 
      `${acceptorProfile.data.first_name || ''} ${acceptorProfile.data.last_name || ''}`.trim() : 
      'Unknown User';
    
    const requesterEmployeeId = requesterProfile.data?.employee_id || 'Not specified';
    const acceptorEmployeeId = acceptorProfile.data?.employee_id || 'Not specified';
    
    console.log(`User emails: Requester: ${requesterEmail || 'unknown'}, Acceptor: ${acceptorEmail || 'unknown'}`);
    console.log(`User names: Requester: ${requesterName}, Acceptor: ${acceptorName}`);
    console.log(`Employee IDs: Requester: ${requesterEmployeeId}, Acceptor: ${acceptorEmployeeId}`);

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
    ];

    const [requesterShift, acceptorShift] = await Promise.all(shiftsPromises);
    
    if (requesterShift.error) {
      console.error(`Error fetching requester shift: ${requesterShift.error.message}`);
      // Continue even if we can't get shift details
    }
    
    if (acceptorShift.error) {
      console.error(`Error fetching acceptor shift: ${acceptorShift.error.message}`);
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
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    };

    const formatTime = (timeStr) => {
      return timeStr.substring(0, 5); // Format from "08:00:00" to "08:00"
    };

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
      // Create email for requester with black icons and employee IDs
      const requesterEmailContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Shift Swap Accepted</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            color: #334155;
            background-color: #f8fafc;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
          }
          .header {
            padding: 20px;
            background-color: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
          }
          .header h1 {
            margin: 0;
            color: #0f172a;
            font-size: 22px;
          }
          .content {
            padding: 20px;
          }
          .swap-details {
            margin-bottom: 25px;
          }
          .shift-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .shift-box {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 15px;
            background-color: #f8fafc;
          }
          .shift-box-title {
            font-weight: 500;
            color: #64748b;
            margin-bottom: 10px;
            font-size: 14px;
          }
          .shift-type {
            font-weight: 600;
            margin-bottom: 15px;
            font-size: 16px;
          }
          .shift-detail {
            margin-bottom: 8px;
            display: flex;
            align-items: center;
          }
          .shift-detail-icon {
            margin-right: 8px;
            color: #000000;
            width: 16px;
            display: inline-block;
          }
          .warning-box {
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
          }
          .warning-box p {
            margin: 0 0 10px;
          }
          .warning-box p:last-child {
            margin: 0;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            background-color: #dbeafe;
            color: #1e40af;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 500;
          }
          .footer {
            padding: 15px 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
          }
          @media only screen and (max-width: 620px) {
            .shift-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Shift Swap Notification</h1>
          </div>
          
          <div class="content">
            <div class="swap-details">
              <h2>Your swap has been accepted</h2>
              <p>A colleague has accepted your shift swap request. Details are below:</p>
            </div>
            
            <div class="shift-grid">
              <div class="shift-box">
                <div class="shift-box-title">YOUR SHIFT</div>
                <div class="shift-type">${requesterShiftType.charAt(0).toUpperCase() + requesterShiftType.slice(1)} Shift</div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                      <line x1="16" x2="16" y1="2" y2="6"></line>
                      <line x1="8" x2="8" y1="2" y2="6"></line>
                      <line x1="3" x2="21" y1="10" y2="10"></line>
                    </svg>
                  </span>
                  <span>${formatDate(requesterShift.data?.date)}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </span>
                  <span>${formatTime(requesterShift.data?.start_time)} - ${formatTime(requesterShift.data?.end_time)}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <span>${requesterShift.data?.colleague_type || 'Not specified'}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                  <span>Service#: ${requesterEmployeeId}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </span>
                  <span>${requesterShift.data?.truck_name || 'Not specified'}</span>
                </div>
              </div>
              
              <div class="shift-box">
                <div class="shift-box-title">MATCHED SHIFT</div>
                <div class="shift-type">${acceptorShiftType.charAt(0).toUpperCase() + acceptorShiftType.slice(1)} Shift - ${acceptorName}</div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                      <line x1="16" x2="16" y1="2" y2="6"></line>
                      <line x1="8" x2="8" y1="2" y2="6"></line>
                      <line x1="3" x2="21" y1="10" y2="10"></line>
                    </svg>
                  </span>
                  <span>${formatDate(acceptorShift.data?.date)}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </span>
                  <span>${formatTime(acceptorShift.data?.start_time)} - ${formatTime(acceptorShift.data?.end_time)}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <span>${acceptorShift.data?.colleague_type || 'Not specified'}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                  <span>Service#: ${acceptorEmployeeId}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </span>
                  <span>${acceptorShift.data?.truck_name || 'Not specified'}</span>
                </div>
              </div>
            </div>

            <div class="warning-box">
              <p><strong>Important:</strong> This swap is pending approval from Rosters. Once approved, you'll be notified to finalize the swap.</p>
              <p><strong>Note:</strong> Please do not make any personal arrangements based on this swap until it has been finalized.</p>
            </div>
            
            <div style="margin-top: 25px;">
              <div>Current Status: <span class="status-badge">Accepted</span></div>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for using the Shift Swap system!</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
            <p>Swap Reference: ${match_id}</p>
          </div>
        </div>
      </body>
      </html>
      `;
      
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
      // Create email for acceptor with black icons and employee IDs
      const acceptorEmailContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Shift Swap Confirmation</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            color: #334155;
            background-color: #f8fafc;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
          }
          .header {
            padding: 20px;
            background-color: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
          }
          .header h1 {
            margin: 0;
            color: #0f172a;
            font-size: 22px;
          }
          .content {
            padding: 20px;
          }
          .swap-details {
            margin-bottom: 25px;
          }
          .shift-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .shift-box {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 15px;
            background-color: #f8fafc;
          }
          .shift-box-title {
            font-weight: 500;
            color: #64748b;
            margin-bottom: 10px;
            font-size: 14px;
          }
          .shift-type {
            font-weight: 600;
            margin-bottom: 15px;
            font-size: 16px;
          }
          .shift-detail {
            margin-bottom: 8px;
            display: flex;
            align-items: center;
          }
          .shift-detail-icon {
            margin-right: 8px;
            color: #000000;
            width: 16px;
            display: inline-block;
          }
          .warning-box {
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
          }
          .warning-box p {
            margin: 0 0 10px;
          }
          .warning-box p:last-child {
            margin: 0;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            background-color: #dbeafe;
            color: #1e40af;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 500;
          }
          .footer {
            padding: 15px 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
          }
          @media only screen and (max-width: 620px) {
            .shift-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Shift Swap Confirmation</h1>
          </div>
          
          <div class="content">
            <div class="swap-details">
              <h2>You've accepted a shift swap</h2>
              <p>You have accepted a shift swap request. Details are below:</p>
            </div>
            
            <div class="shift-grid">
              <div class="shift-box">
                <div class="shift-box-title">YOUR SHIFT</div>
                <div class="shift-type">${acceptorShiftType.charAt(0).toUpperCase() + acceptorShiftType.slice(1)} Shift</div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                      <line x1="16" x2="16" y1="2" y2="6"></line>
                      <line x1="8" x2="8" y1="2" y2="6"></line>
                      <line x1="3" x2="21" y1="10" y2="10"></line>
                    </svg>
                  </span>
                  <span>${formatDate(acceptorShift.data?.date)}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </span>
                  <span>${formatTime(acceptorShift.data?.start_time)} - ${formatTime(acceptorShift.data?.end_time)}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <span>${acceptorShift.data?.colleague_type || 'Not specified'}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                  <span>Service#: ${acceptorEmployeeId}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </span>
                  <span>${acceptorShift.data?.truck_name || 'Not specified'}</span>
                </div>
              </div>
              
              <div class="shift-box">
                <div class="shift-box-title">MATCHED SHIFT</div>
                <div class="shift-type">${requesterShiftType.charAt(0).toUpperCase() + requesterShiftType.slice(1)} Shift - ${requesterName}</div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                      <line x1="16" x2="16" y1="2" y2="6"></line>
                      <line x1="8" x2="8" y1="2" y2="6"></line>
                      <line x1="3" x2="21" y1="10" y2="10"></line>
                    </svg>
                  </span>
                  <span>${formatDate(requesterShift.data?.date)}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </span>
                  <span>${formatTime(requesterShift.data?.start_time)} - ${formatTime(requesterShift.data?.end_time)}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <span>${requesterShift.data?.colleague_type || 'Not specified'}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                  <span>Service#: ${requesterEmployeeId}</span>
                </div>
                
                <div class="shift-detail">
                  <span class="shift-detail-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </span>
                  <span>${requesterShift.data?.truck_name || 'Not specified'}</span>
                </div>
              </div>
            </div>

            <div class="warning-box">
              <p><strong>Important:</strong> This swap is pending approval from Rosters. Once approved, you'll be notified to finalize the swap.</p>
              <p><strong>Note:</strong> Please do not make any personal arrangements based on this swap until it has been finalized.</p>
            </div>
            
            <div style="margin-top: 25px;">
              <div>Current Status: <span class="status-badge">Accepted</span></div>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for using the Shift Swap system!</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
            <p>Swap Reference: ${match_id}</p>
          </div>
        </div>
      </body>
      </html>
      `;
      
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
    );
  } catch (error) {
    console.error('Error in resend_swap_notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
