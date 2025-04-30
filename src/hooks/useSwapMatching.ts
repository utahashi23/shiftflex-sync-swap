
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
      
      // Get ALL pending swap requests
      const { data: allRequests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          requester_id,
          requester_shift_id,
          status
        `)
        .eq('status', 'pending');
        
      if (requestsError) throw requestsError;
      
      if (!allRequests || allRequests.length === 0) {
        console.log('No pending requests found in the system');
        toast({
          title: "No pending swap requests",
          description: "There are no pending swap requests in the system to match.",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log('Found all pending requests:', allRequests);
      
      // Separate my requests from other users' requests
      const myRequests = allRequests.filter(req => req.requester_id === user.id);
      const otherUsersRequests = allRequests.filter(req => req.requester_id !== user.id);
      
      console.log('My requests:', myRequests);
      console.log('Other users requests:', otherUsersRequests);
      
      if (myRequests.length === 0) {
        toast({
          title: "No pending swap requests",
          description: "You don't have any pending swap requests to match.",
        });
        setIsProcessing(false);
        return;
      }
      
      if (otherUsersRequests.length === 0) {
        toast({
          title: "No potential matches",
          description: "No other users currently have pending swap requests.",
        });
        setIsProcessing(false);
        return;
      }
      
      // Get all the shift IDs from all requests
      const allShiftIds = [...myRequests.map(req => req.requester_shift_id), 
                         ...otherUsersRequests.map(req => req.requester_shift_id)];
      
      // Get details for all shifts
      const { data: allShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', allShiftIds);
        
      if (shiftsError) throw shiftsError;
      if (!allShifts || allShifts.length === 0) {
        console.log('No shift details found');
        throw new Error('Failed to fetch shift details');
      }
      
      console.log('All shifts data:', allShifts);
      
      // Get all preferred dates for all shifts
      const { data: allPreferredDates, error: datesError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*')
        .in('shift_id', allShiftIds);
        
      if (datesError) throw datesError;
      if (!allPreferredDates || allPreferredDates.length === 0) {
        console.log('No preferred dates found');
        throw new Error('Failed to fetch preferred dates');
      }
      
      console.log('All preferred dates:', allPreferredDates);
      
      // Process each of my requests against other users' requests
      let matchesFound = false;
      
      for (const myRequest of myRequests) {
        // Get my shift details
        const myShift = allShifts.find(s => s.id === myRequest.requester_shift_id);
        if (!myShift) {
          console.log(`Could not find shift data for my request ${myRequest.id}`);
          continue;
        }
        
        console.log('Checking my shift for matches:', myShift);
        
        // Get my preferred dates
        const myPreferredDates = allPreferredDates.filter(pd => pd.shift_id === myRequest.requester_shift_id);
        console.log('My preferred dates:', myPreferredDates);
        
        // Get my shift type
        const myShiftType = getShiftType(myShift.start_time);
        console.log('My shift type:', myShiftType);
        
        // Format my shift date for easier comparison
        const myShiftDate = new Date(myShift.date).toISOString().split('T')[0];
        console.log('My shift date (formatted):', myShiftDate);
        
        // Check each other user's request for potential matches
        for (const otherRequest of otherUsersRequests) {
          // Get other user's shift details
          const otherShift = allShifts.find(s => s.id === otherRequest.requester_shift_id);
          if (!otherShift) {
            console.log(`Could not find shift data for other request ${otherRequest.id}`);
            continue;
          }
          
          console.log('Checking potential match with shift:', otherShift);
          
          // Get other user's preferred dates
          const otherPreferredDates = allPreferredDates.filter(pd => pd.shift_id === otherRequest.requester_shift_id);
          console.log('Other user preferred dates:', otherPreferredDates);
          
          // Get other user's shift type
          const otherShiftType = getShiftType(otherShift.start_time);
          console.log('Other shift type:', otherShiftType);
          
          // Format other shift date for easier comparison
          const otherShiftDate = new Date(otherShift.date).toISOString().split('T')[0];
          console.log('Other shift date (formatted):', otherShiftDate);
          
          // Check if I want their date and shift type
          const iWantTheirDate = myPreferredDates.some(pd => {
            const preferredDate = new Date(pd.date).toISOString().split('T')[0];
            console.log(`Comparing my preferred date ${preferredDate} to their shift date ${otherShiftDate}`);
            return preferredDate === otherShiftDate;
          });
          
          if (!iWantTheirDate) {
            console.log("I don't want their date");
            continue;
          }
          
          const iWantTheirShiftType = myPreferredDates.some(pd => {
            const preferredDate = new Date(pd.date).toISOString().split('T')[0];
            return preferredDate === otherShiftDate && pd.accepted_types.includes(otherShiftType);
          });
          
          if (!iWantTheirShiftType) {
            console.log("I don't want their shift type");
            continue;
          }
          
          console.log('I want their date and shift type');
          
          // Check if they want my date and shift type
          const theyWantMyDate = otherPreferredDates.some(pd => {
            const preferredDate = new Date(pd.date).toISOString().split('T')[0];
            console.log(`Comparing their preferred date ${preferredDate} to my shift date ${myShiftDate}`);
            return preferredDate === myShiftDate;
          });
          
          if (!theyWantMyDate) {
            console.log("They don't want my date");
            continue;
          }
          
          const theyWantMyShiftType = otherPreferredDates.some(pd => {
            const preferredDate = new Date(pd.date).toISOString().split('T')[0];
            return preferredDate === myShiftDate && pd.accepted_types.includes(myShiftType);
          });
          
          if (!theyWantMyShiftType) {
            console.log("They don't want my shift type");
            continue;
          }
          
          console.log('MATCH FOUND! They want my date and shift type and I want theirs!');
          
          // We have a match! Update both swap requests to "matched" status
          console.log(`Updating my request ${myRequest.id} and their request ${otherRequest.id} to matched status`);
          
          // Update my request
          const { error: updateMyError } = await supabase
            .from('shift_swap_requests')
            .update({ 
              status: 'matched',
              acceptor_id: otherShift.user_id,
              acceptor_shift_id: otherShift.id
            })
            .eq('id', myRequest.id);
            
          if (updateMyError) {
            console.error('Error updating my request:', updateMyError);
            throw updateMyError;
          }
          
          // Update other user's request
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
          
          // Break after finding a match for this request
          break;
        }
        
        if (matchesFound) break;
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
