
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export const useSwapMatching = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  /**
   * Find potential matches for a user's swap requests
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
      // Step 1: Get all pending swap requests made by the current user
      const { data: myPendingRequests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          requester_id,
          requester_shift_id,
          status
        `)
        .eq('requester_id', user.id)
        .eq('status', 'pending');
        
      if (requestsError) throw requestsError;
      
      if (!myPendingRequests || myPendingRequests.length === 0) {
        toast({
          title: "No pending swap requests",
          description: "You don't have any pending swap requests to match.",
        });
        setIsProcessing(false);
        return;
      }
      
      // Get all shift IDs from my pending requests
      const myShiftIds = myPendingRequests.map(req => req.requester_shift_id);
      
      // Step 2: Get all my shift details
      const { data: myShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', myShiftIds);
        
      if (shiftsError) throw shiftsError;
      
      if (!myShifts) {
        throw new Error('Failed to fetch shift details');
      }
      
      // Step 3: Get all my preferred dates for these requests
      const { data: myPreferredDates, error: preferredDatesError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*')
        .in('shift_id', myShiftIds);
        
      if (preferredDatesError) throw preferredDatesError;
      
      if (!myPreferredDates) {
        throw new Error('Failed to fetch preferred dates');
      }
      
      // Map requests to their preferred dates
      const requestsWithPreferences = myPendingRequests.map(request => {
        const shift = myShifts.find(shift => shift.id === request.requester_shift_id);
        const preferredDates = myPreferredDates.filter(
          date => date.shift_id === request.requester_shift_id
        );
        
        return {
          requestId: request.id,
          shiftId: request.requester_shift_id,
          shift,
          preferredDates
        };
      });
      
      // Step 4: Find other users' shifts that match my preferred dates
      let matchesFound = false;
      
      // Process each of my requests
      for (const requestData of requestsWithPreferences) {
        const { requestId, shift: myShift, preferredDates } = requestData;
        
        if (!myShift || !preferredDates.length) continue;
        
        // Extract dates and shift types I'm willing to accept
        const dateStrings = preferredDates.map(pd => pd.date);
        const allAcceptedTypes = preferredDates.flatMap(pd => pd.accepted_types);
        
        // Find other users' shifts on those dates
        const { data: otherShifts, error: otherShiftsError } = await supabase
          .from('shifts')
          .select('*')
          .in('date', dateStrings)
          .neq('user_id', user.id);
          
        if (otherShiftsError) throw otherShiftsError;
        
        if (!otherShifts || otherShifts.length === 0) continue;
        
        // Check each potential matching shift to see if it fits my criteria
        for (const otherShift of otherShifts) {
          // Determine shift type based on start time
          let shiftType: "day" | "afternoon" | "night" = 'day';
          const startHour = new Date(`2000-01-01T${otherShift.start_time}`).getHours();
          
          if (startHour <= 8) {
            shiftType = 'day';
          } else if (startHour > 8 && startHour < 16) {
            shiftType = 'afternoon';
          } else {
            shiftType = 'night';
          }
          
          // Check if this shift's type is in my accepted types
          const matchingPreferredDate = preferredDates.find(pd => 
            pd.date === otherShift.date && 
            pd.accepted_types.includes(shiftType)
          );
          
          if (!matchingPreferredDate) continue;
          
          // Step 5: Check if the owner of this shift also wants MY shift
          // Find if the other user has a swap request
          const { data: otherUserRequests, error: otherRequestsError } = await supabase
            .from('shift_swap_requests')
            .select('*')
            .eq('requester_id', otherShift.user_id)
            .eq('status', 'pending');
            
          if (otherRequestsError) throw otherRequestsError;
          
          if (!otherUserRequests || otherUserRequests.length === 0) continue;
          
          // Get their preferred dates
          const otherShiftIds = otherUserRequests.map(req => req.requester_shift_id);
          
          const { data: otherPreferredDates, error: otherPreferredError } = await supabase
            .from('shift_swap_preferred_dates')
            .select('*')
            .in('shift_id', otherShiftIds);
            
          if (otherPreferredError) throw otherPreferredError;
          
          if (!otherPreferredDates || otherPreferredDates.length === 0) continue;
          
          // Check if they want my shift date and type
          let myShiftType: "day" | "afternoon" | "night" = 'day';
          const myStartHour = new Date(`2000-01-01T${myShift.start_time}`).getHours();
          
          if (myStartHour <= 8) {
            myShiftType = 'day';
          } else if (myStartHour > 8 && myStartHour < 16) {
            myShiftType = 'afternoon';
          } else {
            myShiftType = 'night';
          }
          
          // Check if any of their preferred dates match my shift
          const theyWantMyShift = otherPreferredDates.some(pd => 
            pd.date === myShift.date && 
            pd.accepted_types.includes(myShiftType)
          );
          
          if (!theyWantMyShift) continue;
          
          // Find the specific request from the other user that matches
          const matchingOtherRequest = otherUserRequests.find(req => {
            return otherPreferredDates.some(pd => 
              pd.shift_id === req.requester_shift_id && 
              pd.date === myShift.date && 
              pd.accepted_types.includes(myShiftType)
            );
          });
          
          if (!matchingOtherRequest) continue;
          
          // We found a mutual match! Update both swap requests to "matched" status
          const { error: updateError } = await supabase
            .from('shift_swap_requests')
            .update({ 
              status: 'matched',
              acceptor_id: otherShift.user_id,
              acceptor_shift_id: otherShift.id
            })
            .eq('id', requestId);
            
          if (updateError) throw updateError;
          
          const { error: updateOtherError } = await supabase
            .from('shift_swap_requests')
            .update({ 
              status: 'matched',
              acceptor_id: user.id,
              acceptor_shift_id: myShift.id
            })
            .eq('id', matchingOtherRequest.id);
            
          if (updateOtherError) throw updateOtherError;
          
          matchesFound = true;
          
          toast({
            title: "Match Found!",
            description: `Your shift on ${new Date(myShift.date).toLocaleDateString()} has been matched with a swap.`,
          });
          
          // Break out of the loop after finding a match for this request
          break;
        }
      }
      
      if (!matchesFound) {
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
