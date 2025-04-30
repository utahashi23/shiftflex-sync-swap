
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
      console.log('Current user ID:', user.id);
      
      // Step 1: Get all pending swap requests from the system
      const { data: allRequests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select('*')
        .eq('status', 'pending');
        
      if (requestsError) {
        console.error('Error fetching pending requests:', requestsError);
        throw requestsError;
      }
      
      if (!allRequests || allRequests.length === 0) {
        toast({
          title: "No pending swap requests",
          description: "There are no pending swap requests to match.",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Found ${allRequests.length} pending swap requests in the system`);
      
      // Step 2: Get all shifts associated with the requests
      const shiftIds = allRequests.map(req => req.requester_shift_id);
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
      
      // Create lookup objects for easy access
      const shifts: Record<string, Shift> = {};
      shiftsData.forEach(shift => {
        shifts[shift.id] = shift;
      });
      
      const swapRequests: Record<string, SwapRequest> = {};
      allRequests.forEach(req => {
        swapRequests[req.requester_shift_id] = req;
      });
      
      // Group preferred dates by shift_id
      const preferencesByShiftId: Record<string, PreferredDate[]> = {};
      allPreferredDates.forEach(pref => {
        if (!preferencesByShiftId[pref.shift_id]) {
          preferencesByShiftId[pref.shift_id] = [];
        }
        preferencesByShiftId[pref.shift_id].push(pref);
      });
      
      // Process each request to find potential matches
      let matchFound = false;
      const processedShiftIds = new Set<string>();
      
      for (const request of allRequests) {
        // Skip if we've already processed this shift or if it's already matched
        if (processedShiftIds.has(request.requester_shift_id)) {
          continue;
        }
        
        const myShiftId = request.requester_shift_id;
        const myShift = shifts[myShiftId];
        
        if (!myShift) {
          console.log(`Could not find shift data for request ${request.id}`);
          continue;
        }
        
        const myShiftDate = myShift.date;
        const myShiftType = getShiftType(myShift.start_time);
        const myPreferences = preferencesByShiftId[myShiftId] || [];
        
        console.log(`\nChecking request by user ${request.requester_id} for shift on ${myShiftDate} (${myShiftType})`);
        console.log(`This user has ${myPreferences.length} preferred dates`);
        
        if (myPreferences.length === 0) {
          continue;
        }
        
        // For each of my preferences, look for potential matches
        for (const myPref of myPreferences) {
          const myPrefDate = myPref.date;
          const myAcceptableTypes = myPref.accepted_types;
          
          console.log(`\nI want to swap my shift on ${myShiftDate} for a shift on ${myPrefDate}`);
          console.log(`I will accept these shift types: ${myAcceptableTypes.join(', ')}`);
          
          // Find users who have a shift on my preferred date
          const usersWithShiftsOnMyPrefDate = Object.values(shifts).filter(shift => 
            shift.date === myPrefDate && shift.user_id !== request.requester_id
          );
          
          console.log(`Found ${usersWithShiftsOnMyPrefDate.length} users with shifts on my preferred date ${myPrefDate}`);
          
          for (const theirShift of usersWithShiftsOnMyPrefDate) {
            const theirShiftId = theirShift.id;
            const theirShiftType = getShiftType(theirShift.start_time);
            const theirUserId = theirShift.user_id;
            
            // Check if this shift is part of a pending swap request
            const theirRequest = swapRequests[theirShiftId];
            if (!theirRequest) {
              console.log(`User ${theirUserId} has a shift on ${myPrefDate} but hasn't requested a swap`);
              continue;
            }
            
            // Check if this shift's type is acceptable to me
            if (!myAcceptableTypes.includes(theirShiftType)) {
              console.log(`User ${theirUserId}'s shift on ${myPrefDate} is ${theirShiftType} type, but I only accept: ${myAcceptableTypes.join(', ')}`);
              continue;
            }
            
            console.log(`Found potential match: User ${theirUserId} has a ${theirShiftType} shift on ${myPrefDate} and wants to swap`);
            
            // Now check if they want my shift day and type
            const theirPreferences = preferencesByShiftId[theirShiftId] || [];
            if (theirPreferences.length === 0) {
              console.log(`But user ${theirUserId} hasn't set any preferred dates`);
              continue;
            }
            
            // Check if any of their preferences match my shift
            const matchingPref = theirPreferences.find(pref => 
              pref.date === myShiftDate && pref.accepted_types.includes(myShiftType)
            );
            
            if (!matchingPref) {
              console.log(`But user ${theirUserId} doesn't want a shift on ${myShiftDate} or doesn't accept ${myShiftType} shifts`);
              continue;
            }
            
            // We have a match!
            console.log(`MATCH FOUND! Mutual swap match between users ${request.requester_id} and ${theirUserId}`);
            
            // Update my request
            const { error: updateMyError } = await supabase
              .from('shift_swap_requests')
              .update({
                status: 'matched',
                acceptor_id: theirUserId,
                acceptor_shift_id: theirShiftId
              })
              .eq('id', request.id);
              
            if (updateMyError) {
              console.error('Error updating my request:', updateMyError);
              throw updateMyError;
            }
            
            // Update their request
            const { error: updateTheirError } = await supabase
              .from('shift_swap_requests')
              .update({
                status: 'matched',
                acceptor_id: request.requester_id,
                acceptor_shift_id: myShiftId
              })
              .eq('id', theirRequest.id);
              
            if (updateTheirError) {
              console.error('Error updating their request:', updateTheirError);
              throw updateTheirError;
            }
            
            matchFound = true;
            processedShiftIds.add(myShiftId);
            processedShiftIds.add(theirShiftId);
            
            toast({
              title: "Match Found!",
              description: `Your shift on ${new Date(myShiftDate).toLocaleDateString()} has been matched with a shift on ${new Date(myPrefDate).toLocaleDateString()}.`,
            });
            
            break; // Break out of the loop for this user's preferences
          }
          
          if (processedShiftIds.has(myShiftId)) {
            break; // We've matched this request, move to the next one
          }
        }
      }
      
      console.log('----------- SWAP MATCHING COMPLETED -----------');
      console.log(`Match found: ${matchFound}`);
      
      if (!matchFound) {
        toast({
          title: "No matches found",
          description: "We couldn't find any matching swaps right now. Try again later or adjust your preferences.",
        });
      }
      
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
