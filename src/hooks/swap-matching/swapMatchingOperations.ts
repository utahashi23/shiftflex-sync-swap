import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { fetchAllShifts, fetchAllPreferredDates, fetchAllSwapRequests } from '@/utils/rls-bypass';
import { createLookupMaps } from '@/utils/shiftUtils';
import { 
  checkSwapCompatibility, 
  recordShiftMatch 
} from '@/utils/swap-matching';

/**
 * Fetch all necessary data for swap matching
 */
export const fetchAllData = async () => {
  try {
    // Fetch all shifts
    console.log('Fetching all shifts...');
    const shiftsResult = await fetchAllShifts();
    if (shiftsResult.error) {
      throw shiftsResult.error;
    }
    const allShifts = shiftsResult.data || [];
    console.log(`Fetched ${allShifts.length} shifts in total`);
    
    // Fetch all swap requests
    console.log('Fetching all swap requests...');
    const requestsResult = await fetchAllSwapRequests();
    if (requestsResult.error) {
      throw requestsResult.error;
    }
    const allRequests = requestsResult.data || [];
    console.log(`Fetched ${allRequests.length} swap requests in total`);
    
    // Fetch all preferred dates
    console.log('Fetching all preferred dates...');
    const datesResult = await fetchAllPreferredDates();
    if (datesResult.error) {
      throw datesResult.error;
    }
    const preferredDates = datesResult.data || [];
    console.log(`Fetched ${preferredDates.length} preferred dates in total`);
    
    // Basic validation of fetched data
    if (allRequests.length === 0) {
      return { success: false, message: "No pending swap requests found in the system" };
    }
    
    if (preferredDates.length === 0) {
      return { success: false, message: "No preferred dates found in the system" };
    }
    
    // Get profiles for all users
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
    
    // Add any embedded shifts from the request data
    const shiftMap = new Map();
    allShifts.forEach(shift => {
      shiftMap.set(shift.id, shift);
    });
    
    allRequests.forEach(request => {
      if (request._embedded_shift && request._embedded_shift.id) {
        shiftMap.set(request._embedded_shift.id, request._embedded_shift);
      }
    });
    
    const combinedShifts = Array.from(shiftMap.values());
    console.log(`Combined ${combinedShifts.length} shifts after adding embedded shift data`);
    
    return { 
      success: true, 
      allShifts: combinedShifts, 
      allRequests, 
      preferredDates, 
      profilesMap 
    };
  } catch (error: any) {
    console.error('Error fetching data for swap matching:', error);
    return { success: false, message: error.message, error };
  }
};

/**
 * Find potential matches among requests
 */
export const findMatches = (allRequests: any[], allShifts: any[], preferredDates: any[], profilesMap: Record<string, any>) => {
  // Prepare data structures for efficient matching
  const { 
    shiftsByDate, 
    shiftsByUser, 
    requestsByUser, 
    requestShifts, 
    preferredDatesByRequest 
  } = createLookupMaps(allRequests, allShifts, preferredDates);
  
  console.log('Data structures prepared for matching');
  console.log('Starting to process each request for potential matches...');
  
  // Temporary storage for matches
  const matches = [];
  
  // Filter for pending requests only 
  const pendingRequests = allRequests.filter(req => req.status === 'pending' && req.preferred_dates_count > 0);
  console.log(`Processing ${pendingRequests.length} pending requests with preferred dates`);
  
  // Process each request to find potential matches
  for (const request of pendingRequests) {
    // Get the shift for this request, checking for embedded data first
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
  return matches;
};

/**
 * Process and record the found matches
 */
export const processMatches = async (matches: any[], userId: string) => {
  for (const match of matches) {
    await recordShiftMatch(match.request, match.otherRequest, userId);
  }
  return matches.length;
};

// Helper function to determine shift type from start time
export const getShiftType = (startTime: string): "day" | "afternoon" | "night" => {
  const startHour = new Date(`2000-01-01T${startTime}`).getHours();
  
  if (startHour <= 8) {
    return 'day';
  } else if (startHour > 8 && startHour < 16) {
    return 'afternoon';
  } else {
    return 'night';
  }
};
