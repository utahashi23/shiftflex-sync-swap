
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

    console.log(`Processing accept_swap_match for match ID: ${match_id}`)

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
        .select('date, start_time, end_time, truck_name, colleague_type')
        .eq('id', matchData.requester_shift_id)
        .single(),
      supabaseAdmin
        .from('shifts')
        .select('date, start_time, end_time, truck_name, colleague_type')
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
    ]

    const [requesterProfile, acceptorProfile] = await Promise.all(profilesPromises)

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
      .select()
    
    if (updateError) {
      throw new Error(`Error updating match: ${updateError.message}`)
    }

    console.log(`Successfully updated match status to accepted`)

    // Send emails in the background - we don't need to await this
    const sendEmails = async () => {
      try {
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

        // Determine shift type based on start time
        const getShiftType = (startTime) => {
          const hour = parseInt(startTime.split(':')[0], 10);
          if (hour <= 8) return 'day';
          if (hour > 8 && hour < 16) return 'afternoon';
          return 'night';
        }

        const requesterShiftType = requesterShift.data ? getShiftType(requesterShift.data.start_time) : 'day';
        const acceptorShiftType = acceptorShift.data ? getShiftType(acceptorShift.data.start_time) : 'day';

        // Get Loop.so API key
        const LOOP_API_KEY = Deno.env.get('LOOP_API_KEY');
        
        if (!LOOP_API_KEY) {
          throw new Error('Missing Loop.so API key configuration');
        }

        // Only attempt to send emails if we have email addresses
        if (requesterEmail) {
          // Create Shift Swap Card styled email for requester
          const requesterEmailContent = `
            <h2>Shift Swap Accepted</h2>
            <p>Good news! Your shift swap has been accepted by ${acceptorName}.</p>
            
            <div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-width: 500px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <!-- Card Header -->
              <div style="padding: 16px; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
                <div style="display: flex; align-items: center;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${requesterShiftType === 'day' ? '#fef3c7' : requesterShiftType === 'afternoon' ? '#ffedd5' : '#dbeafe'}; margin-right: 12px; display: flex; align-items: center; justify-content: center;">
                    <div style="font-weight: bold; color: ${requesterShiftType === 'day' ? '#92400e' : requesterShiftType === 'afternoon' ? '#9a3412' : '#1e40af'};">
                      ${requesterShiftType === 'day' ? '☀️' : requesterShiftType === 'afternoon' ? '🌤️' : '🌙'}
                    </div>
                  </div>
                  <div style="font-weight: 500;">Swap Details</div>
                </div>
              </div>
              
              <!-- Card Content -->
              <div style="padding: 16px; background-color: white;">
                <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px;">Your Original Shift</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                  <div>
                    <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Date</div>
                    <div style="font-weight: 500;">${formatDate(requesterShift.data?.date)}</div>
                  </div>
                  <div>
                    <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Time</div>
                    <div style="font-weight: 500;">${formatTime(requesterShift.data?.start_time)} - ${formatTime(requesterShift.data?.end_time)}</div>
                  </div>
                  <div>
                    <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Location</div>
                    <div style="font-weight: 500;">${requesterShift.data?.truck_name || 'Not specified'}</div>
                  </div>
                </div>
                
                <h3 style="margin-bottom: 12px; font-size: 16px;">Your New Shift</h3>
                <div style="display: flex; justify-content: space-between;">
                  <div>
                    <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Date</div>
                    <div style="font-weight: 500;">${formatDate(acceptorShift.data?.date)}</div>
                  </div>
                  <div>
                    <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Time</div>
                    <div style="font-weight: 500;">${formatTime(acceptorShift.data?.start_time)} - ${formatTime(acceptorShift.data?.end_time)}</div>
                  </div>
                  <div>
                    <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Location</div>
                    <div style="font-weight: 500;">${acceptorShift.data?.truck_name || 'Not specified'}</div>
                  </div>
                </div>
              </div>
              
              <!-- Card Footer -->
              <div style="padding: 12px 16px; border-top: 1px solid #e2e8f0; background-color: #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 14px;">Status:</div>
                <div style="padding: 4px 12px; background-color: #fee2e2; color: #b91c1c; border-radius: 9999px; font-size: 12px; font-weight: 500;">
                  Pending Approval
                </div>
              </div>
            </div>
            
            <p>This swap is pending approval from Rosters. Once approved, you'll be notified to finalize the swap.</p>
            <p><strong>Note:</strong> Please do not make any personal arrangements based on this swap until it has been finalized.</p>
            <p>Thank you for using the Shift Swap system!</p>
          `
          
          // Send email to requester using Loop.so
          try {
            const requesterEmailResponse = await fetch('https://api.loop.so/v1/email/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LOOP_API_KEY}`
              },
              body: JSON.stringify({
                to: [requesterEmail],
                from: "admin@shiftflex.au",
                subject: 'Your Shift Swap Has Been Accepted',
                html: requesterEmailContent
              })
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
          // Create Shift Swap Card styled email for acceptor
          const acceptorEmailContent = `
            <h2>Shift Swap Confirmation</h2>
            <p>You have successfully accepted a shift swap with ${requesterName}.</p>
            
            <div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-width: 500px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <!-- Card Header -->
              <div style="padding: 16px; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
                <div style="display: flex; align-items: center;">
                  <div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${acceptorShiftType === 'day' ? '#fef3c7' : acceptorShiftType === 'afternoon' ? '#ffedd5' : '#dbeafe'}; margin-right: 12px; display: flex; align-items: center; justify-content: center;">
                    <div style="font-weight: bold; color: ${acceptorShiftType === 'day' ? '#92400e' : acceptorShiftType === 'afternoon' ? '#9a3412' : '#1e40af'};">
                      ${acceptorShiftType === 'day' ? '☀️' : acceptorShiftType === 'afternoon' ? '🌤️' : '🌙'}
                    </div>
                  </div>
                  <div style="font-weight: 500;">Swap Details</div>
                </div>
              </div>
              
              <!-- Card Content -->
              <div style="padding: 16px; background-color: white;">
                <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px;">Your Original Shift</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                  <div>
                    <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Date</div>
                    <div style="font-weight: 500;">${formatDate(acceptorShift.data?.date)}</div>
                  </div>
                  <div>
                    <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Time</div>
                    <div style="font-weight: 500;">${formatTime(acceptorShift.data?.start_time)} - ${formatTime(acceptorShift.data?.end_time)}</div>
                  </div>
                  <div>
                    <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Location</div>
                    <div style="font-weight: 500;">${acceptorShift.data?.truck_name || 'Not specified'}</div>
                  </div>
                </div>
                
                <h3 style="margin-bottom: 12px; font-size: 16px;">Your New Shift</h3>
                <div style="display: flex; justify-content: space-between;">
                  <div>
                    <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Date</div>
                    <div style="font-weight: 500;">${formatDate(requesterShift.data?.date)}</div>
                  </div>
                  <div>
                    <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Time</div>
                    <div style="font-weight: 500;">${formatTime(requesterShift.data?.start_time)} - ${formatTime(requesterShift.data?.end_time)}</div>
                  </div>
                  <div>
                    <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Location</div>
                    <div style="font-weight: 500;">${requesterShift.data?.truck_name || 'Not specified'}</div>
                  </div>
                </div>
              </div>
              
              <!-- Card Footer -->
              <div style="padding: 12px 16px; border-top: 1px solid #e2e8f0; background-color: #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 14px;">Status:</div>
                <div style="padding: 4px 12px; background-color: #fee2e2; color: #b91c1c; border-radius: 9999px; font-size: 12px; font-weight: 500;">
                  Pending Approval
                </div>
              </div>
            </div>
            
            <p>This swap is pending approval from Rosters. Once approved, you'll be notified to finalize the swap.</p>
            <p><strong>Note:</strong> Please do not make any personal arrangements based on this swap until it has been finalized.</p>
            <p>Thank you for using the Shift Swap system!</p>
          `
          
          // Send email to acceptor using Loop.so
          try {
            const acceptorEmailResponse = await fetch('https://api.loop.so/v1/email/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LOOP_API_KEY}`
              },
              body: JSON.stringify({
                to: [acceptorEmail],
                from: "admin@shiftflex.au",
                subject: 'Shift Swap Confirmation',
                html: acceptorEmailContent
              })
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
        console.error('Error sending emails:', emailError)
        // We don't throw here since the primary operation (updating the match) succeeded
      }
    }

    // Use EdgeRuntime.waitUntil to run email sending in the background
    try {
      // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
      EdgeRuntime.waitUntil(sendEmails())
    } catch (e) {
      // If EdgeRuntime is not available, just run it without waiting
      sendEmails()
    }

    return new Response(
      JSON.stringify({ success: true, data: updateData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in accept_swap_match:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
