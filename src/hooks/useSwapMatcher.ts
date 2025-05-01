
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
   * Using a simplified matching algorithm
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
      
      // Step 1: Fetch ALL pending swap requests from ALL users (no user filter)
      console.log('Fetching ALL pending swap requests...');
      const { data: allRequests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('status', 'pending');
        
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
      
      // Step 2: Get all preferred dates
      const requestIds = allRequests.map(req => req.id);
      console.log('Fetching preferred dates...');
      const { data: preferredDates, error: datesError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*')
        .in('request_id', requestIds);
        
      if (datesError) throw datesError;
      
      if (!preferredDates || preferredDates.length === 0) {
        toast({
          title: "No swap preferences",
          description: "There are no preferred dates set for any requests.",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${preferredDates.length} preferred dates:`, preferredDates);
      
      // Step 3: Get ALL shifts for ALL users (removed userId filter)
      console.log('Fetching all shifts for all users...');
      const { data: allShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*');
        
      if (shiftsError) throw shiftsError;
      
      if (!allShifts || allShifts.length === 0) {
        toast({
          title: "No shifts found",
          description: "No shifts found in the system.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${allShifts.length} shifts across all users:`, allShifts);
      
      // Create lookup maps for more efficient matching
      const shiftsByDate = {};
      const shiftsByUser = {};
      const requestsByUser = {};
      const requestShifts = {}; // Map request's shift_id to shift details
      
      // Build shifts by date index
      allShifts.forEach(shift => {
        const normalizedDate = normalizeDate(shift.date);
        if (!shiftsByDate[normalizedDate]) {
          shiftsByDate[normalizedDate] = [];
        }
        shiftsByDate[normalizedDate].push({
          ...shift,
          type: getShiftType(shift.start_time)
        });
        
        // Group shifts by user
        if (!shiftsByUser[shift.user_id]) {
          shiftsByUser[shift.user_id] = [];
        }
        shiftsByUser[shift.user_id].push(normalizedDate);
      });
      
      // Group requests by user
      allRequests.forEach(req => {
        if (!requestsByUser[req.requester_id]) {
          requestsByUser[req.requester_id] = [];
        }
        requestsByUser[req.requester_id].push(req);
        
        // Find the shift associated with this request
        const requestShift = allShifts.find(s => s.id === req.requester_shift_id);
        if (requestShift) {
          requestShifts[req.id] = {
            ...requestShift,
            type: getShiftType(requestShift.start_time),
            normalizedDate: normalizeDate(requestShift.date)
          };
        }
      });
      
      // Group preferred dates by request
      const preferredDatesByRequest = {};
      preferredDates.forEach(pref => {
        if (!preferredDatesByRequest[pref.request_id]) {
          preferredDatesByRequest[pref.request_id] = [];
        }
        preferredDatesByRequest[pref.request_id].push({
          date: normalizeDate(pref.date),
          acceptedTypes: pref.accepted_types || []
        });
      });
      
      console.log('Data structures prepared:');
      console.log('- Shifts by date:', shiftsByDate);
      console.log('- Requests by user:', requestsByUser);
      console.log('- Request shifts:', requestShifts);
      console.log('- Preferred dates by request:', preferredDatesByRequest);
      
      // Now perform the matching
      let matchesFound = 0;
      const processedPairs = new Set(); // To avoid duplicate matches
      
      for (const request of allRequests) {
        // Get the request's shift details
        const requestShift = requestShifts[request.id];
        if (!requestShift) {
          console.warn(`Missing shift data for request ${request.id}`);
          continue;
        }
        
        // Get preferred dates for this request
        const prefDates = preferredDatesByRequest[request.id] || [];
        if (prefDates.length === 0) {
          console.warn(`No preferred dates for request ${request.id}`);
          continue;
        }
        
        console.log(`\nChecking request ${request.id} from user ${request.requester_id}`);
        console.log(`Offering shift on ${requestShift.normalizedDate} (${requestShift.type})`);
        
        // For each preferred date in this request
        for (const pref of prefDates) {
          console.log(`Checking preferred date ${pref.date}`);
          
          // Find shifts on this preferred date
          const shiftsOnPrefDate = shiftsByDate[pref.date] || [];
          console.log(`Found ${shiftsOnPrefDate.length} shifts on preferred date ${pref.date}`);
          
          // Check each shift on the preferred date
          for (const potentialShift of shiftsOnPrefDate) {
            // Skip if the shift belongs to the same user
            if (potentialShift.user_id === request.requester_id) {
              console.log(`Skipping shift from same user ${request.requester_id}`);
              continue;
            }
            
            const potentialShiftType = getShiftType(potentialShift.start_time);
            console.log(`Checking potential shift ${potentialShift.id} (${potentialShiftType}) from user ${potentialShift.user_id}`);
            
            // Check if the shift type is acceptable
            if (pref.acceptedTypes.length > 0 && !pref.acceptedTypes.includes(potentialShiftType)) {
              console.log(`Type mismatch: Preferred types ${pref.acceptedTypes}, but shift is ${potentialShiftType}`);
              continue;
            }
            
            // Check if the other user has a swap request
            const otherUserRequests = requestsByUser[potentialShift.user_id] || [];
            if (otherUserRequests.length === 0) {
              console.log(`User ${potentialShift.user_id} has no swap requests`);
              continue;
            }
            
            // Look for a matching request from the other user
            for (const otherRequest of otherUserRequests) {
              // Get the other request's shift
              const otherRequestShift = requestShifts[otherRequest.id];
              if (!otherRequestShift) {
                console.log(`Missing shift data for other user's request ${otherRequest.id}`);
                continue;
              }
              
              console.log(`Checking against other user's request ${otherRequest.id}, offering shift on ${otherRequestShift.normalizedDate}`);
              
              // Create a unique pair ID to avoid duplicate matches
              const pairId = [request.id, otherRequest.id].sort().join('-');
              if (processedPairs.has(pairId)) {
                console.log(`Already processed this pair: ${pairId}`);
                continue;
              }
              processedPairs.add(pairId);
              
              // Check if the other user prefers the current user's shift date
              const otherUserPrefs = preferredDatesByRequest[otherRequest.id] || [];
              const otherUserWantsThisDate = otherUserPrefs.some(
                p => p.date === requestShift.normalizedDate && 
                     (p.acceptedTypes.length === 0 || p.acceptedTypes.includes(requestShift.type))
              );
              
              if (!otherUserWantsThisDate) {
                console.log(`User ${potentialShift.user_id} doesn't want the date ${requestShift.normalizedDate}`);
                continue;
              } else {
                console.log(`User ${potentialShift.user_id} DOES want the date ${requestShift.normalizedDate}`);
              }
              
              // Check if either user is already rostered on the swap date
              const user1HasConflict = (shiftsByUser[request.requester_id] || []).includes(pref.date);
              if (user1HasConflict) {
                console.log(`User ${request.requester_id} already has a shift on ${pref.date}`);
                continue;
              }
              
              const user2HasConflict = (shiftsByUser[potentialShift.user_id] || []).includes(requestShift.normalizedDate);
              if (user2HasConflict) {
                console.log(`User ${potentialShift.user_id} already has a shift on ${requestShift.normalizedDate}`);
                continue;
              }
              
              // We have a match!
              console.log(`🎉 MATCH FOUND between requests ${request.id} and ${otherRequest.id}`);
              
              try {
                // Record the match
                const { data: matchData, error: matchError } = await supabase
                  .from('shift_swap_potential_matches')
                  .insert({
                    requester_request_id: request.id,
                    acceptor_request_id: otherRequest.id,
                    requester_shift_id: request.requester_shift_id,
                    acceptor_shift_id: otherRequest.requester_shift_id,
                    match_date: new Date().toISOString().split('T')[0]
                  })
                  .select()
                  .single();
                  
                if (matchError) {
                  console.error('Error recording match:', matchError);
                  continue;
                }
                
                console.log('Match recorded:', matchData);
                
                // Update both requests to matched status
                const { error: error1 } = await supabase
                  .from('shift_swap_requests')
                  .update({
                    status: 'matched',
                    acceptor_id: potentialShift.user_id,
                    acceptor_shift_id: potentialShift.id
                  })
                  .eq('id', request.id);
                  
                if (error1) {
                  console.error('Error updating first request:', error1);
                  continue;
                }
                
                const { error: error2 } = await supabase
                  .from('shift_swap_requests')
                  .update({
                    status: 'matched',
                    acceptor_id: request.requester_id,
                    acceptor_shift_id: requestShift.id
                  })
                  .eq('id', otherRequest.id);
                  
                if (error2) {
                  console.error('Error updating second request:', error2);
                  continue;
                }
                
                matchesFound++;
                
                // Notify if the current user is involved
                if (request.requester_id === user.id || potentialShift.user_id === user.id) {
                  toast({
                    title: "Match Found!",
                    description: `Your shift swap request has been matched.`,
                  });
                }
                
                // Only find one match per request
                break;
              } catch (error) {
                console.error('Error processing match:', error);
              }
            }
            
            // If a match was found for this request, move to the next request
            if (matchesFound > matchesFound - 1) break;
          }
          
          // If a match was found for this request, move to the next request
          if (matchesFound > matchesFound - 1) break;
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
