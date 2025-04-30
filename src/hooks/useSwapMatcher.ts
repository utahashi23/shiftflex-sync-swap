
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { normalizeDate } from '@/utils/dateUtils';

// Shift type definition based on start time
export type ShiftType = "day" | "afternoon" | "night";

// Types for better readability
interface ShiftData {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  truck_name?: string;
  status: string;
  type?: ShiftType;
  normalized_date?: string;
}

interface SwapRequest {
  id: string;
  requester_id: string;
  requester_shift_id: string;
  acceptor_id: string | null;
  acceptor_shift_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  preferred_dates_count: number;
}

interface PreferredDate {
  id: string;
  request_id: string;
  date: string;
  accepted_types: ShiftType[];
}

interface RequestData {
  id: string;
  shiftId: string;
  shift: ShiftData;
  preferredDates: {
    id: string;
    date: string;
    acceptedTypes: ShiftType[];
  }[];
}

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
 * Custom hook for matching shift swap requests between users
 */
export const useSwapMatcher = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  /**
   * Fetch all pending swap requests
   */
  const fetchPendingRequests = async (): Promise<SwapRequest[]> => {
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
    
    if (!data || data.length === 0) {
      console.log('No pending swap requests found');
      return [];
    }
    
    console.log(`Found ${data.length} pending swap requests:`, data);
    return data;
  };

  /**
   * Fetch shifts for given shift IDs
   */
  const fetchShiftsByIds = async (shiftIds: string[]): Promise<ShiftData[]> => {
    console.log('Fetching shifts for IDs:', shiftIds);
    
    if (shiftIds.length === 0) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .in('id', shiftIds);
      
    if (error) {
      console.error('Error fetching shifts:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('No shifts found for the given IDs');
      return [];
    }
    
    console.log(`Found ${data.length} shifts`);
    
    // Enhance shift data with type and normalized date
    return data.map(shift => ({
      ...shift,
      type: getShiftType(shift.start_time),
      normalized_date: normalizeDate(shift.date)
    }));
  };

  /**
   * Fetch all shifts for given user IDs
   */
  const fetchAllShiftsForUsers = async (userIds: string[]): Promise<ShiftData[]> => {
    console.log('Fetching all shifts for users:', userIds);
    
    if (userIds.length === 0) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .in('user_id', userIds);
      
    if (error) {
      console.error('Error fetching user shifts:', error);
      throw error;
    }
    
    if (!data) {
      return [];
    }
    
    console.log(`Found ${data.length} total shifts for the users`);
    
    // Enhance shift data with normalized date
    return data.map(shift => ({
      ...shift,
      normalized_date: normalizeDate(shift.date)
    }));
  };

  /**
   * Fetch preferred dates for given request IDs
   */
  const fetchPreferredDates = async (requestIds: string[]): Promise<PreferredDate[]> => {
    console.log('Fetching preferred dates for requests:', requestIds);
    
    if (requestIds.length === 0) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('shift_swap_preferred_dates')
      .select('*')
      .in('request_id', requestIds);
      
    if (error) {
      console.error('Error fetching preferred dates:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('No preferred dates found');
      return [];
    }
    
    console.log(`Found ${data.length} preferred dates`);
    
    return data.map(date => ({
      ...date,
      date: normalizeDate(date.date)
    }));
  };

  /**
   * Check if a potential match already exists in the database
   */
  const checkExistingMatch = async (request1Id: string, request2Id: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('shift_swap_potential_matches')
      .select('id')
      .or(`requester_request_id.eq.${request1Id},requester_request_id.eq.${request2Id}`)
      .or(`acceptor_request_id.eq.${request1Id},acceptor_request_id.eq.${request2Id}`);
      
    if (error) {
      console.error('Error checking existing matches:', error);
      return false;
    }
    
    return data && data.length > 0;
  };

  /**
   * Record a new match in the database
   */
  const recordMatch = async (
    request1Id: string, 
    request2Id: string,
    shift1Id: string,
    shift2Id: string
  ): Promise<boolean> => {
    // Record the match
    const { data, error } = await supabase
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
      
    if (error) {
      console.error('Error recording match:', error);
      return false;
    }
    
    console.log('Match recorded:', data);
    return true;
  };

  /**
   * Update swap request status to matched
   */
  const updateRequestToMatched = async (
    requestId: string,
    acceptorId: string,
    acceptorShiftId: string
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('shift_swap_requests')
      .update({
        status: 'matched',
        acceptor_id: acceptorId,
        acceptor_shift_id: acceptorShiftId
      })
      .eq('id', requestId);
      
    if (error) {
      console.error(`Error updating request ${requestId}:`, error);
      return false;
    }
    
    return true;
  };

  /**
   * Create data structures for efficient matching
   */
  const prepareDataForMatching = (
    requests: SwapRequest[],
    shifts: ShiftData[],
    preferredDates: PreferredDate[]
  ): {
    requestsByUser: Record<string, RequestData[]>,
    shiftsById: Record<string, ShiftData>,
    userRosteredDates: Record<string, Set<string>>
  } => {
    // 1. Create shift lookup with type and normalized date
    const shiftsById = shifts.reduce((acc, shift) => {
      acc[shift.id] = shift;
      return acc;
    }, {} as Record<string, ShiftData>);
    
    // 2. Group requests by user
    const requestsByUser = requests.reduce((acc, req) => {
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
        shift,
        preferredDates: []
      });
      return acc;
    }, {} as Record<string, RequestData[]>);
    
    // 3. Add preferred dates to each request
    for (const pref of preferredDates) {
      const request = requests.find(r => r.id === pref.request_id);
      if (request) {
        const userId = request.requester_id;
        const userRequests = requestsByUser[userId];
        if (!userRequests) continue;
        
        const requestObj = userRequests.find(r => r.id === pref.request_id);
        if (requestObj) {
          requestObj.preferredDates.push({
            id: pref.id,
            date: pref.date,
            acceptedTypes: pref.accepted_types || []
          });
        }
      }
    }
    
    // 4. Map users to their rostered dates (for conflict checking)
    const userRosteredDates: Record<string, Set<string>> = {};
    shifts.forEach(shift => {
      if (!userRosteredDates[shift.user_id]) {
        userRosteredDates[shift.user_id] = new Set();
      }
      if (shift.normalized_date) {
        userRosteredDates[shift.user_id].add(shift.normalized_date);
      }
    });
    
    console.log('Data structures prepared:');
    console.log('- Shifts by ID:', shiftsById);
    console.log('- Requests by user:', requestsByUser);
    console.log('- User rostered dates:', userRosteredDates);
    
    return { requestsByUser, shiftsById, userRosteredDates };
  };

  /**
   * Check if a user wants specific shift
   */
  const userWantsShift = (
    request: RequestData,
    offeredDate: string,
    offeredType: ShiftType
  ): boolean => {
    return request.preferredDates.some(
      pref => pref.date === offeredDate && pref.acceptedTypes.includes(offeredType)
    );
  };

  /**
   * Check for roster conflicts
   */
  const hasRosterConflict = (
    userId: string,
    date: string,
    userRosteredDates: Record<string, Set<string>>
  ): boolean => {
    return userRosteredDates[userId] && userRosteredDates[userId].has(date);
  };

  /**
   * Process a match between two requests
   */
  const processMatch = async (
    request1: RequestData,
    request2: RequestData,
    userId1: string,
    userId2: string,
    user: any
  ): Promise<boolean> => {
    try {
      // Check if this match already exists
      const matchExists = await checkExistingMatch(request1.id, request2.id);
      if (matchExists) {
        console.log('Match already exists, skipping');
        return false;
      }
      
      // Record the match
      const matchRecorded = await recordMatch(
        request1.id,
        request2.id,
        request1.shiftId,
        request2.shiftId
      );
      
      if (!matchRecorded) {
        return false;
      }
      
      // Update the first request to matched status
      const updated1 = await updateRequestToMatched(
        request1.id,
        userId2,
        request2.shiftId
      );
      
      if (!updated1) {
        return false;
      }
      
      // Update the second request to matched status
      const updated2 = await updateRequestToMatched(
        request2.id,
        userId1,
        request1.shiftId
      );
      
      if (!updated2) {
        // Try to rollback the first update
        await supabase
          .from('shift_swap_requests')
          .update({
            status: 'pending',
            acceptor_id: null,
            acceptor_shift_id: null
          })
          .eq('id', request1.id);
          
        return false;
      }
      
      // Notify the user if they're involved in the match
      if (user && (userId1 === user.id || userId2 === user.id)) {
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
   * Find all potential matches between all pending swap requests
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
      
      // Step 1: Fetch ALL pending swap requests regardless of user
      const allRequests = await fetchPendingRequests();
        
      if (!allRequests || allRequests.length === 0) {
        toast({
          title: "No pending swap requests",
          description: "There are no pending swap requests to match.",
        });
        setIsProcessing(false);
        return;
      }
      
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
      
      // Step 2: Fetch all shifts associated with the requests
      const requestShifts = await fetchShiftsByIds(shiftIds);
        
      if (!requestShifts || requestShifts.length === 0) {
        toast({
          title: "Missing shift data",
          description: "Could not find the shifts associated with swap requests.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      // Step 3: Fetch all preferred dates for all requests
      const requestIds = allRequests.map(req => req.id);
      const preferredDates = await fetchPreferredDates(requestIds);
        
      if (!preferredDates || preferredDates.length === 0) {
        toast({
          title: "No swap preferences",
          description: "There are no preferred dates set for any requests.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      // Step 4: Fetch ALL shifts for ALL users to check for conflicts
      const allUserShifts = await fetchAllShiftsForUsers(userIds);
      
      // Build data structures for efficient matching
      const { requestsByUser, shiftsById, userRosteredDates } = prepareDataForMatching(
        allRequests,
        [...requestShifts, ...allUserShifts],
        preferredDates
      );
      
      // MATCHING ALGORITHM
      console.log('Starting matching algorithm...');
      let matchesFound = 0;
      
      // Compare each user's requests with every other user's requests
      const userIdList = Object.keys(requestsByUser);
      for (let i = 0; i < userIdList.length; i++) {
        const userId1 = userIdList[i];
        const requests1 = requestsByUser[userId1];
        
        for (const request1 of requests1) {
          const shift1 = request1.shift;
          if (!shift1 || !shift1.normalized_date || !shift1.type) continue;
          
          const offeredDate1 = shift1.normalized_date;
          const offeredType1 = shift1.type;
          
          console.log(`\nChecking request from user ${userId1} offering ${offeredDate1} (${offeredType1}) shift`);
          
          // Compare with all other users
          for (let j = 0; j < userIdList.length; j++) {
            if (i === j) continue; // Skip self comparison
            
            const userId2 = userIdList[j];
            const requests2 = requestsByUser[userId2];
            
            for (const request2 of requests2) {
              const shift2 = request2.shift;
              if (!shift2 || !shift2.normalized_date || !shift2.type) continue;
              
              const offeredDate2 = shift2.normalized_date;
              const offeredType2 = shift2.type;
              
              console.log(`Comparing with user ${userId2} offering ${offeredDate2} (${offeredType2}) shift`);
              
              // Check if user1 wants user2's shift (date and type)
              const user1WantsUser2Shift = userWantsShift(request1, offeredDate2, offeredType2);
              
              if (!user1WantsUser2Shift) {
                console.log(`- No match: User ${userId1} doesn't want user ${userId2}'s shift`);
                continue;
              }
              
              // Check if user2 wants user1's shift (date and type)
              const user2WantsUser1Shift = userWantsShift(request2, offeredDate1, offeredType1);
              
              if (!user2WantsUser1Shift) {
                console.log(`- No match: User ${userId2} doesn't want user ${userId1}'s shift`);
                continue;
              }
              
              // Check for roster conflicts
              const user1HasConflict = hasRosterConflict(userId1, offeredDate2, userRosteredDates);
              if (user1HasConflict) {
                console.log(`- Conflict: User ${userId1} is already rostered on ${offeredDate2}`);
                continue;
              }
              
              const user2HasConflict = hasRosterConflict(userId2, offeredDate1, userRosteredDates);
              if (user2HasConflict) {
                console.log(`- Conflict: User ${userId2} is already rostered on ${offeredDate1}`);
                continue;
              }
              
              // We have a match!
              console.log(`🎉 MATCH FOUND between users ${userId1} and ${userId2}!`);
              
              const matchProcessed = await processMatch(request1, request2, userId1, userId2, user);
              
              if (matchProcessed) {
                matchesFound++;
              }
              
              // Only match each request once
              break;
            }
          }
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
