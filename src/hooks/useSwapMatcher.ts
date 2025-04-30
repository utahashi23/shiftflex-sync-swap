
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
  shift_id: string;
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
      
      // Step 1: Get all pending swap requests
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
      
      // Step 3: Get all preferred dates for the pending requests
      const requestIds = pendingRequests.map(req => req.id);
      const { data: allPreferredDates, error: prefsError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*')
        .in('request_id', requestIds);
        
      if (prefsError) {
        throw prefsError;
      }
      
      if (!allPreferredDates || allPreferredDates.length === 0) {
        toast({
          title: "No swap preferences",
          description: "There are no preferred dates set for any requests.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${allPreferredDates.length} preferred dates:`, allPreferredDates);
      
      // Step 4: Get all shifts to check roster conflicts
      const { data: allUserShifts, error: allShiftsError } = await supabase
        .from('shifts')
        .select('*');
        
      if (allShiftsError) {
        throw allShiftsError;
      }
      
      // Create lookup maps for efficient access
      const shifts: Record<string, Shift> = {};
      const userShifts: Record<string, Set<string>> = {}; // user_id -> Set of dates
      
      // Build shifts lookup and user's rostered days
      shiftsData.forEach(shift => {
        shifts[shift.id] = shift;
      });
      
      allUserShifts.forEach(shift => {
        if (!userShifts[shift.user_id]) {
          userShifts[shift.user_id] = new Set();
        }
        userShifts[shift.user_id].add(shift.date);
      });
      
      console.log('User shifts map built:', Object.keys(userShifts).length);
      
      // Step 5: Index all swap requests by desired day
      // Mapping from desired date -> array of requests wanting that date
      const requestsByDesiredDay: Record<string, IndexedRequest[]> = {};
      
      // Create a map of request_id to its preferred dates for easier access
      const preferencesByRequest: Record<string, PreferredDate[]> = {};
      allPreferredDates.forEach(pref => {
        if (!preferencesByRequest[pref.request_id]) {
          preferencesByRequest[pref.request_id] = [];
        }
        preferencesByRequest[pref.request_id].push(pref);
      });
      
      // Process each request
      for (const request of pendingRequests) {
        const offeredShift = shifts[request.requester_shift_id];
        
        if (!offeredShift) {
          console.log(`Could not find shift data for request ${request.id}`);
          continue;
        }
        
        const offeredDate = offeredShift.date;
        const offeredShiftType = getShiftType(offeredShift.start_time);
        
        // Get this user's preferred dates
        const userPreferences = preferencesByRequest[request.id] || [];
        
        // For each preferred date, add to the index
        userPreferences.forEach(pref => {
          if (!requestsByDesiredDay[pref.date]) {
            requestsByDesiredDay[pref.date] = [];
          }
          
          requestsByDesiredDay[pref.date].push({
            requestId: request.id,
            requesterId: request.requester_id,
            offeredShiftId: request.requester_shift_id,
            offeredDate,
            offeredShiftType
          });
        });
      }
      
      console.log('Indexed requests by desired day:', requestsByDesiredDay);
      
      // Step 6: Find mutual matches
      const matches = [];
      const processedRequests = new Set<string>();
      
      for (const request of pendingRequests) {
        // Skip if already processed
        if (processedRequests.has(request.id)) {
          continue;
        }
        
        const requesterId = request.requester_id;
        const offeredShiftId = request.requester_shift_id;
        const offeredShift = shifts[offeredShiftId];
        
        if (!offeredShift) {
          continue;
        }
        
        const offeredDate = offeredShift.date;
        const offeredShiftType = getShiftType(offeredShift.start_time);
        
        console.log(`\nChecking request ${request.id} offering ${offeredDate} (${offeredShiftType})`);
        
        // Find all requests wanting this user's offered day
        const potentialMatches = requestsByDesiredDay[offeredDate] || [];
        console.log(`Found ${potentialMatches.length} potential users wanting date ${offeredDate}`);
        
        // Get this user's desired dates
        const userPreferences = preferencesByRequest[request.id] || [];
        
        // Print debug info about user preferences
        console.log(`User ${requesterId} preferences:`, userPreferences);
        
        for (const potentialMatch of potentialMatches) {
          // Skip if it's the same user
          if (potentialMatch.requesterId === requesterId) {
            continue;
          }
          
          console.log(`Checking potential match with user ${potentialMatch.requesterId}`);
          
          // Check if this user wants any of the potential match's offered days
          const matchDate = potentialMatch.offeredDate;
          const matchShiftType = potentialMatch.offeredShiftType;
          
          // Find if any of this user's preferences match the potential match's offered date
          const matchingPref = userPreferences.find(pref => 
            pref.date === matchDate && pref.accepted_types.includes(matchShiftType)
          );
          
          if (!matchingPref) {
            console.log(`User ${requesterId} doesn't want date ${matchDate} or shift type ${matchShiftType}`);
            continue;
          }
          
          console.log(`Found a preference match! User ${requesterId} wants ${matchDate} (${matchShiftType})`);
          
          // Validate: ensure neither user is already rostered on their desired swap days
          // Check if requester is already rostered on the day they want
          if (userShifts[requesterId] && userShifts[requesterId].has(matchDate)) {
            console.log(`User ${requesterId} is already rostered on ${matchDate}`);
            continue;
          }
          
          // Check if potential match is already rostered on the day they want
          if (userShifts[potentialMatch.requesterId] && 
              userShifts[potentialMatch.requesterId].has(offeredDate)) {
            console.log(`User ${potentialMatch.requesterId} is already rostered on ${offeredDate}`);
            continue;
          }
          
          // We have a match!
          console.log(`MATCH FOUND! User ${requesterId} and User ${potentialMatch.requesterId}`);
          
          // Record the match
          matches.push({
            requester: {
              id: requesterId,
              requestId: request.id,
              shiftId: offeredShiftId,
              date: offeredDate
            },
            acceptor: {
              id: potentialMatch.requesterId,
              requestId: potentialMatch.requestId,
              shiftId: potentialMatch.offeredShiftId,
              date: matchDate
            }
          });
          
          // Mark both requests as processed
          processedRequests.add(request.id);
          processedRequests.add(potentialMatch.requestId);
          
          // No need to check other potential matches for this request
          break;
        }
      }
      
      console.log(`Found ${matches.length} mutual matches:`, matches);
      
      // Step 7: Update the database with matches
      let successfulMatches = 0;
      
      for (const match of matches) {
        console.log(`Processing match:`, match);
        
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
        
        // Record the match in our new table
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
