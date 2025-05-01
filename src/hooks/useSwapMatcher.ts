
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth'; 
import { normalizeDate } from '@/utils/dateUtils';
import { getShiftType, createLookupMaps } from '@/utils/shiftUtils';
import { checkSwapCompatibility, recordShiftMatch } from '@/utils/swapMatchingLogic';
import { fetchAllShifts, fetchAllPreferredDates, fetchAllSwapRequests } from '@/utils/rls-bypass';

export const useSwapMatcher = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user, isAdmin } = useAuth();
  
  // Function to find and record swap matches
  const findSwapMatches = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use the swap matching feature.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log('----------- SWAP MATCHING STARTED -----------');
      console.log('Current user ID:', user.id);
      console.log('Is admin:', isAdmin);
      
      // Fetch all necessary data for swap matching using our RLS bypass utilities
      console.log('Fetching all shifts...');
      const shiftsResult = await fetchAllShifts();
      if (shiftsResult.error) {
        throw shiftsResult.error;
      }
      const allShifts = shiftsResult.data || [];
      console.log(`Fetched ${allShifts.length} shifts in total`);
      
      console.log('Fetching all swap requests...');
      const requestsResult = await fetchAllSwapRequests();
      if (requestsResult.error) {
        throw requestsResult.error;
      }
      const allRequests = requestsResult.data || [];
      console.log(`Fetched ${allRequests.length} swap requests in total`);
      
      console.log('Fetching all preferred dates...');
      const datesResult = await fetchAllPreferredDates();
      if (datesResult.error) {
        throw datesResult.error;
      }
      const preferredDates = datesResult.data || [];
      console.log(`Fetched ${preferredDates.length} preferred dates in total`);
      
      if (allRequests.length === 0) {
        console.log('No pending swap requests found in the system');
        toast({
          title: "No Pending Swap Requests",
          description: "There are no pending swap requests in the system to match.",
        });
        return;
      }
      
      if (preferredDates.length === 0) {
        console.log('No preferred dates found in the system');
        toast({
          title: "No Swap Preferences Found",
          description: "There are no preferred dates set for any requests.",
        });
        return;
      }
      
      // Get profiles for all users (this may be subject to RLS too, we'll need to adapt if so)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }
      
      // Create a map of user IDs to profile info for quick lookup
      const profilesMap = (profiles || []).reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
      }, {} as Record<string, any>);
      
      // Create a shifts map for direct lookup when we have embedded data
      const shiftMap = new Map();
      allShifts.forEach(shift => {
        shiftMap.set(shift.id, shift);
      });
      
      // Add any embedded shifts from the request data to our shift map
      allRequests.forEach(request => {
        if (request._embedded_shift && request._embedded_shift.id) {
          // If the request has embedded shift data that we might not have, add it to the map
          shiftMap.set(request._embedded_shift.id, request._embedded_shift);
        }
      });
      
      // Now convert our map back to an array to use with the existing code
      const combinedShifts = Array.from(shiftMap.values());
      console.log(`Combined ${combinedShifts.length} shifts after adding embedded shift data`);
      
      // Prepare data structures for efficient matching
      const { 
        shiftsByDate, 
        shiftsByUser, 
        requestsByUser, 
        requestShifts, 
        preferredDatesByRequest 
      } = createLookupMaps(allRequests, combinedShifts, preferredDates);
      
      console.log('Data structures prepared for matching');
      console.log('Starting to process each request for potential matches...');
      
      // Temporary storage for matches
      const matches = [];
      
      // Filter for pending requests only 
      const pendingRequests = allRequests.filter(req => req.status === 'pending' && req.preferred_dates_count > 0);
      console.log(`Processing ${pendingRequests.length} pending requests with preferred dates`);
      
      // Process each request to find potential matches
      for (const request of pendingRequests) {
        // First check if we have embedded shift data
        let requestShift;
        
        if (request._embedded_shift) {
          // Use the embedded shift data directly
          requestShift = {
            ...request._embedded_shift,
            normalizedDate: new Date(request._embedded_shift.date).toISOString().split('T')[0],
            type: getShiftType(request._embedded_shift.start_time)
          };
        } else {
          // Fall back to the lookup method
          requestShift = requestShifts[request.id];
        }
        
        if (!requestShift) {
          console.log(`Missing shift data for request ${request.id}`);
          continue;
        }
        
        const requesterName = profilesMap[request.requester_id] ? 
          `${profilesMap[request.requester_id].first_name} ${profilesMap[request.requester_id].last_name}` : 
          'Unknown User';
        
        console.log(`Processing request ${request.id} from user ${request.requester_id} (${requesterName})`);
        
        // Get this request's preferred dates for swapping
        const preferredDatesForRequest = preferredDatesByRequest[request.id] || [];
        console.log(`Request ${request.id} has ${preferredDatesForRequest.length} preferred dates`);
        console.log(`Offering shift on ${requestShift.normalizedDate} (${requestShift.type})`);
        
        // Loop through all other pending requests to check for compatibility
        for (const otherRequest of pendingRequests) {
          // Skip self-comparison
          if (otherRequest.id === request.id) continue;
          
          // Skip if requester is the same person
          if (otherRequest.requester_id === request.requester_id) continue;
          
          // Get the shift for the other request, checking for embedded data first
          let otherRequestShift;
          
          if (otherRequest._embedded_shift) {
            // Use the embedded shift data directly
            otherRequestShift = {
              ...otherRequest._embedded_shift,
              normalizedDate: new Date(otherRequest._embedded_shift.date).toISOString().split('T')[0],
              type: getShiftType(otherRequest._embedded_shift.start_time)
            };
          } else {
            // Fall back to the lookup method
            otherRequestShift = requestShifts[otherRequest.id];
          }
          
          if (!otherRequestShift) {
            console.log(`Missing shift data for other request ${otherRequest.id}`);
            continue;
          }
          
          // Check if users want to swap shifts based on their preferences
          const { isCompatible } = checkSwapCompatibility(
            request,
            otherRequest,
            requestShift,
            otherRequestShift,
            preferredDatesByRequest,
            shiftsByUser
          );
          
          // If match found, record it
          if (isCompatible) {
            matches.push({ request, otherRequest });
          }
        }
      }
      
      console.log(`Matching complete. Found ${matches.length} matches.`);
      
      // Record all matches in the database
      for (const match of matches) {
        await recordShiftMatch(match.request, match.otherRequest, user.id);
      }
      
      if (matches.length > 0) {
        toast({
          title: `Found ${matches.length} Swap Matches!`,
          description: "Check the matched swaps tab to see your matches.",
        });
      } else {
        toast({
          title: "No Matches Found",
          description: "No compatible shift swaps were found at this time.",
        });
      }
    } catch (error: any) {
      console.error('Error finding swap matches:', error);
      toast({
        title: "Error Finding Matches",
        description: `Problem finding matches: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      console.log('----------- SWAP MATCHING COMPLETED -----------');
    }
  };
  
  return { findSwapMatches, isProcessing };
};
