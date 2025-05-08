
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

    // Fetch shift details for email content
    const shiftsPromises = [
      supabaseAdmin
        .from('shifts')
        .select('date, start_time, end_time, truck_name, colleague_type')
        .eq('id', matchData.requester_shift_id)
        .single(),
      supabaseAdmin
        .from('shifts')
        .select('date, start_time, end_time, truck_name, colleague_type')
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

    // Fetch profiles to get full names
    const profilesPromises = [
      supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', requesterUserId)
        .single(),
      supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', acceptorUserId)
        .single()
    ];

    const [requesterProfile, acceptorProfile] = await Promise.all(profilesPromises);

    const requesterName = requesterProfile.data ? 
      `${requesterProfile.data.first_name || ''} ${requesterProfile.data.last_name || ''}`.trim() : 
      "Colleague";
      
    const acceptorName = acceptorProfile.data ? 
      `${acceptorProfile.data.first_name || ''} ${acceptorProfile.data.last_name || ''}`.trim() : 
      "Colleague";

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

    // Send emails in the background - we don't need to await this
    const sendEmails = async () => {
      try {
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
          throw new Error('Missing Mailgun API key configuration');
        }

        // Only attempt to send emails if we have email addresses
        if (requesterEmail) {
          // Create informative email for requester with shift details
          const requesterEmailContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Shift Swap Request Accepted</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px; 
              }
              .header { 
                background-color: #3b82f6; 
                color: white; 
                padding: 15px; 
                text-align: center; 
                border-radius: 5px 5px 0 0; 
              }
              .content { 
                padding: 20px; 
                border: 1px solid #ddd; 
                border-top: none; 
                border-radius: 0 0 5px 5px; 
              }
              .shift-details { 
                background-color: #f9fafb; 
                padding: 15px; 
                margin: 15px 0; 
                border-left: 4px solid #3b82f6; 
              }
              .swap-arrow {
                text-align: center;
                font-size: 24px;
                margin: 10px 0;
              }
              .warning {
                background-color: #fff3cd;
                border-left: 4px solid #ffca2c;
                padding: 15px;
                margin: 15px 0;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 15px 0; 
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 8px; 
                text-align: left; 
              }
              th { 
                background-color: #f2f2f2; 
              }
              .footer { 
                margin-top: 20px; 
                font-size: 12px; 
                color: #666; 
                border-top: 1px solid #eee; 
                padding-top: 10px; 
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Your Shift Swap Request Has Been Accepted</h2>
            </div>
            <div class="content">
              <p>Hello ${requesterName},</p>
              <p>Your shift swap request has been accepted by ${acceptorName}. Here are the details of the swap:</p>
              
              <div class="shift-details">
                <h3>Your Original Shift:</h3>
                <ul>
                  <li><strong>Date:</strong> ${formatDate(requesterShift.data?.date)}</li>
                  <li><strong>Time:</strong> ${formatTime(requesterShift.data?.start_time)} - ${formatTime(requesterShift.data?.end_time)}</li>
                  <li><strong>Location:</strong> ${requesterShift.data?.truck_name || 'Not specified'}</li>
                  <li><strong>Role:</strong> ${requesterShift.data?.colleague_type || 'Not specified'}</li>
                </ul>
              </div>
              
              <div class="swap-arrow">↓↑</div>
              
              <div class="shift-details">
                <h3>New Shift (From ${acceptorName}):</h3>
                <ul>
                  <li><strong>Date:</strong> ${formatDate(acceptorShift.data?.date)}</li>
                  <li><strong>Time:</strong> ${formatTime(acceptorShift.data?.start_time)} - ${formatTime(acceptorShift.data?.end_time)}</li>
                  <li><strong>Location:</strong> ${acceptorShift.data?.truck_name || 'Not specified'}</li>
                  <li><strong>Role:</strong> ${acceptorShift.data?.colleague_type || 'Not specified'}</li>
                </ul>
              </div>
              
              <div class="warning">
                <p><strong>Important:</strong> This swap is now pending approval from roster management. You will receive another notification once it has been reviewed.</p>
                <p>Please do not make any personal arrangements based on this swap until it has been finalized by management.</p>
              </div>
              
              <table>
                <tr>
                  <th>Match ID</th>
                  <td>${match_id}</td>
                </tr>
                <tr>
                  <th>Status</th>
                  <td>Accepted (Pending approval)</td>
                </tr>
                <tr>
                  <th>Date Accepted</th>
                  <td>${new Date().toLocaleString()}</td>
                </tr>
              </table>
              
              <p>You can view and manage your shift swaps in the ShiftFlex application.</p>
            </div>
            <div class="footer">
              <p>This is an automated notification from the Shift Swap system. Please do not reply to this email.</p>
              <p>© ${new Date().getFullYear()} ShiftFlex - All rights reserved.</p>
            </div>
          </body>
          </html>
          `;
          
          // Send email to requester using Mailgun
          try {
            const formData = new FormData();
            formData.append('from', `Shift Swap System <admin@${MAILGUN_DOMAIN}>`);
            formData.append('to', requesterEmail);
            formData.append('subject', 'Your Shift Swap Has Been Accepted');
            formData.append('html', requesterEmailContent);
            
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
            } else {
              console.log(`Email sent to requester: ${requesterEmail}`);
            }
          } catch (emailError) {
            console.error(`Exception sending email to requester: ${emailError.message}`);
          }
        }

        if (acceptorEmail) {
          // Create informative email for acceptor with shift details
          const acceptorEmailContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Shift Swap Confirmation</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px; 
              }
              .header { 
                background-color: #3b82f6; 
                color: white; 
                padding: 15px; 
                text-align: center; 
                border-radius: 5px 5px 0 0; 
              }
              .content { 
                padding: 20px; 
                border: 1px solid #ddd; 
                border-top: none; 
                border-radius: 0 0 5px 5px; 
              }
              .shift-details { 
                background-color: #f9fafb; 
                padding: 15px; 
                margin: 15px 0; 
                border-left: 4px solid #3b82f6; 
              }
              .swap-arrow {
                text-align: center;
                font-size: 24px;
                margin: 10px 0;
              }
              .warning {
                background-color: #fff3cd;
                border-left: 4px solid #ffca2c;
                padding: 15px;
                margin: 15px 0;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 15px 0; 
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 8px; 
                text-align: left; 
              }
              th { 
                background-color: #f2f2f2; 
              }
              .footer { 
                margin-top: 20px; 
                font-size: 12px; 
                color: #666; 
                border-top: 1px solid #eee; 
                padding-top: 10px; 
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Shift Swap Confirmation</h2>
            </div>
            <div class="content">
              <p>Hello ${acceptorName},</p>
              <p>You have successfully accepted a shift swap request from ${requesterName}. Here are the details of the swap:</p>
              
              <div class="shift-details">
                <h3>Your Original Shift:</h3>
                <ul>
                  <li><strong>Date:</strong> ${formatDate(acceptorShift.data?.date)}</li>
                  <li><strong>Time:</strong> ${formatTime(acceptorShift.data?.start_time)} - ${formatTime(acceptorShift.data?.end_time)}</li>
                  <li><strong>Location:</strong> ${acceptorShift.data?.truck_name || 'Not specified'}</li>
                  <li><strong>Role:</strong> ${acceptorShift.data?.colleague_type || 'Not specified'}</li>
                </ul>
              </div>
              
              <div class="swap-arrow">↓↑</div>
              
              <div class="shift-details">
                <h3>New Shift (From ${requesterName}):</h3>
                <ul>
                  <li><strong>Date:</strong> ${formatDate(requesterShift.data?.date)}</li>
                  <li><strong>Time:</strong> ${formatTime(requesterShift.data?.start_time)} - ${formatTime(requesterShift.data?.end_time)}</li>
                  <li><strong>Location:</strong> ${requesterShift.data?.truck_name || 'Not specified'}</li>
                  <li><strong>Role:</strong> ${requesterShift.data?.colleague_type || 'Not specified'}</li>
                </ul>
              </div>
              
              <div class="warning">
                <p><strong>Important:</strong> This swap is now pending approval from roster management. You will receive another notification once it has been reviewed.</p>
                <p>Please do not make any personal arrangements based on this swap until it has been finalized by management.</p>
              </div>
              
              <table>
                <tr>
                  <th>Match ID</th>
                  <td>${match_id}</td>
                </tr>
                <tr>
                  <th>Status</th>
                  <td>Accepted (Pending approval)</td>
                </tr>
                <tr>
                  <th>Date Accepted</th>
                  <td>${new Date().toLocaleString()}</td>
                </tr>
              </table>
              
              <p>You can view and manage your shift swaps in the ShiftFlex application.</p>
            </div>
            <div class="footer">
              <p>This is an automated notification from the Shift Swap system. Please do not reply to this email.</p>
              <p>© ${new Date().getFullYear()} ShiftFlex - All rights reserved.</p>
            </div>
          </body>
          </html>
          `;
          
          // Send email to acceptor using Mailgun
          try {
            const formData = new FormData();
            formData.append('from', `Shift Swap System <admin@${MAILGUN_DOMAIN}>`);
            formData.append('to', acceptorEmail);
            formData.append('subject', 'Shift Swap Confirmation');
            formData.append('html', acceptorEmailContent);
            
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
            } else {
              console.log(`Email sent to acceptor: ${acceptorEmail}`);
            }
          } catch (emailError) {
            console.error(`Exception sending email to acceptor: ${emailError.message}`);
          }
        }
      } catch (emailError) {
        console.error('Error sending emails:', emailError);
        // We don't throw here since the primary operation (updating the match) succeeded
      }
    };

    // Use EdgeRuntime.waitUntil to run email sending in the background
    try {
      // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
      EdgeRuntime.waitUntil(sendEmails());
    } catch (e) {
      // If EdgeRuntime is not available, just run it without waiting
      sendEmails();
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
