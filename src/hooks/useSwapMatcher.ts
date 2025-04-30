
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

// Helper function to normalize date format to YYYY-MM-DD in local timezone
const normalizeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
      
      // Step 1: Get all pending swap requests (not just the logged-in user's)
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
      
      // Step 3: Get all preferred dates for ALL pending requests
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
        shifts[shift.id] = {...shift, date: normalizeDate(shift.date)};
      });
      
      allUserShifts.forEach(shift => {
        if (!userShifts[shift.user_id]) {
          userShifts[shift.user_id] = new Set();
        }
        userShifts[shift.user_id].add(normalizeDate(shift.date));
      });
      
      console.log('User shifts map built:', Object.keys(userShifts).length);
      
      // Step 5: Index all swap requests by desired day
      // Mapping from desired date -> array of requests wanting that date
      const requestsByDesiredDay: Record<string, IndexedRequest[]> = {};
      
      // Create a map of request_id to its preferred dates for easier access
      const preferencesByRequest: Record<string, PreferredDate[]> = {};
      allPreferredDates.forEach(pref => {
        const normalizedDate = normalizeDate(pref.date);
        if (!preferencesByRequest[pref.request_id]) {
          preferencesByRequest[pref.request_id] = [];
        }
        preferencesByRequest[pref.request_id].push({...pref, date: normalizedDate});
      });
      
      // Process each request
      for (const request of pendingRequests) {
        const offeredShift = shifts[request.requester_shift_id];
        
        if (!offeredShift) {
          console.error(`Could not find shift data for request ${request.id}`);
          continue;
        }
        
        const offeredDate = offeredShift.date;
        const offeredShiftType = getShiftType(offeredShift.start_time);
        
        // Get this user's preferred dates
        const userPreferences = preferencesByRequest[request.id] || [];
        
        // For each preferred date, add to the index
        userPreferences.forEach(pref => {
          const normalizedDate = pref.date;
          
          if (!requestsByDesiredDay[normalizedDate]) {
            requestsByDesiredDay[normalizedDate] = [];
          }
          
          requestsByDesiredDay[normalizedDate].push({
            requestId: request.id,
            requesterId: request.requester_id,
            offeredShiftId: request.requester_shift_id,
            offeredDate,
            offeredShiftType
          });
        });
      }
      
      console.log('Indexed requests by desired day:', requestsByDesiredDay);
      
      // Step 6: Find mutual matches among ALL users, not just the logged-in user
      const matches = [];
      const processedRequests = new Set<string>();
      
      // Check all pending requests against all other pending requests
      for (let i = 0; i < pendingRequests.length; i++) {
        const request1 = pendingRequests[i];
        
        // Skip if already processed
        if (processedRequests.has(request1.id)) {
          continue;
        }
        
        const requester1Id = request1.requester_id;
        const offered1ShiftId = request1.requester_shift_id;
        const offered1Shift = shifts[offered1ShiftId];
        
        if (!offered1Shift) {
          console.error(`Could not find shift data for requestId ${request1.id}`);
          continue;
        }
        
        const offered1Date = offered1Shift.date;
        const offered1ShiftType = getShiftType(offered1Shift.start_time);
        
        console.log(`\nChecking request ${request1.id} offering ${offered1Date} (${offered1ShiftType}) from user ${requester1Id}`);
        
        // Get user1's preferred dates
        const user1Preferences = preferencesByRequest[request1.id] || [];
        console.log(`User ${requester1Id} preferences:`, user1Preferences);
        
        // Check against all other requests
        for (let j = i + 1; j < pendingRequests.length; j++) {
          const request2 = pendingRequests[j];
          
          // Skip if already processed
          if (processedRequests.has(request2.id)) {
            continue;
          }
          
          const requester2Id = request2.requester_id;
          
          // Skip if it's the same user
          if (requester2Id === requester1Id) {
            console.log(`Skipping self-match for user ${requester1Id}`);
            continue;
          }
          
          const offered2ShiftId = request2.requester_shift_id;
          const offered2Shift = shifts[offered2ShiftId];
          
          if (!offered2Shift) {
            console.error(`Could not find shift data for requestId ${request2.id}`);
            continue;
          }
          
          const offered2Date = offered2Shift.date;
          const offered2ShiftType = getShiftType(offered2Shift.start_time);
          
          console.log(`Checking against request ${request2.id} offering ${offered2Date} (${offered2ShiftType}) from user ${requester2Id}`);
          
          // Get user2's preferred dates
          const user2Preferences = preferencesByRequest[request2.id] || [];
          console.log(`User ${requester2Id} preferences:`, user2Preferences);
          
          // Check if user1 wants user2's offered date and shift type
          const user1WantsUser2Shift = user1Preferences.some(pref => {
            const preferenceDate = pref.date;
            const acceptedTypes = pref.accepted_types || [];
            
            console.log(`Checking if user1 wants user2's date: comparing ${preferenceDate} to ${offered2Date}`);
            console.log(`User1's accepted types for this date:`, acceptedTypes);
            
            return preferenceDate === offered2Date && acceptedTypes.includes(offered2ShiftType);
          });
          
          if (!user1WantsUser2Shift) {
            console.log(`No match: User ${requester1Id} doesn't want user ${requester2Id}'s shift`);
            continue;
          }
          
          console.log(`User ${requester1Id} wants user ${requester2Id}'s shift on ${offered2Date}`);
          
          // Check if user2 wants user1's offered date and shift type
          const user2WantsUser1Shift = user2Preferences.some(pref => {
            const preferenceDate = pref.date;
            const acceptedTypes = pref.accepted_types || [];
            
            console.log(`Checking if user2 wants user1's date: comparing ${preferenceDate} to ${offered1Date}`);
            console.log(`User2's accepted types for this date:`, acceptedTypes);
            
            return preferenceDate === offered1Date && acceptedTypes.includes(offered1ShiftType);
          });
          
          if (!user2WantsUser1Shift) {
            console.log(`No match: User ${requester2Id} doesn't want user ${requester1Id}'s shift`);
            continue;
          }
          
          console.log(`User ${requester2Id} wants user ${requester1Id}'s shift on ${offered1Date}`);
          
          // Validate: ensure neither user is already rostered on their desired swap days
          // Check if user1 is already rostered on user2's day
          if (userShifts[requester1Id] && userShifts[requester1Id].has(offered2Date)) {
            console.log(`User ${requester1Id} is already rostered on ${offered2Date}`);
            continue;
          }
          
          // Check if user2 is already rostered on user1's day
          if (userShifts[requester2Id] && userShifts[requester2Id].has(offered1Date)) {
            console.log(`User ${requester2Id} is already rostered on ${offered1Date}`);
            continue;
          }
          
          // We have a match!
          console.log(`MUTUAL MATCH FOUND! User ${requester1Id} and User ${requester2Id}`);
          
          // Record the match
          matches.push({
            requester: {
              id: requester1Id,
              requestId: request1.id,
              shiftId: offered1ShiftId,
              date: offered1Date
            },
            acceptor: {
              id: requester2Id,
              requestId: request2.id,
              shiftId: offered2ShiftId,
              date: offered2Date
            }
          });
          
          // Mark both requests as processed
          processedRequests.add(request1.id);
          processedRequests.add(request2.id);
          
          // No need to check other requests for these two
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
