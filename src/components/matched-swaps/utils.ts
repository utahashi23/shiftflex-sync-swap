
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
    profilesMapKeys: Object.keys(profilesMap),
    currentUserId
  });

  // Store already processed request IDs to prevent duplicates
  const processedIds = new Set<string>();
  const result: MatchedSwap[] = [];

  for (const request of requests) {
    // Skip if we've already processed this request ID
    if (processedIds.has(request.id)) {
      console.log(`Skipping duplicate request ID: ${request.id}`);
      continue;
    }
    
    // Mark this request as processed
    processedIds.add(request.id);
    
    try {
      // Determine if the current user is the requester or acceptor
      const isRequester = request.requester_id === currentUserId;
      
      // Extract shift data from the joined request data
      const myShiftData = isRequester ? request.requester_shift : request.acceptor_shift;
      const theirShiftData = isRequester ? request.acceptor_shift : request.requester_shift;
      
      const myShiftId = isRequester ? request.requester_shift_id : request.acceptor_shift_id;
      const theirShiftId = isRequester ? request.acceptor_shift_id : request.requester_shift_id;
      
      console.log('Processing request:', {
        requestId: request.id,
        isRequester,
        myShiftId,
        theirShiftId,
        myShiftData: myShiftData ? 'present' : 'missing',
        theirShiftData: theirShiftData ? 'present' : 'missing'
      });
      
      // Try to find the shifts in the shifts array if they're not in the request
      const myShiftFromArray = shifts.find(s => s.id === myShiftId);
      const theirShiftFromArray = shifts.find(s => s.id === theirShiftId);
      
      // Use the available shift data or create default placeholder if missing
      const myShift = myShiftData || myShiftFromArray || {
        id: myShiftId,
        date: new Date().toISOString().split('T')[0],
        start_time: "09:00:00",
        end_time: "17:00:00",
        truck_name: "Unknown Truck"
      };
      
      const theirShift = theirShiftData || theirShiftFromArray || {
        id: theirShiftId,
        date: new Date().toISOString().split('T')[0],
        start_time: "09:00:00",
        end_time: "17:00:00",
        truck_name: "Unknown Truck"
      };
      
      const myUserId = isRequester ? request.requester_id : request.acceptor_id;
      const theirUserId = isRequester ? request.acceptor_id : request.requester_id;
      
      // Log the shift data we're using
      console.log('Using shift data:', {
        myShift: {
          id: myShift.id,
          date: myShift.date,
          start_time: myShift.start_time,
          end_time: myShift.end_time
        },
        theirShift: {
          id: theirShift.id,
          date: theirShift.date,
          start_time: theirShift.start_time,
          end_time: theirShift.end_time
        }
      });
      
      // Process my shift data
      const processedMyShift = {
        id: myShift.id || myShiftId || 'unknown',
        date: myShift.date,
        type: getShiftType(myShift.start_time),
        title: myShift.truck_name || "Your Shift",
        startTime: formatTime(myShift.start_time),
        endTime: formatTime(myShift.end_time),
        colleagueType: isRequester ? "Requester" : "Acceptor",
      };
      
      // Process their shift data
      const processedTheirShift = {
        id: theirShift.id || theirShiftId || 'unknown',
        date: theirShift.date,
        type: getShiftType(theirShift.start_time),
        title: theirShift.truck_name || "Their Shift",
        startTime: formatTime(theirShift.start_time),
        endTime: formatTime(theirShift.end_time),
        colleagueType: isRequester ? "Acceptor" : "Requester",
        colleague: getColleagueName(profilesMap, theirUserId || 'unknown')
      };
      
      result.push({
        id: request.id,
        originalShift: processedMyShift,
        matchedShift: processedTheirShift,
        status: request.status
      });
      
      console.log('Successfully processed match:', {
        id: request.id,
        originalShiftDate: processedMyShift.date,
        matchedShiftDate: processedTheirShift.date,
        originalShiftTime: `${processedMyShift.startTime}-${processedMyShift.endTime}`,
        matchedShiftTime: `${processedTheirShift.startTime}-${processedTheirShift.endTime}`
      });
    } catch (error) {
      console.error(`Error processing request ${request.id}:`, error);
    }
  }
  
  console.log(`Processed ${result.length} unique swap requests`);
  return result;
};
