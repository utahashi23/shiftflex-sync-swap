
import { MatchedSwap } from "./types";
import { getShiftType } from "@/utils/shiftUtils";
import { formatTime } from "@/utils/dateUtils";

export const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

export const getShiftTypeLabel = (type: string) => {
  switch (type) {
    case 'day':
      return 'Day Shift';
    case 'afternoon':
      return 'Afternoon Shift';
    case 'night':
      return 'Night Shift';
    default:
      return 'Unknown Shift';
  }
};

export const getColleagueName = (profilesMap: Record<string, any>, userId: string) => {
  if (!profilesMap[userId]) return 'Unknown';
  return `${profilesMap[userId].first_name || ''} ${profilesMap[userId].last_name || ''}`.trim() || 'Unknown';
};

export const processSwapRequests = (
  requests: any[], 
  shifts: any[], 
  currentUserId: string,
  profilesMap: Record<string, any>
): MatchedSwap[] => {
  // Log the incoming data to help with debugging
  console.log('Processing swap requests:', {
    requestsCount: requests.length,
    shiftsCount: shifts.length,
    profilesMapKeys: Object.keys(profilesMap)
  });

  // CRITICAL FIX: Track processed requests by a unique identifier 
  // that accounts for both request ID AND user perspective
  const processedKeys = new Set<string>();
  const result: MatchedSwap[] = [];

  for (const request of requests) {
    // Determine if the current user is the requester or acceptor
    const isRequester = request.requester_id === currentUserId;
    
    // Create a unique key that includes both request ID and user perspective
    // This ensures each request is only processed once per user perspective
    const uniqueKey = `${request.id}-${isRequester ? 'requester' : 'acceptor'}`;
    
    // Skip if we've already processed this specific request from this perspective
    if (processedKeys.has(uniqueKey)) {
      console.log(`Skipping duplicate request: ${uniqueKey}`);
      continue;
    }
    
    // Mark this request as processed
    processedKeys.add(uniqueKey);
    
    try {
      // Extract shift data from the joined request data
      const myShiftData = isRequester ? request.requester_shift : request.acceptor_shift;
      const theirShiftData = isRequester ? request.acceptor_shift : request.requester_shift;
      
      const myShiftId = isRequester ? request.requester_shift_id : request.acceptor_shift_id;
      const theirShiftId = isRequester ? request.acceptor_shift_id : request.requester_shift_id;
      
      // Try to find the shifts in the shifts array if they're not in the request
      const myShift = myShiftData || shifts.find(s => s.id === myShiftId) || {
        id: myShiftId,
        date: new Date().toISOString().split('T')[0],
        start_time: "09:00:00",
        end_time: "17:00:00"
      };
      
      const theirShift = theirShiftData || shifts.find(s => s.id === theirShiftId) || {
        id: theirShiftId,
        date: new Date().toISOString().split('T')[0],
        start_time: "09:00:00",
        end_time: "17:00:00"
      };
      
      const myUserId = isRequester ? request.requester_id : request.acceptor_id;
      const theirUserId = isRequester ? request.acceptor_id : request.requester_id;
      
      // Fix: Ensure we have valid date and time strings
      const myDate = myShift.date ? myShift.date : new Date().toISOString().split('T')[0];
      const theirDate = theirShift.date ? theirShift.date : new Date().toISOString().split('T')[0];
      const myStartTime = myShift.start_time || "09:00:00";
      const myEndTime = myShift.end_time || "17:00:00";
      const theirStartTime = theirShift.start_time || "09:00:00";
      const theirEndTime = theirShift.end_time || "17:00:00";
      
      const processedMyShift = {
        id: myShift.id || myShiftId || 'unknown',
        date: myDate,
        type: getShiftType(myStartTime),
        title: myShift.truck_name || "Your Shift",
        startTime: formatTime(myStartTime),
        endTime: formatTime(myEndTime),
        colleagueType: isRequester ? "Requester" : "Acceptor",
      };
      
      const processedTheirShift = {
        id: theirShift.id || theirShiftId || 'unknown',
        date: theirDate,
        type: getShiftType(theirStartTime),
        title: theirShift.truck_name || "Their Shift",
        startTime: formatTime(theirStartTime),
        endTime: formatTime(theirEndTime),
        colleagueType: isRequester ? "Acceptor" : "Requester",
        colleague: getColleagueName(profilesMap, theirUserId || 'unknown')
      };
      
      result.push({
        id: request.id,
        originalShift: processedMyShift,
        matchedShift: processedTheirShift,
        status: request.status
      });
      
      // Log successful processing
      console.log(`Successfully processed request ${request.id}`, {
        originalShiftDate: processedMyShift.date,
        matchedShiftDate: processedTheirShift.date
      });
    } catch (error) {
      console.error(`Error processing request ${request.id}:`, error);
    }
  }
  
  console.log(`Processed ${result.length} unique swap requests`);
  return result;
};
