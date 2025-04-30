
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { normalizeDate } from '@/utils/dateUtils';
import { 
  ShiftType, 
  ShiftWithType,
  SwapRequestWithShift,
  UserRequestMap,
  ShiftsById,
  UserRosteredDates 
} from './swap-requests/shiftTypes';

export const useSwapMatcher = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  /**
   * Determines shift type based on start time
   */
  const getShiftType = (startTime: string): ShiftType => {
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
   * Fetch all pending swap requests
   */
  const fetchPendingRequests = async () => {
    console.log('Fetching ALL pending swap requests from ALL users...');
    const { data, error } = await supabase
      .from('shift_swap_requests')
      .select('*')
      .eq('status', 'pending')
      .gt('preferred_dates_count', 0);
      
    if (error) {
      console.error('Error fetching pending requests:', error);
      throw error;
    }
    
    return data || [];
  };

  /**
   * Fetch shifts for the given shift IDs
   */
  const fetchShiftsForRequests = async (shiftIds: string[]) => {
    console.log('Fetching shifts for all requests...');
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .in('id', shiftIds);
      
    if (error) {
      console.error('Error fetching shifts:', error);
      throw error;
    }
    
    return data || [];
  };

  /**
   * Fetch preferred dates for the given request IDs
   */
  const fetchPreferredDates = async (requestIds: string[]) => {
    console.log('Fetching preferred dates for all requests...');
    const { data, error } = await supabase
      .from('shift_swap_preferred_dates')
      .select('*')
      .in('request_id', requestIds);
      
    if (error) {
      console.error('Error fetching preferred dates:', error);
      throw error;
    }
    
    return data || [];
  };

  /**
   * Fetch all shifts for the given user IDs
   */
  const fetchAllUserShifts = async (userIds: string[]) => {
    console.log('Fetching all shifts for all users to check for conflicts...');
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .in('user_id', userIds);
      
    if (error) {
      console.error('Error fetching user shifts:', error);
      throw error;
    }
    
    return data || [];
  };

  /**
   * Process shifts to create a lookup by ID
   */
  const createShiftsLookup = (shifts: any[]): ShiftsById => {
    return shifts.reduce((acc, shift) => {
      acc[shift.id] = {
        ...shift,
        date: normalizeDate(shift.date),
        type: getShiftType(shift.start_time)
      };
      return acc;
    }, {} as ShiftsById);
  };

  /**
   * Group requests by user and prepare data structure
   */
  const groupRequestsByUser = (requests: any[], shiftsById: ShiftsById): UserRequestMap => {
    return requests.reduce((acc, req) => {
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
    }, {} as UserRequestMap);
  };

  /**
   * Create user to rostered dates mapping
   */
  const createUserRosteredDates = (shifts: any[]): UserRosteredDates => {
    const userRosteredDates: UserRosteredDates = {};
    
    shifts.forEach(shift => {
      if (!userRosteredDates[shift.user_id]) {
        userRosteredDates[shift.user_id] = new Set();
      }
      userRosteredDates[shift.user_id].add(normalizeDate(shift.date));
    });
    
    return userRosteredDates;
  };

  /**
   * Add preferred dates to requests
   */
  const addPreferredDatesToRequests = (
    preferredDates: any[], 
    requests: any[], 
    requestsByUser: UserRequestMap
  ): void => {
    for (const pref of preferredDates) {
      const request = requests.find(r => r.id === pref.request_id);
      if (request) {
        const userId = request.requester_id;
        const userRequests = requestsByUser[userId];
        if (!userRequests) continue;
        
        const requestObj = userRequests.find(r => r.id === pref.request_id);
        if (requestObj) {
          // Ensure accepted_types is cast to ShiftType[]
          const acceptedTypes = (pref.accepted_types || [])
            .filter((type: string) => type === 'day' || type === 'afternoon' || type === 'night') as ShiftType[];
          
          requestObj.preferredDates.push({
            id: pref.id,
            date: normalizeDate(pref.date),
            acceptedTypes
          });
        }
      }
    }
  };

  /**
   * Check for existing matches
   */
  const checkForExistingMatch = async (request1Id: string, request2Id: string) => {
    const { data, error } = await supabase
      .from('shift_swap_potential_matches')
      .select('*')
      .or(`requester_request_id.eq.${request1Id},requester_request_id.eq.${request2Id}`)
      .or(`acceptor_request_id.eq.${request1Id},acceptor_request_id.eq.${request2Id}`);
      
    if (error) {
      console.error('Error checking existing matches:', error);
      return true; // Assume match exists if error to be safe
    }
    
    return data && data.length > 0;
  };

  /**
   * Create a potential match
   */
  const createPotentialMatch = async (
    request1Id: string, 
    request2Id: string,
    shift1Id: string,
    shift2Id: string
  ) => {
    return await supabase
      .from('shift_swap_potential_matches')
      .insert({
        requester_request_id: request1Id,
        acceptor_request_id: request2Id,
        requester_shift_id: shift1Id,
        acceptor_shift_id: shift2Id,
        match_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();
  };

  /**
   * Update swap request status
   */
  const updateRequestStatus = async (
    requestId: string, 
    acceptorId: string,
    acceptorShiftId: string
  ) => {
    return await supabase
      .from('shift_swap_requests')
      .update({
        status: 'matched',
        acceptor_id: acceptorId,
        acceptor_shift_id: acceptorShiftId
      })
      .eq('id', requestId);
  };

  /**
   * Rollback request update
   */
  const rollbackRequestUpdate = async (requestId: string) => {
    await supabase
      .from('shift_swap_requests')
      .update({
        status: 'pending',
        acceptor_id: null,
        acceptor_shift_id: null
      })
      .eq('id', requestId);
  };

  /**
   * Process a match between two requests
   */
  const processMatch = async (
    request1: SwapRequestWithShift,
    request2: SwapRequestWithShift,
    userId1: string,
    userId2: string,
    currentUserId?: string
  ) => {
    try {
      // Check if match already exists
      const matchExists = await checkForExistingMatch(request1.id, request2.id);
      if (matchExists) {
        console.log('Match already exists, skipping');
        return false;
      }

      // Record the match
      const { data: matchData, error: matchError } = await createPotentialMatch(
        request1.id, 
        request2.id,
        request1.shiftId,
        request2.shiftId
      );
      
      if (matchError) {
        console.error('Error recording match:', matchError);
        return false;
      }
      
      console.log('Match recorded:', matchData);
      
      // Update first request
      const { error: error1 } = await updateRequestStatus(
        request1.id, 
        userId2, 
        request2.shiftId
      );
      
      if (error1) {
        console.error('Error updating first request:', error1);
        return false;
      }
      
      // Update second request
      const { error: error2 } = await updateRequestStatus(
        request2.id, 
        userId1, 
        request1.shiftId
      );
      
      if (error2) {
        console.error('Error updating second request:', error2);
        // Rollback first update
        await rollbackRequestUpdate(request1.id);
        return false;
      }
      
      // Notify user if they're involved
      if (currentUserId && (userId1 === currentUserId || userId2 === currentUserId)) {
        toast({
          title: "Match Found!",
          description: `Your shift swap request has been matched.`,
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error processing match:', error);
      return false;
    }
  };

  /**
   * Run the matching algorithm
   */
  const runMatchingAlgorithm = async (
    requestsByUser: UserRequestMap,
    userRosteredDates: UserRosteredDates,
    currentUserId?: string
  ) => {
    console.log('Starting matching algorithm...');
    let matchesFound = 0;
    
    const userIds = Object.keys(requestsByUser);
    
    // Compare each user's requests with every other user's requests
    for (let i = 0; i < userIds.length; i++) {
      const userId1 = userIds[i];
      const requests1 = requestsByUser[userId1];
      
      for (const request1 of requests1) {
        const shift1 = request1.shift;
        if (!shift1) continue;
        
        const offeredDate1 = shift1.date;
        const offeredType1 = shift1.type;
        
        console.log(`\nChecking request from user ${userId1} offering ${offeredDate1} (${offeredType1}) shift`);
        
        // Compare with all other users
        for (let j = 0; j < userIds.length; j++) {
          if (i === j) continue; // Skip self comparison
          
          const userId2 = userIds[j];
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
            const user1HasConflict = userRosteredDates[userId1] && 
              userRosteredDates[userId1].has(offeredDate2);
              
            if (user1HasConflict) {
              console.log(`- Conflict: User ${userId1} is already rostered on ${offeredDate2}`);
              continue;
            }
            
            const user2HasConflict = userRosteredDates[userId2] && 
              userRosteredDates[userId2].has(offeredDate1);
              
            if (user2HasConflict) {
              console.log(`- Conflict: User ${userId2} is already rostered on ${offeredDate1}`);
              continue;
            }
            
            // We have a match!
            console.log(`🎉 MATCH FOUND between users ${userId1} and ${userId2}!`);
            
            // Process the match and update the database
            const success = await processMatch(
              request1, 
              request2, 
              userId1, 
              userId2, 
              currentUserId
            );
            
            if (success) {
              matchesFound++;
              // Only match each request once
              break;
            }
          }
        }
      }
    }
    
    return matchesFound;
  };

  /**
   * Main function to find swap matches
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
      
      // Step 1: Fetch all pending swap requests
      const allRequests = await fetchPendingRequests();
      
      if (allRequests.length === 0) {
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
      
      console.log(`Found ${userIds.length} users with pending requests:`, userIds);
      
      if (userIds.length < 2) {
        toast({
          title: "Insufficient swap requests",
          description: "Need at least two users with pending requests to find matches.",
        });
        setIsProcessing(false);
        return;
      }
      
      // Step 2: Fetch shifts, preferred dates, and all user shifts
      const requestShifts = await fetchShiftsForRequests(shiftIds);
      
      if (requestShifts.length === 0) {
        toast({
          title: "Missing shift data",
          description: "Could not find the shifts associated with swap requests.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      const requestIds = allRequests.map(req => req.id);
      const preferredDates = await fetchPreferredDates(requestIds);
      
      if (preferredDates.length === 0) {
        toast({
          title: "No swap preferences",
          description: "There are no preferred dates set for any requests.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      const allUserShifts = await fetchAllUserShifts(userIds);
      
      // Step 3: Build data structures for matching
      const shiftsById = createShiftsLookup(requestShifts);
      const requestsByUser = groupRequestsByUser(allRequests, shiftsById);
      const userRosteredDates = createUserRosteredDates(allUserShifts);
      
      // Step 4: Add preferred dates to requests
      addPreferredDatesToRequests(preferredDates, allRequests, requestsByUser);
      
      console.log('Data structures prepared:');
      console.log('- Shifts by ID:', shiftsById);
      console.log('- Requests by user:', requestsByUser);
      console.log('- User rostered dates:', userRosteredDates);
      
      // Step 5: Run matching algorithm
      const matchesFound = await runMatchingAlgorithm(
        requestsByUser, 
        userRosteredDates, 
        user.id
      );
      
      console.log(`Matching complete. Found ${matchesFound} matches.`);
      
      // Step 6: Notify the user of the results
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
