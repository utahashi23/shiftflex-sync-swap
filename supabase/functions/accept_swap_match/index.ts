
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
    // Create a Supabase client with the Auth context of the logged-in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the request body
    const { match_id, user_id } = await req.json();

    if (!match_id) {
      return new Response(
        JSON.stringify({ error: 'Missing match_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get all data needed
    const { data: match, error: matchError } = await supabaseClient
      .from('shift_swap_potential_matches')
      .select('*')
      .eq('id', match_id)
      .single();
    
    if (matchError) {
      throw new Error(`Error fetching match: ${matchError.message}`);
    }
    
    if (!match) {
      throw new Error('Match not found');
    }

    // Check if match is already accepted
    if (match.status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          error: `Match has already been ${match.status}`,
          match: match 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Accept the match
    const { data: acceptedMatch, error: acceptError } = await supabaseClient
      .from('shift_swap_potential_matches')
      .update({ status: 'accepted' })
      .eq('id', match_id)
      .select()
      .single();
    
    if (acceptError) {
      throw new Error(`Error accepting match: ${acceptError.message}`);
    }

    // Update other matches with the same requester_shift_id or acceptor_shift_id to 'other_accepted'
    const { error: updateOtherMatchesError } = await supabaseClient
      .from('shift_swap_potential_matches')
      .update({ status: 'other_accepted' })
      .neq('id', match_id)
      .eq('status', 'pending')
      .or(`requester_shift_id.eq.${match.requester_shift_id},acceptor_shift_id.eq.${match.acceptor_shift_id}`);
    
    if (updateOtherMatchesError) {
      console.warn(`Warning: Error updating other matches: ${updateOtherMatchesError.message}`);
      // Continue anyway - this is not critical
    }

    // Get both shifts involved in this match
    const { data: shifts, error: shiftsError } = await supabaseClient
      .from('shifts')
      .select('*, users:user_id(email)')
      .or(`id.eq.${match.requester_shift_id},id.eq.${match.acceptor_shift_id}`);
    
    if (shiftsError || !shifts || shifts.length !== 2) {
      console.error(`Error fetching shift details: ${shiftsError?.message || 'Invalid number of shifts'}`);
      // Continue anyway, we'll just have less info in the email
    }

    // Get requests data
    const { data: requests, error: requestsError } = await supabaseClient
      .from('shift_swap_requests')
      .select('*, users:requester_id(email, profiles:profiles(first_name, last_name))')
      .or(`id.eq.${match.requester_request_id},id.eq.${match.acceptor_request_id}`);
    
    if (requestsError || !requests || requests.length !== 2) {
      console.error(`Error fetching request details: ${requestsError?.message || 'Invalid number of requests'}`);
      // Continue anyway, we'll just have less info in the email
    }

    // Send email notifications
    try {
      if (shifts && shifts.length === 2 && requests && requests.length === 2) {
        // Find requester and acceptor information
        const requesterRequest = requests.find(r => r.id === match.requester_request_id);
        const acceptorRequest = requests.find(r => r.id === match.acceptor_request_id);
        
        if (requesterRequest && acceptorRequest) {
          // Format date to a readable string
          const formatDate = (dateStr) => {
            return new Date(dateStr).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            });
          };

          // Format time from HH:MM:SS to HH:MM
          const formatTime = (timeStr) => {
            return timeStr.substring(0, 5);
          };

          // Determine shift type based on start time
          const getShiftType = (startTime) => {
            const hour = parseInt(startTime.split(':')[0], 10);
            if (hour <= 8) return 'day';
            if (hour > 8 && hour < 16) return 'afternoon';
            return 'night';
          };

          // Create HTML for shift details section
          const createShiftDetailHtml = (shift, label) => {
            const shiftType = getShiftType(shift.start_time);
            let bgColor, textColor;
            
            // Match the ShiftTypeBadge styling
            switch (shiftType) {
              case 'day':
                bgColor = '#FEFCE8';
                textColor = '#CA8A04';
                break;
              case 'afternoon':
                bgColor = '#FFEDD5';
                textColor = '#C2410C';
                break;
              default: // night
                bgColor = '#EFF6FF';
                textColor = '#1D4ED8';
                break;
            }

            return `
              <div style="margin-bottom: 16px;">
                <p style="font-size: 14px; color: #666; margin-bottom: 8px;">${label}</p>
                <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; background-color: #fff;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="display: inline-block; background-color: ${bgColor}; color: ${textColor}; font-size: 12px; font-weight: 500; padding: 4px 8px; border-radius: 9999px;">
                      ${shiftType.charAt(0).toUpperCase() + shiftType.slice(1)} Shift
                    </span>
                  </div>
                  <div style="margin-top: 8px; display: flex; align-items: center;">
                    <span style="width: 16px; height: 16px; margin-right: 8px;">📅</span>
                    <span style="font-size: 14px;">${formatDate(shift.date)}</span>
                  </div>
                  <div style="margin-top: 6px; display: flex; align-items: center;">
                    <span style="width: 16px; height: 16px; margin-right: 8px;">⏰</span>
                    <span style="font-size: 14px;">${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}</span>
                  </div>
                  <div style="margin-top: 6px; display: flex; align-items: center;">
                    <span style="width: 16px; height: 16px; margin-right: 8px;">👤</span>
                    <span style="font-size: 14px;">${shift.colleague_type || 'Unknown type'}</span>
                  </div>
                  ${shift.truck_name ? `
                    <div style="margin-top: 8px; font-size: 12px; color: #666;">
                      ${shift.truck_name}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          };

          // Find the shifts
          const requesterShift = shifts.find(s => s.id === match.requester_shift_id);
          const acceptorShift = shifts.find(s => s.id === match.acceptor_shift_id);
          
          if (requesterShift && acceptorShift) {
            // Create email content for requester
            const requesterEmail = requesterRequest.users.email;
            const requesterName = requesterRequest.users.profiles?.first_name || 'colleague';
            
            if (requesterEmail) {
              const requesterHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                  <h2 style="color: #2563eb; margin-bottom: 20px;">Your Shift Swap Request Has Been Accepted</h2>
                  
                  <p>Hello ${requesterName},</p>
                  
                  <p>Good news! Your shift swap request has been accepted. Here are the details:</p>
                  
                  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
                    <h3 style="font-size: 16px; margin-top: 0;">Swap Details</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
                      ${createShiftDetailHtml(requesterShift, 'Your Original Shift')}
                      ${createShiftDetailHtml(acceptorShift, 'Your New Shift')}
                    </div>
                    
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                      <p style="font-size: 14px; color: #4b5563;">
                        <strong>Status:</strong> <span style="background-color: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 500; padding: 4px 8px; border-radius: 9999px;">Accepted</span>
                      </p>
                      <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">
                        This swap has been accepted but still needs final approval. Once approved, it will be reflected in your official schedule.
                      </p>
                    </div>
                  </div>
                  
                  <p>Your swap will be processed shortly. If you have any questions, please contact your manager.</p>
                  
                  <p style="margin-top: 24px;">Thanks,<br>The Shift Swap Team</p>
                </div>
              `;
              
              // Send the email using the send_email function
              const { data: sendEmailResult, error: sendEmailError } = await supabaseClient.functions.invoke('send_email', {
                body: {
                  to: requesterEmail,
                  subject: 'Your Shift Swap Request Has Been Accepted',
                  html: requesterHtml,
                  from: 'admin@shiftflex.au'
                }
              });
              
              if (sendEmailError) {
                console.error(`Error sending email to requester: ${sendEmailError}`);
              } else {
                console.log(`Sent acceptance email to requester: ${requesterEmail}`);
              }
            }
            
            // Create email content for acceptor  
            const acceptorEmail = acceptorRequest.users.email;
            const acceptorName = acceptorRequest.users.profiles?.first_name || 'colleague';
            
            if (acceptorEmail) {
              const acceptorHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                  <h2 style="color: #2563eb; margin-bottom: 20px;">Shift Swap Confirmation</h2>
                  
                  <p>Hello ${acceptorName},</p>
                  
                  <p>You have successfully accepted a shift swap. Here are the details:</p>
                  
                  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0;">
                    <h3 style="font-size: 16px; margin-top: 0;">Swap Details</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
                      ${createShiftDetailHtml(acceptorShift, 'Your Original Shift')}
                      ${createShiftDetailHtml(requesterShift, 'Your New Shift')}
                    </div>
                    
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                      <p style="font-size: 14px; color: #4b5563;">
                        <strong>Status:</strong> <span style="background-color: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 500; padding: 4px 8px; border-radius: 9999px;">Accepted</span>
                      </p>
                      <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">
                        This swap has been accepted but still needs final approval. Once approved, it will be reflected in your official schedule.
                      </p>
                    </div>
                  </div>
                  
                  <p>Your swap will be processed shortly. If you have any questions, please contact your manager.</p>
                  
                  <p style="margin-top: 24px;">Thanks,<br>The Shift Swap Team</p>
                </div>
              `;
              
              // Send the email using the send_email function
              const { data: sendEmailResult, error: sendEmailError } = await supabaseClient.functions.invoke('send_email', {
                body: {
                  to: acceptorEmail,
                  subject: 'You Have Accepted a Shift Swap',
                  html: acceptorHtml,
                  from: 'admin@shiftflex.au'
                }
              });
              
              if (sendEmailError) {
                console.error(`Error sending email to acceptor: ${sendEmailError}`);
              } else {
                console.log(`Sent acceptance email to acceptor: ${acceptorEmail}`);
              }
            }
          }
        }
      }
    } catch (emailError) {
      console.error('Error sending email notifications:', emailError);
      // Continue anyway - emails are not critical for the function to succeed
    }

    // Create scheduled cron job for hourly checks
    try {
      // Create a SQL client with admin privileges to create the cron job
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      // Check if the pg_cron and pg_net extensions are available
      const { data: extensions, error: extensionsError } = await supabaseAdmin.rpc('get_available_extensions');
      
      if (extensionsError) {
        console.warn('Could not check for extensions, skipping cron job creation:', extensionsError);
      } else {
        const hasCron = extensions.some(ext => ext.name === 'pg_cron' && ext.installed_version);
        const hasNet = extensions.some(ext => ext.name === 'pg_net' && ext.installed_version);
        
        if (hasCron && hasNet) {
          // Set up the cron job for hourly checks
          const { data: cronData, error: cronError } = await supabaseAdmin.rpc('create_hourly_match_check');
          
          if (cronError) {
            console.error('Error setting up hourly cron job:', cronError);
          } else {
            console.log('Successfully set up hourly cron job for match notifications');
          }
        } else {
          console.warn('Required extensions not available, skipping cron job creation. Need pg_cron and pg_net.');
        }
      }
    } catch (cronError) {
      console.warn('Error setting up cron job (non-critical):', cronError);
      // Continue anyway - cron job is not critical for the function to succeed
    }

    return new Response(
      JSON.stringify({ success: true, match: acceptedMatch }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in accept_swap_match:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
