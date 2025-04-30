
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ShiftData {
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
  created_at: string;
}

interface PreferredDate {
  id: string;
  shift_id: string;
  date: string;
  accepted_types: string[];
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

  // Step 1: Build an index of all requests by desired day
  const indexRequestsByDesiredDay = (requests: SwapRequest[], preferredDates: PreferredDate[]) => {
    console.log("Building index of requests by desired day...");
    
    const desiredDayIndex: Record<string, SwapRequest[]> = {};
    
    // For each request, find its preferred dates
    requests.forEach(request => {
      const requestPreferredDates = preferredDates.filter(pd => 
        pd.shift_id === request.requester_shift_id
      );
      
      // Add this request to the index for each of its preferred dates
      requestPreferredDates.forEach(preferredDate => {
        const dateStr = preferredDate.date;
        if (!desiredDayIndex[dateStr]) {
          desiredDayIndex[dateStr] = [];
        }
        desiredDayIndex[dateStr].push(request);
      });
    });
    
    console.log("Index built:", desiredDayIndex);
    return desiredDayIndex;
  };

  // Step 2: Get all user's rostered days
  const getUserRosteredDays = (shifts: ShiftData[]): Record<string, Set<string>> => {
    console.log("Mapping user rostered days...");
    
    const userRosteredDays: Record<string, Set<string>> = {};
    
    shifts.forEach(shift => {
      if (!userRosteredDays[shift.user_id]) {
        userRosteredDays[shift.user_id] = new Set();
      }
      userRosteredDays[shift.user_id].add(shift.date);
    });
    
    console.log("User rostered days map:", userRosteredDays);
    return userRosteredDays;
  };

  // Step 3: Check for mutual matches
  const findMutualMatches = (
    requests: SwapRequest[],
    shifts: Record<string, ShiftData>,
    desiredDayIndex: Record<string, SwapRequest[]>,
    preferredDates: PreferredDate[],
    userRosteredDays: Record<string, Set<string>>
  ) => {
    console.log("Finding mutual matches...");
    const matches: { requestA: SwapRequest; requestB: SwapRequest; shiftA: ShiftData; shiftB: ShiftData; }[] = [];
    
    // Map preferred dates by shift_id for quick lookup
    const preferredDatesByShiftId: Record<string, PreferredDate[]> = {};
    preferredDates.forEach(pd => {
      if (!preferredDatesByShiftId[pd.shift_id]) {
        preferredDatesByShiftId[pd.shift_id] = [];
      }
      preferredDatesByShiftId[pd.shift_id].push(pd);
    });
    
    // For each request (Request A)
    for (const requestA of requests) {
      const shiftA = shifts[requestA.requester_shift_id];
      if (!shiftA) continue;
      
      const shiftADate = shiftA.date;
      const shiftAType = getShiftType(shiftA.start_time);
      console.log(`Checking request by user ${requestA.requester_id} for shift on ${shiftADate} (${shiftAType})`);
      
      // Find all requests wanting Request A's offered day (shiftADate)
      const potentialMatches = desiredDayIndex[shiftADate] || [];
      console.log(`Found ${potentialMatches.length} potential requests wanting day ${shiftADate}`);
      
      for (const requestB of potentialMatches) {
        // Skip if it's the same user
        if (requestA.requester_id === requestB.requester_id) {
          console.log("Skipping - same user");
          continue;
        }
        
        const shiftB = shifts[requestB.requester_shift_id];
        if (!shiftB) {
          console.log(`Skipping - can't find shift data for request ${requestB.id}`);
          continue;
        }
        
        const shiftBDate = shiftB.date;
        const shiftBType = getShiftType(shiftB.start_time);
        console.log(`Potential match: User ${requestB.requester_id}'s shift on ${shiftBDate} (${shiftBType})`);
        
        // Check if Request A's user wants Request B's offered day
        const userAPreferredDates = preferredDatesByShiftId[requestA.requester_shift_id] || [];
        const userAWantsShiftBDate = userAPreferredDates.some(pd => pd.date === shiftBDate);
        
        if (!userAWantsShiftBDate) {
          console.log(`User ${requestA.requester_id} doesn't want day ${shiftBDate}`);
          continue;
        }
        
        // Find the specific preferred date entry
        const preferredDateA = userAPreferredDates.find(pd => pd.date === shiftBDate);
        if (!preferredDateA) {
          console.log("Can't find preferred date record");
          continue;
        }
        
        // Check if Request A's user accepts Request B's shift type
        if (!preferredDateA.accepted_types.includes(shiftBType)) {
          console.log(`User ${requestA.requester_id} doesn't accept shift type ${shiftBType}`);
          continue;
        }
        
        // Validate: User A isn't rostered on day B
        if (userRosteredDays[requestA.requester_id] && 
            userRosteredDays[requestA.requester_id].has(shiftBDate)) {
          console.log(`User ${requestA.requester_id} is already rostered on day ${shiftBDate}`);
          continue;
        }
        
        // Validate: User B isn't rostered on day A
        if (userRosteredDays[requestB.requester_id] && 
            userRosteredDays[requestB.requester_id].has(shiftADate)) {
          console.log(`User ${requestB.requester_id} is already rostered on day ${shiftADate}`);
          continue;
        }
        
        // Find the specific preferred date for User B
        const userBPreferredDates = preferredDatesByShiftId[requestB.requester_shift_id] || [];
        const preferredDateB = userBPreferredDates.find(pd => pd.date === shiftADate);
        if (!preferredDateB) {
          console.log("Can't find preferred date B record");
          continue;
        }
        
        // Check if Request B's user accepts Request A's shift type
        if (!preferredDateB.accepted_types.includes(shiftAType)) {
          console.log(`User ${requestB.requester_id} doesn't accept shift type ${shiftAType}`);
          continue;
        }
        
        console.log("MATCH FOUND! All conditions satisfied.");
        matches.push({ requestA, requestB, shiftA, shiftB });
      }
    }
    
    return matches;
  };

  // Main function to find swap matches
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
      console.log('Current user ID:', user.id);
      
      // Step 1: Get all pending swap requests
      const { data: pendingRequests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('status', 'pending');
        
      if (requestsError) {
        console.error('Error fetching pending requests:', requestsError);
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
      
      console.log(`Found ${pendingRequests.length} pending swap requests in the system`);
      
      // Step 2: Get all shifts associated with the requests
      const shiftIds = pendingRequests.map(req => req.requester_shift_id);
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds);
        
      if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError);
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
      
      console.log(`Found ${shiftsData.length} shifts associated with swap requests`);
      
      // Step 3: Get all preferred dates for the pending requests
      const { data: allPreferredDates, error: prefsError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*')
        .in('shift_id', shiftIds);
        
      if (prefsError) {
        console.error('Error fetching preferred dates:', prefsError);
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
      
      console.log(`Found ${allPreferredDates.length} preferred dates for swap requests`);
      
      // Step 4: Get all shifts for roster validation 
      const { data: allUserShifts, error: allShiftsError } = await supabase
        .from('shifts')
        .select('*');
        
      if (allShiftsError) {
        console.error('Error fetching all shifts:', allShiftsError);
        throw allShiftsError;
      }
      
      // Create lookup objects
      const shiftsById: Record<string, ShiftData> = {};
      shiftsData.forEach(shift => {
        shiftsById[shift.id] = shift;
      });
      
      // Create index of requests by desired day
      const desiredDayIndex = indexRequestsByDesiredDay(pendingRequests, allPreferredDates);
      
      // Get all user's rostered days
      const userRosteredDays = getUserRosteredDays(allUserShifts || []);
      
      // Find mutual matches
      const matches = findMutualMatches(
        pendingRequests, 
        shiftsById, 
        desiredDayIndex, 
        allPreferredDates,
        userRosteredDays
      );
      
      console.log(`Found ${matches.length} mutual matches`);
      
      if (matches.length === 0) {
        toast({
          title: "No matches found",
          description: "We couldn't find any matching swaps right now. Try again later or adjust your preferences.",
        });
        setIsProcessing(false);
        return;
      }
      
      // Step 5: Process the matches by updating the database
      let successfulMatches = 0;
      for (const match of matches) {
        console.log(`Processing match between users ${match.requestA.requester_id} and ${match.requestB.requester_id}`);
        
        // Update Request A
        const { error: updateAError } = await supabase
          .from('shift_swap_requests')
          .update({
            status: 'matched',
            acceptor_id: match.requestB.requester_id,
            acceptor_shift_id: match.requestB.requester_shift_id
          })
          .eq('id', match.requestA.id);
          
        if (updateAError) {
          console.error('Error updating request A:', updateAError);
          continue; // Try next match if this one fails
        }
        
        // Update Request B
        const { error: updateBError } = await supabase
          .from('shift_swap_requests')
          .update({
            status: 'matched',
            acceptor_id: match.requestA.requester_id,
            acceptor_shift_id: match.requestA.requester_shift_id
          })
          .eq('id', match.requestB.id);
          
        if (updateBError) {
          console.error('Error updating request B:', updateBError);
          
          // Rollback Request A if Request B update fails
          await supabase
            .from('shift_swap_requests')
            .update({
              status: 'pending',
              acceptor_id: null,
              acceptor_shift_id: null
            })
            .eq('id', match.requestA.id);
            
          continue; // Try next match
        }
        
        successfulMatches++;
        
        // Show a toast message if this user is part of the match
        if (user.id === match.requestA.requester_id || user.id === match.requestB.requester_id) {
          const userShift = user.id === match.requestA.requester_id ? match.shiftA : match.shiftB;
          const matchedShift = user.id === match.requestA.requester_id ? match.shiftB : match.shiftA;
          
          toast({
            title: "Match Found!",
            description: `Your shift on ${new Date(userShift.date).toLocaleDateString()} has been matched with a shift on ${new Date(matchedShift.date).toLocaleDateString()}.`,
          });
        }
      }
      
      console.log(`Successfully processed ${successfulMatches} matches out of ${matches.length} found`);
      
      if (successfulMatches === 0) {
        toast({
          title: "No matches processed",
          description: "We found potential matches but couldn't process them. Please try again.",
          variant: "destructive"
        });
      } else if (successfulMatches > 0) {
        toast({
          title: `${successfulMatches} Match${successfulMatches > 1 ? 'es' : ''} Processed`,
          description: "The swap matches have been processed successfully.",
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
