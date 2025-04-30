
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export const useSwapMatching = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const { user } = useAuth();

  /**
   * Toggle test mode on/off
   */
  const toggleTestMode = () => {
    setTestMode(prev => !prev);
    toast({
      title: testMode ? "Test mode disabled" : "Test mode enabled",
      description: testMode 
        ? "Now only matching with other users' requests" 
        : "Now allowing matches between your own requests for testing",
    });
  };

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
      console.log('----------- SWAP MATCHING STARTED -----------');
      console.log('Current user ID:', user.id);
      console.log('Test mode:', testMode ? 'ON - allowing self-matches' : 'OFF - only matching with other users');
      
      // Get ALL pending swap requests - THIS IS THE KEY CHANGE - FETCH ALL REQUESTS FIRST
      const { data: allRequests, error: requestsError } = await supabase
        .from('shift_swap_requests')
        .select(`
          id,
          requester_id,
          requester_shift_id,
          status
        `)
        .eq('status', 'pending');
        
      if (requestsError) {
        console.error('Error fetching pending requests:', requestsError);
        throw requestsError;
      }
      
      if (!allRequests || allRequests.length === 0) {
        console.log('No pending requests found in the system');
        toast({
          title: "No pending swap requests",
          description: "There are no pending swap requests in the system to match.",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log('All pending requests found:', allRequests);
      
      // Separate my requests from other users' requests
      const myRequests = allRequests.filter(req => req.requester_id === user.id);
      
      // In test mode, treat your own requests as "other users" for matching
      // FIXED: Don't filter out other users' requests in normal mode
      const otherUsersRequests = testMode 
        ? allRequests // In test mode, consider all requests
        : allRequests.filter(req => req.requester_id !== user.id);
      
      console.log('My requests:', myRequests);
      console.log('Requests to match against:', otherUsersRequests);
      
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
          description: testMode 
            ? "No requests available for matching." 
            : "No other users currently have pending swap requests.",
        });
        setIsProcessing(false);
        return;
      }
      
      // Get all the shift IDs from all requests
      const allShiftIds = [...myRequests.map(req => req.requester_shift_id), 
                        ...otherUsersRequests.map(req => req.requester_shift_id)];
      
      console.log('All shift IDs to fetch:', allShiftIds);
      
      // Get details for all shifts
      const { data: allShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .in('id', allShiftIds);
        
      if (shiftsError) {
        console.error('Error fetching shift details:', shiftsError);
        throw shiftsError;
      }
      
      if (!allShifts || allShifts.length === 0) {
        console.error('No shift details found');
        throw new Error('Failed to fetch shift details');
      }
      
      console.log('All shifts data:', allShifts);
      
      // Get all preferred dates for all requests
      const { data: allPreferredDates, error: datesError } = await supabase
        .from('shift_swap_preferred_dates')
        .select('*')
        .in('shift_id', allShiftIds);
        
      if (datesError) {
        console.error('Error fetching preferred dates:', datesError);
        throw datesError;
      }
      
      // If no preferred dates found, show a clear message
      if (!allPreferredDates || allPreferredDates.length === 0) {
        console.error('No preferred dates found in the system');
        toast({
          title: "No swap preferences found",
          description: "There are no preferred dates set for any requests.",
        });
        setIsProcessing(false);
        return;
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
        
        if (myPreferredDates.length === 0) {
          console.log(`No preferred dates found for my shift ${myShift.id}`);
          continue;
        }
        
        // Get my shift type
        const myShiftType = getShiftType(myShift.start_time);
        console.log('My shift type:', myShiftType);
        
        // Format my shift date for easier comparison
        const myShiftDate = new Date(myShift.date).toISOString().split('T')[0];
        console.log('My shift date (formatted):', myShiftDate);
        
        // Check each other user's request for potential matches
        for (const otherRequest of otherUsersRequests) {
          // Skip self-matching in non-test mode
          if (!testMode && otherRequest.requester_id === user.id) {
            console.log('Skipping self-match in normal mode');
            continue;
          }
          
          // Skip comparing the same request with itself even in test mode
          if (myRequest.id === otherRequest.id) {
            console.log('Skipping matching request with itself');
            continue;
          }
          
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
          
          if (otherPreferredDates.length === 0) {
            console.log(`No preferred dates found for other shift ${otherShift.id}`);
            continue;
          }
          
          // Get other user's shift type
          const otherShiftType = getShiftType(otherShift.start_time);
          console.log('Other shift type:', otherShiftType);
          
          // Format other shift date for easier comparison
          const otherShiftDate = new Date(otherShift.date).toISOString().split('T')[0];
          console.log('Other shift date (formatted):', otherShiftDate);
          
          // DETAILED MATCHING LOGIC
          console.log(`----- MATCHING CHECK DETAILS -----`);
          console.log(`My Shift: ${myShiftDate} (${myShiftType})`);
          console.log(`Other Shift: ${otherShiftDate} (${otherShiftType})`);
          
          // Check if I want their date and shift type
          let iWantTheirDate = false;
          let iWantTheirShiftType = false;
          
          for (const myPref of myPreferredDates) {
            const myPrefDate = new Date(myPref.date).toISOString().split('T')[0];
            console.log(`Comparing my preferred date ${myPrefDate} to their shift date ${otherShiftDate}`);
            
            if (myPrefDate === otherShiftDate) {
              iWantTheirDate = true;
              console.log(`Date match: I want their date (${otherShiftDate})`);
              
              console.log(`My accepted types for this date:`, myPref.accepted_types);
              console.log(`Checking if I accept their shift type (${otherShiftType})`);
              
              if (myPref.accepted_types.includes(otherShiftType)) {
                iWantTheirShiftType = true;
                console.log(`Type match: I want their shift type (${otherShiftType})`);
              } else {
                console.log(`Type mismatch: I don't want their shift type (${otherShiftType})`);
              }
              break;
            }
          }
          
          if (!iWantTheirDate || !iWantTheirShiftType) {
            console.log("No match: I don't want their shift or shift type");
            continue;
          }
          
          // Check if they want my date and shift type
          let theyWantMyDate = false;
          let theyWantMyShiftType = false;
          
          for (const otherPref of otherPreferredDates) {
            const otherPrefDate = new Date(otherPref.date).toISOString().split('T')[0];
            console.log(`Comparing their preferred date ${otherPrefDate} to my shift date ${myShiftDate}`);
            
            if (otherPrefDate === myShiftDate) {
              theyWantMyDate = true;
              console.log(`Date match: They want my date (${myShiftDate})`);
              
              console.log(`Their accepted types for this date:`, otherPref.accepted_types);
              console.log(`Checking if they accept my shift type (${myShiftType})`);
              
              if (otherPref.accepted_types.includes(myShiftType)) {
                theyWantMyShiftType = true;
                console.log(`Type match: They want my shift type (${myShiftType})`);
              } else {
                console.log(`Type mismatch: They don't want my shift type (${myShiftType})`);
              }
              break;
            }
          }
          
          if (!theyWantMyDate || !theyWantMyShiftType) {
            console.log("No match: They don't want my shift or shift type");
            continue;
          }
          
          console.log('MATCH FOUND! Mutual match confirmed!');
          console.log(`My request ${myRequest.id} matches with their request ${otherRequest.id}`);
          
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
          
          console.log('Successfully updated my request to matched');
          
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
          
          console.log('Successfully updated other user request to matched');
          
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
      
      console.log('----------- SWAP MATCHING COMPLETED -----------');
      console.log('Matches found:', matchesFound);
      
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
    isProcessing,
    testMode,
    toggleTestMode
  };
};
