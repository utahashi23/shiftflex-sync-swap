
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

  // Create a map of all shifts by ID for faster lookup
  const shiftsById = shifts.reduce((map, shift) => {
    map[shift.id] = shift;
    return map;
  }, {} as Record<string, any>);

  // Create a hash map to track unique swap combinations
  // This is more reliable than just tracking IDs
  const uniqueSwapMap = new Map<string, MatchedSwap>();
  const result: MatchedSwap[] = [];

  for (const request of requests) {
    try {
      // Determine if the current user is the requester or acceptor
      const isRequester = request.requester_id === currentUserId;
      
      // Get the shift IDs
      const myShiftId = isRequester ? request.requester_shift_id : request.acceptor_shift_id;
      const theirShiftId = isRequester ? request.acceptor_shift_id : request.requester_shift_id;
      
      console.log('Processing request:', {
        requestId: request.id,
        isRequester,
        myShiftId,
        theirShiftId
      });
      
      // Get my shift data from the shifts array
      const myShift = shiftsById[myShiftId];
      
      // Get their shift data from the shifts array
      const theirShift = shiftsById[theirShiftId];
      
      // Skip if either shift is missing
      if (!myShift || !theirShift) {
        console.error('Missing shift data:', {
          myShiftId,
          theirShiftId,
          myShift: !!myShift,
          theirShift: !!theirShift
        });
        continue;
      }
      
      // Log the shift data we're using
      console.log('Using shift data:', {
        myShift: {
          id: myShift.id,
          date: myShift.date,
          start_time: myShift.start_time,
          end_time: myShift.end_time,
          truck_name: myShift.truck_name
        },
        theirShift: {
          id: theirShift.id,
          date: theirShift.date,
          start_time: theirShift.start_time,
          end_time: theirShift.end_time,
          truck_name: theirShift.truck_name
        }
      });
      
      const myUserId = isRequester ? request.requester_id : request.acceptor_id;
      const theirUserId = isRequester ? request.acceptor_id : request.requester_id;
      
      // Process my shift data
      const processedMyShift = {
        id: myShift.id,
        date: myShift.date,
        type: getShiftType(myShift.start_time),
        title: myShift.truck_name || "Your Shift",
        startTime: formatTime(myShift.start_time),
        endTime: formatTime(myShift.end_time),
        colleagueType: isRequester ? "Requester" : "Acceptor",
      };
      
      // Process their shift data
      const processedTheirShift = {
        id: theirShift.id,
        date: theirShift.date,
        type: getShiftType(theirShift.start_time),
        title: theirShift.truck_name || "Their Shift",
        startTime: formatTime(theirShift.start_time),
        endTime: formatTime(theirShift.end_time),
        colleagueType: isRequester ? "Acceptor" : "Requester",
        colleague: getColleagueName(profilesMap, theirUserId || 'unknown')
      };
      
      // Create a unique key for this swap based on the request ID AND both shift IDs
      // This ensures true uniqueness based on the actual swap - one request might appear multiple times
      const swapKey = `${request.id}`;
      
      // Only add this swap if we haven't processed this particular request yet
      if (!uniqueSwapMap.has(swapKey)) {
        const matchedSwap = {
          id: request.id,
          originalShift: processedMyShift,
          matchedShift: processedTheirShift,
          status: request.status
        };
        
        uniqueSwapMap.set(swapKey, matchedSwap);
        result.push(matchedSwap);
        
        console.log('Successfully processed match:', {
          id: request.id,
          originalShiftDate: processedMyShift.date,
          matchedShiftDate: processedTheirShift.date,
          originalShiftTime: `${processedMyShift.startTime}-${processedMyShift.endTime}`,
          matchedShiftTime: `${processedTheirShift.startTime}-${processedTheirShift.endTime}`
        });
      } else {
        console.log(`Skipping duplicate swap for request: ${swapKey}`);
      }
    } catch (error) {
      console.error(`Error processing request ${request.id}:`, error);
    }
  }
  
  console.log(`Processed ${result.length} unique swap requests`);
  return result;
};
