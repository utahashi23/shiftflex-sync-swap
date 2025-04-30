
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
      console.log('Starting to find matches for user:', user.id);
      
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
      
      console.log('Found pending requests:', myPendingRequests);
      
      // Get all shift IDs from my pending requests
      const myShiftIds = myPendingRequests.map(req => req.requester_shift_id);
      
      // Step 2: Get all my shift details
      const { data: myShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', myShiftIds);
        
      if (shiftsError) throw shiftsError;
      
      if (!myShifts || myShifts.length === 0) {
        console.log('No shift details found');
        throw new Error('Failed to fetch shift details');
      }
      
      console.log('Found my shifts:', myShifts);
      
      // Step 3: Get all my preferred dates for these requests
      const { data: myPreferredDates, error: preferredDatesError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*')
        .in('shift_id', myShiftIds);
        
      if (preferredDatesError) throw preferredDatesError;
      
      if (!myPreferredDates || myPreferredDates.length === 0) {
        console.log('No preferred dates found');
        throw new Error('Failed to fetch preferred dates');
      }
      
      console.log('Found my preferred dates:', myPreferredDates);
      
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
      
      console.log('Mapped requests with preferences:', requestsWithPreferences);
      
      // Step 4: Find potential matches
      let matchesFound = false;
      
      // Get all other users' pending swap requests (excluding mine)
      const { data: otherUsersRequests, error: otherRequestsError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          requester_id,
          requester_shift_id,
          status
        `)
        .neq('requester_id', user.id)
        .eq('status', 'pending');
        
      if (otherRequestsError) throw otherRequestsError;
      
      if (!otherUsersRequests || otherUsersRequests.length === 0) {
        console.log('No other users have pending requests');
        toast({
          title: "No potential matches",
          description: "No other users currently have pending swap requests.",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log('Found other users requests:', otherUsersRequests);
      
      // Get all other users' shifts
      const otherShiftIds = otherUsersRequests.map(req => req.requester_shift_id);
      
      const { data: otherShifts, error: otherShiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', otherShiftIds);
        
      if (otherShiftsError) throw otherShiftsError;
      
      if (!otherShifts || otherShifts.length === 0) {
        console.log('No shift details found for other users');
        setIsProcessing(false);
        return;
      }
      
      console.log('Found other users shifts:', otherShifts);
      
      // Get all other users' preferred dates
      const { data: otherPreferredDates, error: otherPreferredDatesError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*')
        .in('shift_id', otherShiftIds);
        
      if (otherPreferredDatesError) throw otherPreferredDatesError;
      
      if (!otherPreferredDates || otherPreferredDates.length === 0) {
        console.log('No preferred dates found for other users');
        setIsProcessing(false);
        return;
      }
      
      console.log('Found other users preferred dates:', otherPreferredDates);
      
      // Process each of my requests
      for (const myRequest of requestsWithPreferences) {
        if (!myRequest.shift) {
          console.log('Missing shift data for request:', myRequest.requestId);
          continue;
        }
        
        const myShift = myRequest.shift;
        console.log('Processing my shift:', myShift);
        
        // Determine my shift type
        let myShiftType = getShiftType(myShift.start_time);
        console.log('My shift type:', myShiftType);
        
        // For each other user request, check if there's a match
        for (const otherRequest of otherUsersRequests) {
          // Find the other user's shift
          const otherShift = otherShifts.find(s => s.id === otherRequest.requester_shift_id);
          if (!otherShift) continue;
          
          console.log('Checking potential match with shift:', otherShift);
          
          // Find the other user's preferred dates
          const theirPreferredDates = otherPreferredDates.filter(
            date => date.shift_id === otherRequest.requester_shift_id
          );
          
          // Check if they want my shift date and type
          const theyWantMyShiftDate = theirPreferredDates.some(pd => 
            pd.date === myShift.date
          );
          
          if (!theyWantMyShiftDate) {
            console.log('They don\'t want my shift date');
            continue;
          }
          
          const theyWantMyShiftType = theirPreferredDates.some(pd => 
            pd.date === myShift.date && 
            pd.accepted_types.includes(myShiftType)
          );
          
          if (!theyWantMyShiftType) {
            console.log('They don\'t want my shift type');
            continue;
          }
          
          console.log('They want my shift date and type');
          
          // Check if I want their shift date and type
          const otherShiftType = getShiftType(otherShift.start_time);
          console.log('Their shift type:', otherShiftType);
          
          const iWantTheirShiftDate = myRequest.preferredDates.some(pd =>
            pd.date === otherShift.date
          );
          
          if (!iWantTheirShiftDate) {
            console.log('I don\'t want their shift date');
            continue;
          }
          
          const iWantTheirShiftType = myRequest.preferredDates.some(pd =>
            pd.date === otherShift.date &&
            pd.accepted_types.includes(otherShiftType)
          );
          
          if (!iWantTheirShiftType) {
            console.log('I don\'t want their shift type');
            continue;
          }
          
          console.log('I want their shift date and type - WE HAVE A MATCH!');
          console.log('Match found between my shift', myShift.id, 'and their shift', otherShift.id);
          
          // We found a mutual match! Update both swap requests to "matched" status
          const { error: updateMyError } = await supabase
            .from('shift_swap_requests')
            .update({ 
              status: 'matched',
              acceptor_id: otherShift.user_id,
              acceptor_shift_id: otherShift.id
            })
            .eq('id', myRequest.requestId);
            
          if (updateMyError) {
            console.error('Error updating my request:', updateMyError);
            throw updateMyError;
          }
          
          const { error: updateOtherError } = await supabase
            .from('shift_swap_requests')
            .update({ 
              status: 'matched',
              acceptor_id: user.id,
              acceptor_shift_id: myShift.id
            })
            .eq('id', otherRequest.id);
            
          if (updateOtherError) {
            console.error('Error updating other request:', updateOtherError);
            throw updateOtherError;
          }
          
          matchesFound = true;
          
          toast({
            title: "Match Found!",
            description: `Your shift on ${new Date(myShift.date).toLocaleDateString()} has been matched with a swap.`,
          });
          
          // Break out of the loop after finding a match for this request
          break;
        }
        
        if (matchesFound) break; // Exit the outer loop if a match was already found
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

  // Helper function to determine shift type based on start time
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

  return {
    findSwapMatches,
    isProcessing
  };
};
