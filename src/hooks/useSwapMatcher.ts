
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { normalizeDate } from '@/utils/dateUtils';

interface Shift {
  id: string;
  date: string;
  user_id: string;
  start_time: string;
  end_time: string;
}

interface SwapRequest {
  id: string;
  requester_id: string;
  requester_shift_id: string;
  status: string;
}

interface PreferredDate {
  id: string;
  request_id: string;
  date: string;
  accepted_types: string[];
}

interface IndexedRequest {
  requestId: string;
  requesterId: string;
  offeredShiftId: string;
  offeredDate: string;
  offeredShiftType: string;
}

export const useSwapMatcher = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  const getShiftType = (startTime: string): "day" | "afternoon" | "night" => {
    const startHour = new Date(`2000-01-01T${startTime}`).getHours();
    
    if (startHour <= 8) {
      return 'day';
    } else if (startHour > 8 && startHour < 16) {
      return 'afternoon';
    } else {
      return 'night';
    }
  };

  const findSwapMatches = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to find swap matches.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log('----------- NEW SWAP MATCHING STARTED -----------');
      
      // Step 1: Get ALL pending swap requests
      const { data: pendingRequests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('status', 'pending');
        
      if (requestsError) {
        throw requestsError;
      }
      
      if (!pendingRequests || pendingRequests.length === 0) {
        toast({
          title: "No pending swap requests",
          description: "There are no pending swap requests to match.",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${pendingRequests.length} pending swap requests:`, pendingRequests);
      
      // Extract all unique user IDs from the requests
      const userIds = [...new Set(pendingRequests.map(req => req.requester_id))];
      console.log(`Found ${userIds.length} users with pending requests:`, userIds);
      
      // Step 2: Get all shifts associated with the requests
      const shiftIds = pendingRequests.map(req => req.requester_shift_id);
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds);
        
      if (shiftsError) {
        throw shiftsError;
      }
      
      if (!shiftsData || shiftsData.length === 0) {
        toast({
          title: "Error fetching shifts",
          description: "Could not find the requested shifts.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${shiftsData.length} shifts for the pending requests:`, shiftsData);
      
      // Step 3: Get all preferred dates for ALL requests
      const requestIds = pendingRequests.map(req => req.id);
      const { data: allPreferredDates, error: prefsError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*')
        .in('request_id', requestIds);
        
      if (prefsError) {
        throw prefsError;
      }
      
      console.log(`Found ${allPreferredDates?.length || 0} preferred dates for all requests:`, allPreferredDates);
      
      if (!allPreferredDates || allPreferredDates.length === 0) {
        toast({
          title: "No swap preferences",
          description: "There are no preferred dates set for any requests.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      // Step 4: Get all user shifts to check roster conflicts
      const { data: allUserShifts, error: allShiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('user_id', userIds);
        
      if (allShiftsError) {
        throw allShiftsError;
      }
      
      // Create lookup maps for efficient access
      const shifts: Record<string, Shift> = {};
      const userShifts: Record<string, Set<string>> = {}; // user_id -> Set of dates
      const requestsByUser: Record<string, SwapRequest[]> = {}; // user_id -> array of requests
      
      // Build shifts lookup
      shiftsData.forEach(shift => {
        shifts[shift.id] = {...shift, date: normalizeDate(shift.date)};
      });
      
      // Build user's rostered days lookup
      allUserShifts?.forEach(shift => {
        if (!userShifts[shift.user_id]) {
          userShifts[shift.user_id] = new Set();
        }
        userShifts[shift.user_id].add(normalizeDate(shift.date));
      });
      
      // Group requests by user for easy access
      pendingRequests.forEach(request => {
        if (!requestsByUser[request.requester_id]) {
          requestsByUser[request.requester_id] = [];
        }
        requestsByUser[request.requester_id].push(request);
      });
      
      console.log('User shifts map built:', Object.keys(userShifts).length);
      console.log('Requests by user:', requestsByUser);
      
      // Step 5: Create a mapping from request ID to preferred dates
      const preferencesByRequest: Record<string, PreferredDate[]> = {};
      allPreferredDates.forEach(pref => {
        const normalizedDate = normalizeDate(pref.date);
        if (!preferencesByRequest[pref.request_id]) {
          preferencesByRequest[pref.request_id] = [];
        }
        preferencesByRequest[pref.request_id].push({...pref, date: normalizedDate});
      });
      
      console.log('Preferences by request:', preferencesByRequest);
      
      // Step 6: Find mutual matches across ALL users
      const matches = [];
      const processedRequests = new Set<string>();
      
      // For each user
      for (const userId of userIds) {
        const userRequests = requestsByUser[userId] || [];
        console.log(`Processing ${userRequests.length} requests for user ${userId}`);
        
        // For each request from this user
        for (const request of userRequests) {
          // Skip if already processed
          if (processedRequests.has(request.id)) {
            console.log(`Skipping already processed request ${request.id}`);
            continue;
          }
          
          const offeredShiftId = request.requester_shift_id;
          const offeredShift = shifts[offeredShiftId];
          
          if (!offeredShift) {
            console.error(`Could not find shift data for request ${request.id}`);
            continue;
          }
          
          const offeredDate = normalizeDate(offeredShift.date);
          const offeredShiftType = getShiftType(offeredShift.start_time);
          
          console.log(`\nChecking request ${request.id} offering ${offeredDate} (${offeredShiftType}) from user ${userId}`);
          
          // Get this user's preferred dates for this request
          const userPreferences = preferencesByRequest[request.id] || [];
          console.log(`User ${userId} preferences for request ${request.id}:`, userPreferences);
          
          // Check against all other users' requests
          for (const otherUserId of userIds) {
            // Skip self-matching
            if (otherUserId === userId) {
              console.log(`Skipping self-match for user ${userId}`);
              continue;
            }
            
            const otherUserRequests = requestsByUser[otherUserId] || [];
            console.log(`Checking against ${otherUserRequests.length} requests from user ${otherUserId}`);
            
            // For each request from the other user
            for (const otherRequest of otherUserRequests) {
              // Skip if already processed
              if (processedRequests.has(otherRequest.id)) {
                console.log(`Skipping already processed request ${otherRequest.id}`);
                continue;
              }
              
              const otherOfferedShiftId = otherRequest.requester_shift_id;
              const otherOfferedShift = shifts[otherOfferedShiftId];
              
              if (!otherOfferedShift) {
                console.error(`Could not find shift data for request ${otherRequest.id}`);
                continue;
              }
              
              const otherOfferedDate = normalizeDate(otherOfferedShift.date);
              const otherOfferedShiftType = getShiftType(otherOfferedShift.start_time);
              
              console.log(`Checking against request ${otherRequest.id} offering ${otherOfferedDate} (${otherOfferedShiftType}) from user ${otherUserId}`);
              
              // Get other user's preferred dates for this request
              const otherUserPreferences = preferencesByRequest[otherRequest.id] || [];
              console.log(`User ${otherUserId} preferences:`, otherUserPreferences);
              
              // 1. Check if first user wants second user's offered shift and date
              const user1WantsUser2Shift = userPreferences.some(pref => {
                return pref.date === otherOfferedDate && 
                       (pref.accepted_types as string[]).includes(otherOfferedShiftType);
              });
              
              if (!user1WantsUser2Shift) {
                console.log(`No match: User ${userId} doesn't want user ${otherUserId}'s shift on ${otherOfferedDate}`);
                continue;
              }
              
              console.log(`User ${userId} wants user ${otherUserId}'s shift on ${otherOfferedDate}`);
              
              // 2. Check if second user wants first user's offered shift and date
              const user2WantsUser1Shift = otherUserPreferences.some(pref => {
                return pref.date === offeredDate && 
                       (pref.accepted_types as string[]).includes(offeredShiftType);
              });
              
              if (!user2WantsUser1Shift) {
                console.log(`No match: User ${otherUserId} doesn't want user ${userId}'s shift on ${offeredDate}`);
                continue;
              }
              
              console.log(`User ${otherUserId} wants user ${userId}'s shift on ${offeredDate}`);
              
              // 3. Check roster conflicts
              // Ensure first user is not already rostered on second user's day
              if (userShifts[userId] && userShifts[userId].has(otherOfferedDate)) {
                console.log(`User ${userId} is already rostered on ${otherOfferedDate}`);
                continue;
              }
              
              // Ensure second user is not already rostered on first user's day
              if (userShifts[otherUserId] && userShifts[otherUserId].has(offeredDate)) {
                console.log(`User ${otherUserId} is already rostered on ${offeredDate}`);
                continue;
              }
              
              // We have a match!
              console.log(`MUTUAL MATCH FOUND! User ${userId} and User ${otherUserId}`);
              
              matches.push({
                requester: {
                  id: userId,
                  requestId: request.id,
                  shiftId: offeredShiftId,
                  date: offeredDate
                },
                acceptor: {
                  id: otherUserId,
                  requestId: otherRequest.id,
                  shiftId: otherOfferedShiftId,
                  date: otherOfferedDate
                }
              });
              
              // Mark both requests as processed
              processedRequests.add(request.id);
              processedRequests.add(otherRequest.id);
              
              // No need to check other requests for these two
              break;
            }
            
            // If this request has been matched, break out of the outer loop as well
            if (processedRequests.has(request.id)) {
              break;
            }
          }
        }
      }
      
      console.log(`Found ${matches.length} mutual matches:`, matches);
      
      // Step 7: Update the database with matches
      let successfulMatches = 0;
      
      for (const match of matches) {
        console.log(`Processing match:`, match);
        
        try {
          // Update first user's request
          const { error: error1 } = await supabase
            .from('shift_swap_requests')
            .update({
              status: 'matched',
              acceptor_id: match.acceptor.id,
              acceptor_shift_id: match.acceptor.shiftId
            })
            .eq('id', match.requester.requestId);
            
          if (error1) {
            console.error(`Error updating first request: ${error1.message}`);
            continue;
          }
          
          // Update second user's request
          const { error: error2 } = await supabase
            .from('shift_swap_requests')
            .update({
              status: 'matched',
              acceptor_id: match.requester.id,
              acceptor_shift_id: match.requester.shiftId
            })
            .eq('id', match.acceptor.requestId);
            
          if (error2) {
            console.error(`Error updating second request: ${error2.message}`);
            // Try to rollback the first update
            await supabase
              .from('shift_swap_requests')
              .update({ 
                status: 'pending',
                acceptor_id: null,
                acceptor_shift_id: null
              })
              .eq('id', match.requester.requestId);
            continue;
          }
          
          // Record the match in our table
          const { data: matchData, error: matchError } = await supabase
            .from('shift_swap_matches')
            .insert({
              requester_id: match.requester.id,
              requester_shift_id: match.requester.shiftId,
              acceptor_id: match.acceptor.id,
              acceptor_shift_id: match.acceptor.shiftId,
            })
            .select()
            .single();
            
          if (matchError) {
            console.warn(`Could not record match in history: ${matchError.message}`);
            // Non-critical error, we already updated the swap requests
          } else {
            console.log(`Successfully recorded match in history:`, matchData);
          }
          
          successfulMatches++;
          
          // Notify the user about the match
          if (match.requester.id === user.id || match.acceptor.id === user.id) {
            toast({
              title: "Match Found!",
              description: `Your shift has been matched with another user's shift.`,
            });
          }
        } catch (error) {
          console.error("Error processing match:", error);
        }
      }
      
      if (successfulMatches === 0) {
        toast({
          title: "No matches found",
          description: "We couldn't find any matching swaps at this time. Try again later or adjust your preferences.",
        });
      } else {
        toast({
          title: "Matching Complete",
          description: `Found ${successfulMatches} shift swap matches.`,
        });
      }
      
      console.log('----------- SWAP MATCHING COMPLETED -----------');
      
    } catch (error) {
      console.error('Error finding swap matches:', error);
      toast({
        title: "Error finding matches",
        description: "There was a problem finding swap matches. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    findSwapMatches,
    isProcessing
  };
};
