
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { normalizeDate } from '@/utils/dateUtils';

export const useSwapMatcher = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  /**
   * Determines shift type based on start time
   */
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

  /**
   * Find all potential matches between all pending swap requests
   */
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
      console.log('----------- SWAP MATCHING STARTED -----------');
      
      // Step 1: Get ALL pending swap requests (not filtered by user)
      const { data: allRequests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('status', 'pending')
        .gt('preferred_dates_count', 0);
        
      if (requestsError) throw requestsError;
      
      if (!allRequests || allRequests.length === 0) {
        toast({
          title: "No pending swap requests",
          description: "There are no pending swap requests to match.",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${allRequests.length} pending swap requests with preferred dates:`, allRequests);
      
      // Get all the unique user IDs from the requests
      const userIds = [...new Set(allRequests.map(req => req.requester_id))];
      
      if (userIds.length < 2) {
        toast({
          title: "Insufficient swap requests",
          description: "Need at least two users with pending requests to find matches.",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${userIds.length} users with pending requests:`, userIds);
      
      // Step 2: Get all shifts associated with the requests
      const shiftIds = allRequests.map(req => req.requester_shift_id);
      const { data: allShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds);
        
      if (shiftsError) throw shiftsError;
      
      if (!allShifts || allShifts.length === 0) {
        toast({
          title: "Missing shift data",
          description: "Could not find the shifts associated with swap requests.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${allShifts.length} shifts for the requests:`, allShifts);
      
      // Step 3: Get all preferred dates for all requests
      const requestIds = allRequests.map(req => req.id);
      const { data: preferredDates, error: datesError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*')
        .in('request_id', requestIds);
        
      if (datesError) throw datesError;
      
      if (!preferredDates || preferredDates.length === 0) {
        toast({
          title: "No swap preferences",
          description: "There are no preferred dates set for any requests.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${preferredDates.length} preferred dates:`, preferredDates);
      
      // Step 4: Get all shifts from all users to check for conflicts
      const { data: userShifts, error: userShiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('user_id', userIds);
        
      if (userShiftsError) throw userShiftsError;
      
      console.log('All user shifts found for conflict checking:', userShifts);
      
      // Create lookup maps for efficient access
      const shifts = allShifts.reduce((acc, shift) => {
        acc[shift.id] = {
          ...shift,
          date: normalizeDate(shift.date),
          type: getShiftType(shift.start_time)
        };
        return acc;
      }, {} as Record<string, any>);
      
      // Map users to their rostered dates
      const userRosteredDates = (userShifts || []).reduce((acc, shift) => {
        if (!acc[shift.user_id]) {
          acc[shift.user_id] = new Set();
        }
        acc[shift.user_id].add(normalizeDate(shift.date));
        return acc;
      }, {} as Record<string, Set<string>>);
      
      // Group requests by user
      const requestsByUser = allRequests.reduce((acc, req) => {
        if (!acc[req.requester_id]) {
          acc[req.requester_id] = [];
        }
        acc[req.requester_id].push({
          id: req.id,
          shiftId: req.requester_shift_id,
          shift: shifts[req.requester_shift_id],
          preferredDates: []
        });
        return acc;
      }, {} as Record<string, Array<any>>);
      
      // Add preferred dates to each request
      preferredDates.forEach(pref => {
        const request = allRequests.find(r => r.id === pref.request_id);
        if (request) {
          const normalizedDate = normalizeDate(pref.date);
          const userId = request.requester_id;
          const requestInMap = requestsByUser[userId]?.find(r => r.id === pref.request_id);
          if (requestInMap) {
            requestInMap.preferredDates.push({
              id: pref.id,
              date: normalizedDate,
              acceptedTypes: pref.accepted_types || []
            });
          }
        }
      });
      
      console.log('Requests by user with preferred dates:', requestsByUser);
      
      // Find matches
      let matchesFound = 0;
      
      // For each user
      for (const [userId1, requests1] of Object.entries(requestsByUser)) {
        // For each request from this user
        for (const request1 of requests1) {
          if (!request1.shift) continue;
          
          const offeredDate1 = request1.shift.date;
          const offeredType1 = request1.shift.type;
          
          // For each other user
          for (const [userId2, requests2] of Object.entries(requestsByUser)) {
            // Skip self-matching
            if (userId1 === userId2) continue;
            
            // For each request from other user
            for (const request2 of requests2) {
              if (!request2.shift) continue;
              
              const offeredDate2 = request2.shift.date;
              const offeredType2 = request2.shift.type;
              
              console.log(`\nComparing requests:\nUser ${userId1} offering ${offeredDate1} (${offeredType1})\nUser ${userId2} offering ${offeredDate2} (${offeredType2})`);
              
              // Check if user1 wants user2's shift
              const user1WantsUser2Shift = request1.preferredDates.some(
                pref => pref.date === offeredDate2 && pref.acceptedTypes.includes(offeredType2)
              );
              
              if (!user1WantsUser2Shift) {
                console.log(`No match: User ${userId1} doesn't want user ${userId2}'s shift`);
                continue;
              }
              
              // Check if user2 wants user1's shift
              const user2WantsUser1Shift = request2.preferredDates.some(
                pref => pref.date === offeredDate1 && pref.acceptedTypes.includes(offeredType1)
              );
              
              if (!user2WantsUser1Shift) {
                console.log(`No match: User ${userId2} doesn't want user ${userId1}'s shift`);
                continue;
              }
              
              // Check for roster conflicts
              if (userRosteredDates[userId1]?.has(offeredDate2)) {
                console.log(`Conflict: User ${userId1} is already rostered on ${offeredDate2}`);
                continue;
              }
              
              if (userRosteredDates[userId2]?.has(offeredDate1)) {
                console.log(`Conflict: User ${userId2} is already rostered on ${offeredDate1}`);
                continue;
              }
              
              // We have a match!
              console.log(`MATCH FOUND between users ${userId1} and ${userId2}!`);
              
              // Record the match in potential_matches
              const { data: matchData, error: matchError } = await supabase
                .from('shift_swap_potential_matches')
                .insert({
                  requester_request_id: request1.id,
                  acceptor_request_id: request2.id,
                  requester_shift_id: request1.shiftId,
                  acceptor_shift_id: request2.shiftId,
                  match_date: new Date().toISOString().split('T')[0]
                })
                .select()
                .single();
                
              if (matchError) {
                // Skip if there was an error (likely duplicate match)
                console.error('Error recording match:', matchError);
                continue;
              }
              
              console.log('Match recorded:', matchData);
              
              // Update the first request
              const { error: error1 } = await supabase
                .from('shift_swap_requests')
                .update({
                  status: 'matched',
                  acceptor_id: userId2,
                  acceptor_shift_id: request2.shiftId
                })
                .eq('id', request1.id);
                
              if (error1) {
                console.error('Error updating first request:', error1);
                continue;
              }
              
              // Update the second request
              const { error: error2 } = await supabase
                .from('shift_swap_requests')
                .update({
                  status: 'matched',
                  acceptor_id: userId1,
                  acceptor_shift_id: request1.shiftId
                })
                .eq('id', request2.id);
                
              if (error2) {
                console.error('Error updating second request:', error2);
                // Try to rollback the first update
                await supabase
                  .from('shift_swap_requests')
                  .update({
                    status: 'pending',
                    acceptor_id: null,
                    acceptor_shift_id: null
                  })
                  .eq('id', request1.id);
                continue;
              }
              
              matchesFound++;
              
              // Notify the user if they're involved in the match
              if (userId1 === user.id || userId2 === user.id) {
                toast({
                  title: "Match Found!",
                  description: `Your shift swap request has been matched.`,
                });
              }
              
              // Break this inner loop as each request should only be matched once
              break;
            }
          }
        }
      }
      
      console.log(`Matching complete. Found ${matchesFound} matches.`);
      
      if (matchesFound === 0) {
        toast({
          title: "No matches found",
          description: "No suitable matches found between any of the swap requests.",
        });
      } else {
        toast({
          title: "Matching Complete",
          description: `Found ${matchesFound} swap matches.`,
        });
      }
      
    } catch (error: any) {
      console.error('Error finding swap matches:', error);
      toast({
        title: "Error finding matches",
        description: error.message || "There was a problem finding swap matches.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      console.log('----------- SWAP MATCHING COMPLETED -----------');
    }
  };

  return {
    findSwapMatches,
    isProcessing
  };
};
