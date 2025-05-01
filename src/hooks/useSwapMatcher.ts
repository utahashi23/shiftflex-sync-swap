
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
      
      // Step 1: Fetch ALL pending swap requests from ALL users
      console.log('Fetching ALL pending swap requests from ALL users...');
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
      
      console.log(`Found ${allRequests.length} pending swap requests:`, allRequests);
      
      // Extract all user IDs and shift IDs we need to fetch
      const userIds = [...new Set(allRequests.map(req => req.requester_id))];
      const shiftIds = [...new Set(allRequests.map(req => req.requester_shift_id))];
      
      if (userIds.length < 2) {
        toast({
          title: "Insufficient swap requests",
          description: "Need at least two users with pending requests to find matches.",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${userIds.length} users with pending requests:`, userIds);
      
      // Step 2: Fetch all shifts associated with the requests
      console.log('Fetching shifts for all requests...');
      const { data: requestShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds);
        
      if (shiftsError) throw shiftsError;
      
      if (!requestShifts || requestShifts.length === 0) {
        toast({
          title: "Missing shift data",
          description: "Could not find the shifts associated with swap requests.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${requestShifts.length} shifts for pending requests:`, requestShifts);
      
      // Step 3: Fetch all preferred dates for all requests
      console.log('Fetching preferred dates for all requests...');
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
      
      // Step 4: Fetch ALL shifts for ALL users to check for conflicts
      console.log('Fetching all shifts for all users to check for conflicts...');
      const { data: allUserShifts, error: userShiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('user_id', userIds);
        
      if (userShiftsError) throw userShiftsError;
      
      if (!allUserShifts) {
        console.warn('No shifts found for conflict checking');
      } else {
        console.log(`Found ${allUserShifts.length} shifts for conflict checking:`, allUserShifts);
      }
      
      // Build data structures for efficient matching
      
      // 1. Create shift lookup with type and normalized date
      const shiftsById = requestShifts.reduce((acc, shift) => {
        acc[shift.id] = {
          ...shift,
          date: normalizeDate(shift.date),
          type: getShiftType(shift.start_time)
        };
        return acc;
      }, {} as Record<string, any>);
      
      // 2. Group requests by user
      const requestsByUser = allRequests.reduce((acc, req) => {
        if (!acc[req.requester_id]) {
          acc[req.requester_id] = [];
        }
        
        const shift = shiftsById[req.requester_shift_id];
        if (!shift) {
          console.warn(`Missing shift data for request ${req.id}`);
          return acc;
        }
        
        acc[req.requester_id].push({
          id: req.id,
          shiftId: req.requester_shift_id,
          shift: shift,
          preferredDates: []
        });
        return acc;
      }, {} as Record<string, Array<any>>);
      
      // 3. Add preferred dates to each request
      for (const pref of preferredDates) {
        const request = allRequests.find(r => r.id === pref.request_id);
        if (request) {
          const userId = request.requester_id;
          const userRequests = requestsByUser[userId];
          if (!userRequests) continue;
          
          const requestObj = userRequests.find(r => r.id === pref.request_id);
          if (requestObj) {
            requestObj.preferredDates.push({
              id: pref.id,
              date: normalizeDate(pref.date),
              acceptedTypes: pref.accepted_types || []
            });
          }
        }
      }
      
      // 4. Map users to their rostered dates (for conflict checking)
      const userRosteredDates = {};
      if (allUserShifts) {
        allUserShifts.forEach(shift => {
          if (!userRosteredDates[shift.user_id]) {
            userRosteredDates[shift.user_id] = new Set();
          }
          userRosteredDates[shift.user_id].add(normalizeDate(shift.date));
        });
      }
      
      console.log('Data structures prepared:');
      console.log('- Shifts by ID:', shiftsById);
      console.log('- Requests by user:', requestsByUser);
      console.log('- User rostered dates:', userRosteredDates);
      
      // MATCHING ALGORITHM
      console.log('Starting matching algorithm...');
      let matchesFound = 0;
      
      // Compare each user's requests with every other user's requests
      const userIds2 = Object.keys(requestsByUser);
      for (let i = 0; i < userIds2.length; i++) {
        const userId1 = userIds2[i];
        const requests1 = requestsByUser[userId1];
        
        for (const request1 of requests1) {
          const shift1 = request1.shift;
          if (!shift1) continue;
          
          const offeredDate1 = shift1.date;
          const offeredType1 = shift1.type;
          
          console.log(`\nChecking request from user ${userId1} offering ${offeredDate1} (${offeredType1}) shift`);
          
          // Compare with all other users
          for (let j = 0; j < userIds2.length; j++) {
            if (i === j) continue; // Skip self comparison
            
            const userId2 = userIds2[j];
            const requests2 = requestsByUser[userId2];
            
            for (const request2 of requests2) {
              const shift2 = request2.shift;
              if (!shift2) continue;
              
              const offeredDate2 = shift2.date;
              const offeredType2 = shift2.type;
              
              console.log(`Comparing with user ${userId2} offering ${offeredDate2} (${offeredType2}) shift`);
              
              // Check if user1 wants user2's shift (date and type)
              const user1WantsUser2Shift = request1.preferredDates.some(
                pref => pref.date === offeredDate2 && pref.acceptedTypes.includes(offeredType2)
              );
              
              if (!user1WantsUser2Shift) {
                console.log(`- No match: User ${userId1} doesn't want user ${userId2}'s shift`);
                continue;
              }
              
              // Check if user2 wants user1's shift (date and type)
              const user2WantsUser1Shift = request2.preferredDates.some(
                pref => pref.date === offeredDate1 && pref.acceptedTypes.includes(offeredType1)
              );
              
              if (!user2WantsUser1Shift) {
                console.log(`- No match: User ${userId2} doesn't want user ${userId1}'s shift`);
                continue;
              }
              
              // Check for roster conflicts
              const user1HasConflict = userRosteredDates[userId1] && userRosteredDates[userId1].has(offeredDate2);
              if (user1HasConflict) {
                console.log(`- Conflict: User ${userId1} is already rostered on ${offeredDate2}`);
                continue;
              }
              
              const user2HasConflict = userRosteredDates[userId2] && userRosteredDates[userId2].has(offeredDate1);
              if (user2HasConflict) {
                console.log(`- Conflict: User ${userId2} is already rostered on ${offeredDate1}`);
                continue;
              }
              
              // We have a match!
              console.log(`🎉 MATCH FOUND between users ${userId1} and ${userId2}!`);
              
              try {
                // Record the match in potential_matches table
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
                  console.error('Error recording match:', matchError);
                  continue;
                }
                
                console.log('Match recorded:', matchData);
                
                // Update the first request to matched status
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
                
                // Update the second request to matched status
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
                
                // Only match each request once
                break;
              } catch (error) {
                console.error('Error processing match:', error);
              }
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
