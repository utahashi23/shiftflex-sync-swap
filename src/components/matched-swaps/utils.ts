
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
  // Create a map of all shifts by ID for faster lookup
  const shiftsById = shifts.reduce((map, shift) => {
    map[shift.id] = shift;
    return map;
  }, {} as Record<string, any>);

  // Create a Set to track processed request IDs to prevent duplicates
  const processedRequestIds = new Set<string>();
  const result: MatchedSwap[] = [];

  console.log(`Processing ${requests.length} swap requests with ${shifts.length} shifts available`);

  for (const request of requests) {
    try {
      // Skip if we've already processed this request
      if (processedRequestIds.has(request.id)) {
        console.log(`Skipping already processed request: ${request.id}`);
        continue;
      }

      // Determine if the current user is the requester or acceptor
      const isRequester = request.requester_id === currentUserId;
      
      // Get the shift IDs
      const myShiftId = isRequester ? request.requester_shift_id : request.acceptor_shift_id;
      const theirShiftId = isRequester ? request.acceptor_shift_id : request.requester_shift_id;
      
      console.log('Processing request:', {
        requestId: request.id,
        isRequester,
        myShiftId,
        theirShiftId,
        myShiftData: shiftsById[myShiftId] ? 'present' : 'missing',
        theirShiftData: shiftsById[theirShiftId] ? 'present' : 'missing'
      });
      
      // Get my shift data from the shifts map
      const myShift = shiftsById[myShiftId];
      
      // Get their shift data from the shifts map
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
      
      // Mark this request as processed
      processedRequestIds.add(request.id);
      
      // Create the matched swap object
      const matchedSwap = {
        id: request.id,
        originalShift: processedMyShift,
        matchedShift: processedTheirShift,
        status: request.status
      };
      
      result.push(matchedSwap);
      
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
