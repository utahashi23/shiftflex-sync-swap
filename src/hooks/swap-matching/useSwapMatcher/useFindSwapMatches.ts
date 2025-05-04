
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllSwapRequestsSafe, fetchAllPreferredDatesWithRequestsSafe } from '@/utils/rls-helpers';

/**
 * Hook for finding potential swap matches between users
 * Enhanced with simple matching logic for immediate user feedback
 */
export const useFindSwapMatches = (setIsProcessing: (isProcessing: boolean) => void) => {
  const [matchResults, setMatchResults] = useState<any>(null);

  /**
   * Find potential matches using simple matching logic
   * This implementation uses the same logic as SimpleMatchTester
   * @param userId - User ID to find matches for
   * @param forceCheck - Whether to check all requests even if already matched
   * @param verbose - Whether to enable verbose logging
   * @param userPerspectiveOnly - Whether to only show matches from the user's perspective
   * @param userInitiatorOnly - Whether to only show matches where the user is the initiator
   */
  const findSwapMatches = async (
    userId: string, 
    forceCheck: boolean = false,
    verbose: boolean = false,
    userPerspectiveOnly: boolean = true,
    userInitiatorOnly: boolean = true
  ) => {
    try {
      console.log(`Finding swap matches for ${userId} using simple match logic`);
      setIsProcessing(true);
      
      // Step 1: Fetch all swap requests
      const { data: requestsData, error: requestsError } = await fetchAllSwapRequestsSafe();
      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
        throw requestsError;
      }
      
      if (!requestsData || !Array.isArray(requestsData)) {
        console.log('No requests found or invalid data format');
        return [];
      }
      
      // Step 2: Fetch shift data for each request
      const enrichedRequests = await Promise.all(requestsData.map(async (request) => {
        // Get the shift data using the request's requester_shift_id
        const { data: shiftData } = await supabase.rpc('get_shift_by_id', { 
          shift_id: request.requester_shift_id 
        });
        
        // Get the user data
        const { data: userData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', request.requester_id)
          .maybeSingle();
        
        return {
          ...request,
          shift_date: shiftData?.[0]?.date || 'Unknown',
          shift: shiftData?.[0] || null,
          user: userData || { first_name: 'Unknown', last_name: 'User' }
        };
      }));
      
      // Step 3: Fetch all preferred dates
      const { data: datesData, error: datesError } = await fetchAllPreferredDatesWithRequestsSafe();
      if (datesError) {
        console.error('Error fetching preferred dates:', datesError);
        throw datesError;
      }
      
      if (verbose) {
        console.log(`Fetched ${enrichedRequests?.length} requests`);
        console.log(`Fetched ${datesData?.length} preferred dates`);
      }
      
      // Step 4: Apply the simple match logic from SimpleMatchTester
      
      // Group preferred dates by request ID for faster lookups
      const preferredDatesByRequest = (datesData || []).reduce((acc, date) => {
        if (!acc[date.request_id]) {
          acc[date.request_id] = [];
        }
        acc[date.request_id].push(date.date);
        return acc;
      }, {});
      
      const allRequests = enrichedRequests || [];
      const matches = [];
      
      // Find user's requests if userPerspectiveOnly is true
      const userRequests = userPerspectiveOnly 
        ? allRequests.filter(req => req.requester_id === userId)
        : allRequests;
      
      // Requests to process - either user's requests only or all requests
      const requestsToProcess = userPerspectiveOnly ? userRequests : allRequests;
      
      // Other requests to compare against
      const otherRequests = userPerspectiveOnly
        ? allRequests.filter(req => req.requester_id !== userId)
        : allRequests;
      
      if (verbose) {
        console.log(`Processing ${requestsToProcess.length} requests for user ${userId}`);
      }
      
      // Simple matching algorithm from SimpleMatchTester
      for (const request1 of requestsToProcess) {
        if (request1.status !== 'pending') continue; // Only check pending requests
        
        for (const request2 of otherRequests) {
          // Skip self-matching or requests from the same user
          if (request1.id === request2.id || request1.requester_id === request2.requester_id) {
            continue;
          }
          
          if (request2.status !== 'pending') continue; // Only match with other pending requests
          
          const request1ShiftDate = request1.shift_date;
          const request2ShiftDate = request2.shift_date;
          
          // Skip if either shift date is unknown
          if (!request1ShiftDate || !request2ShiftDate || 
              request1ShiftDate === 'Unknown' || request2ShiftDate === 'Unknown') {
            continue;
          }
          
          // Get preferred dates for both requests
          const request1PreferredDates = preferredDatesByRequest[request1.id] || [];
          const request2PreferredDates = preferredDatesByRequest[request2.id] || [];
          
          // Check if each request wants the other's shift date
          const request1WantsRequest2Date = request1PreferredDates.includes(request2ShiftDate);
          const request2WantsRequest1Date = request2PreferredDates.includes(request1ShiftDate);
          
          // If both conditions are met, it's a match!
          if (request1WantsRequest2Date && request2WantsRequest1Date) {
            if (verbose) {
              console.log(`Found match between request ${request1.id} and ${request2.id}`);
            }
            
            // Get the shift objects, ensuring they have the required properties
            const shift1 = request1.shift || {};
            const shift2 = request2.shift || {};
            
            // Construct match object in the format expected by the UI
            matches.push({
              match_id: `potential-${request1.id}-${request2.id}`,
              match_status: 'pending',
              my_request_id: request1.id,
              other_request_id: request2.id,
              my_shift_id: request1.requester_shift_id,
              other_shift_id: request2.requester_shift_id,
              my_shift_date: request1.shift_date,
              other_shift_date: request2.shift_date,
              my_shift_start_time: shift1.start_time || '00:00:00',
              my_shift_end_time: shift1.end_time || '00:00:00',
              other_shift_start_time: shift2.start_time || '00:00:00',
              other_shift_end_time: shift2.end_time || '00:00:00',
              my_shift_truck: shift1.truck_name || 'Unknown',
              other_shift_truck: shift2.truck_name || 'Unknown',
              other_user_id: request2.requester_id,
              other_user_name: `${request2.user?.first_name || ''} ${request2.user?.last_name || ''}`.trim() || 'Unknown User',
              created_at: new Date().toISOString()
            });
          }
        }
      }
      
      if (verbose) {
        console.log(`Found ${matches.length} potential matches using simple match logic`);
      }
      
      // Save and return the results
      setMatchResults(matches);
      return matches;
    } catch (error) {
      console.error('Error in findSwapMatches:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    findSwapMatches,
    matchResults
  };
};
