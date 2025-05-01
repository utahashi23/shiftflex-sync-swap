
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
  // Used to track unique request IDs to prevent duplicates
  const processedRequestIds = new Set<string>();
  const result: MatchedSwap[] = [];

  // Log the incoming data to help with debugging
  console.log('Processing swap requests:', {
    requestsCount: requests.length,
    shiftsCount: shifts.length,
    profilesMapKeys: Object.keys(profilesMap)
  });

  for (const request of requests) {
    // Skip if we've already processed this request
    if (processedRequestIds.has(request.id)) {
      continue;
    }
    
    // Mark this request as processed to prevent duplicates
    processedRequestIds.add(request.id);
    
    try {
      // Determine if the current user is the requester or acceptor
      const isRequester = request.requester_id === currentUserId;
      
      // Extract shift data from the joined request data
      const myShiftData = isRequester ? request.requester_shift : request.acceptor_shift;
      const theirShiftData = isRequester ? request.acceptor_shift : request.requester_shift;
      
      // Skip if missing shift data, but log it for debugging
      if (!myShiftData || !theirShiftData) {
        console.log(`Missing shift data for request: ${request.id}`);
        
        // Try to create placeholder shift data for display purposes
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
        
        const processedMyShift = {
          id: myShift.id || myShiftId || 'unknown',
          date: myShift.date || new Date().toISOString().split('T')[0],
          type: getShiftType(myShift.start_time || "09:00:00"),
          title: "Your Shift",
          startTime: formatTime(myShift.start_time || "09:00:00"),
          endTime: formatTime(myShift.end_time || "17:00:00"),
          colleagueType: isRequester ? "Requester" : "Acceptor",
        };
        
        const processedTheirShift = {
          id: theirShift.id || theirShiftId || 'unknown',
          date: theirShift.date || new Date().toISOString().split('T')[0],
          type: getShiftType(theirShift.start_time || "09:00:00"),
          title: "Their Shift",
          startTime: formatTime(theirShift.start_time || "09:00:00"),
          endTime: formatTime(theirShift.end_time || "17:00:00"),
          colleagueType: isRequester ? "Acceptor" : "Requester",
          colleague: getColleagueName(profilesMap, theirUserId || 'unknown')
        };
        
        result.push({
          id: request.id,
          originalShift: processedMyShift,
          matchedShift: processedTheirShift,
          status: request.status
        });
        
        continue;
      }
      
      const myUserId = isRequester ? request.requester_id : request.acceptor_id;
      const theirUserId = isRequester ? request.acceptor_id : request.requester_id;
      
      const myShift = {
        id: myShiftData.id,
        date: myShiftData.date,
        type: getShiftType(myShiftData.start_time),
        title: myShiftData.truck_name || "Your Shift",
        startTime: formatTime(myShiftData.start_time),
        endTime: formatTime(myShiftData.end_time),
        colleagueType: isRequester ? "Requester" : "Acceptor",
      };
      
      const theirShift = {
        id: theirShiftData.id,
        date: theirShiftData.date,
        type: getShiftType(theirShiftData.start_time),
        title: theirShiftData.truck_name || "Their Shift",
        startTime: formatTime(theirShiftData.start_time),
        endTime: formatTime(theirShiftData.end_time),
        colleagueType: isRequester ? "Acceptor" : "Requester",
        colleague: getColleagueName(profilesMap, theirUserId)
      };
      
      result.push({
        id: request.id,
        originalShift: myShift,
        matchedShift: theirShift,
        status: request.status
      });
    } catch (error) {
      console.error(`Error processing request ${request.id}:`, error);
    }
  }
  
  return result;
};
