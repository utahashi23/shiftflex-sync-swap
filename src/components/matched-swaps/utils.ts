
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
  if (!userId || !profilesMap[userId]) return 'Unknown';
  return `${profilesMap[userId].first_name || ''} ${profilesMap[userId].last_name || ''}`.trim() || 'Unknown';
};

export const processSwapRequests = (
  requests: any[], 
  shifts: any[], 
  currentUserId: string,
  profilesMap: Record<string, any>
): MatchedSwap[] => {
  // Create a hash map to track unique swap combinations to prevent duplicates
  const uniqueSwapMap = new Map<string, MatchedSwap>();
  const result: MatchedSwap[] = [];
  
  // Debug info
  console.log('Processing swap requests:', {
    requestsCount: requests.length,
    shiftsCount: shifts.length,
    profilesMapKeys: Object.keys(profilesMap),
    currentUserId
  });

  // Create a map for quick shift lookup
  const shiftsById = shifts.reduce((acc, shift) => {
    acc[shift.id] = shift;
    return acc;
  }, {} as Record<string, any>);

  for (const request of requests) {
    try {
      // Skip invalid requests
      if (!request.requester_id || !request.requester_shift_id) {
        console.log(`Skipping request ${request.id} - missing requester data`);
        continue;
      }

      // For matched requests, we need acceptor data
      if (request.status === 'matched' && (!request.acceptor_id || !request.acceptor_shift_id)) {
        console.log(`Skipping matched request ${request.id} - missing acceptor data`);
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
        theirShiftId
      });
      
      // Find the shift data in the shifts array using the map for better performance
      const myShift = shiftsById[myShiftId];
      const theirShift = shiftsById[theirShiftId];
      
      // Skip if we're missing required shift data
      if (!myShift || !theirShift) {
        console.log(`Skipping request ${request.id} - missing shift data`, { 
          myShiftFound: !!myShift, 
          theirShiftFound: !!theirShift 
        });
        continue;
      }
      
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
      
      // Get the user IDs
      const myUserId = isRequester ? request.requester_id : request.acceptor_id;
      const theirUserId = isRequester ? request.acceptor_id : request.requester_id;
      
      // Process my shift data
      const myShiftType = getShiftType(myShift.start_time);
      const processedMyShift = {
        id: myShift.id,
        date: myShift.date,
        type: myShiftType,
        title: myShift.truck_name || "Your Shift",
        startTime: formatTime(myShift.start_time),
        endTime: formatTime(myShift.end_time),
        colleagueType: isRequester ? "Requester" : "Acceptor",
      };
      
      // Process their shift data
      const theirShiftType = getShiftType(theirShift.start_time);
      const processedTheirShift = {
        id: theirShift.id,
        date: theirShift.date,
        type: theirShiftType,
        title: theirShift.truck_name || "Their Shift",
        startTime: formatTime(theirShift.start_time),
        endTime: formatTime(theirShift.end_time),
        colleagueType: isRequester ? "Acceptor" : "Requester",
        colleague: getColleagueName(profilesMap, theirUserId)
      };
      
      // Create a unique key for this swap based on both shift IDs and the request ID
      // This ensures we capture all matches while preventing duplicates of the exact same match
      const swapKey = `${request.id}-${myShift.id}-${theirShift.id}`;
      
      // Only add this swap if we haven't processed this exact combination yet
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
        console.log(`Skipping duplicate swap: ${swapKey}`);
      }
    } catch (error) {
      console.error(`Error processing request ${request.id}:`, error);
    }
  }
  
  console.log(`Processed ${result.length} unique swap requests`);
  return result;
};
