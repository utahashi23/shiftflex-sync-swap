
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
  // Create a hash map to track unique swap combinations
  const uniqueSwapMap = new Map<string, MatchedSwap>();
  const result: MatchedSwap[] = [];
  
  // Debug info
  console.log('Processing swap requests:', {
    requestsCount: requests.length,
    shiftsCount: shifts.length,
    profilesMapKeys: Object.keys(profilesMap),
    currentUserId
  });

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
      
      // Find the shift data in the shifts array
      const myShift = shifts.find((s: any) => s.id === myShiftId);
      const theirShift = shifts.find((s: any) => s.id === theirShiftId);
      
      // If we're missing shift data, use defaults
      const myShiftData = myShift || {
        id: myShiftId,
        date: new Date().toISOString().split('T')[0],
        start_time: "09:00:00",
        end_time: "17:00:00",
        truck_name: "Unknown Shift"
      };
      
      const theirShiftData = theirShift || {
        id: theirShiftId,
        date: new Date().toISOString().split('T')[0],
        start_time: "09:00:00",
        end_time: "17:00:00",
        truck_name: "Unknown Shift"
      };
      
      // Get the user IDs
      const myUserId = isRequester ? request.requester_id : request.acceptor_id;
      const theirUserId = isRequester ? request.acceptor_id : request.requester_id;
      
      if (!theirUserId) {
        console.log(`Skipping request ${request.id} - missing colleague ID`);
        continue;
      }
      
      console.log('Using shift data:', {
        myShift: {
          id: myShiftData.id,
          date: myShiftData.date,
          start_time: myShiftData.start_time,
          end_time: myShiftData.end_time
        },
        theirShift: {
          id: theirShiftData.id,
          date: theirShiftData.date,
          start_time: theirShiftData.start_time,
          end_time: theirShiftData.end_time
        }
      });
      
      // Process my shift data
      const myShiftType = getShiftType(myShiftData.start_time);
      const processedMyShift = {
        id: myShiftData.id || myShiftId || 'unknown',
        date: myShiftData.date,
        type: myShiftType,
        title: myShiftData.truck_name || "Your Shift",
        startTime: formatTime(myShiftData.start_time),
        endTime: formatTime(myShiftData.end_time),
        colleagueType: isRequester ? "Requester" : "Acceptor",
      };
      
      // Process their shift data
      const theirShiftType = getShiftType(theirShiftData.start_time);
      const processedTheirShift = {
        id: theirShiftData.id || theirShiftId || 'unknown',
        date: theirShiftData.date,
        type: theirShiftType,
        title: theirShiftData.truck_name || "Their Shift",
        startTime: formatTime(theirShiftData.start_time),
        endTime: formatTime(theirShiftData.end_time),
        colleagueType: isRequester ? "Acceptor" : "Requester",
        colleague: getColleagueName(profilesMap, theirUserId)
      };
      
      // Create a unique key for this swap based on both shift IDs
      // Only care about the shift IDs, not who's requesting what
      const shiftIds = [myShiftData.id, theirShiftData.id].sort();
      const swapKey = `${shiftIds[0]}-${shiftIds[1]}`;
      
      // Only add this swap if we haven't processed this shift pair yet
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
        console.log(`Skipping duplicate swap for shift pair: ${swapKey}`);
      }
    } catch (error) {
      console.error(`Error processing request ${request.id}:`, error);
    }
  }
  
  console.log(`Processed ${result.length} unique swap requests`);
  return result;
};
