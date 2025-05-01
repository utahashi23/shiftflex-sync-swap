
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
  shiftsMap: Record<string, any>, 
  currentUserId: string,
  profilesMap: Record<string, any>
): MatchedSwap[] => {
  // Log the incoming data to help with debugging
  console.log('Processing swap requests:', {
    requestsCount: requests.length,
    shiftsMapKeys: Object.keys(shiftsMap),
    profilesMapKeys: Object.keys(profilesMap),
    currentUserId
  });

  // Track unique requests by ID to avoid duplicates
  const processedRequests = new Set<string>();
  const result: MatchedSwap[] = [];

  for (const request of requests) {
    try {
      // Skip if we've already processed this request
      if (processedRequests.has(request.id)) {
        console.log(`Skipping duplicate request ID: ${request.id}`);
        continue;
      }
      
      // Mark this request as processed
      processedRequests.add(request.id);
      
      // Determine if the current user is the requester or acceptor
      const isRequester = request.requester_id === currentUserId;
      
      // Get shift IDs based on user role in this swap
      const myShiftId = isRequester ? request.requester_shift_id : request.acceptor_shift_id;
      const theirShiftId = isRequester ? request.acceptor_shift_id : request.requester_shift_id;
      
      const theirUserId = isRequester ? request.acceptor_id : request.requester_id;
      
      // Log the shift IDs we're looking for
      console.log('Looking for shifts:', {
        requestId: request.id,
        myShiftId,
        theirShiftId,
        myShiftExists: shiftsMap[myShiftId] ? 'yes' : 'no',
        theirShiftExists: shiftsMap[theirShiftId] ? 'yes' : 'no',
        isRequester
      });
      
      // Get shifts from the shifts map - this is the most reliable source
      const myShift = shiftsMap[myShiftId];
      const theirShift = shiftsMap[theirShiftId];
      
      // Skip if essential shift data is missing
      if (!myShift || !theirShift) {
        console.log(`Skipping request ${request.id} due to missing shift data:`, {
          myShiftMissing: !myShift,
          theirShiftMissing: !theirShift
        });
        continue;
      }
      
      // Process my shift
      const processedMyShift = {
        id: myShift.id,
        date: myShift.date,
        type: getShiftType(myShift.start_time),
        title: myShift.truck_name || "Your Shift",
        startTime: formatTime(myShift.start_time),
        endTime: formatTime(myShift.end_time),
        colleagueType: isRequester ? "Requester" : "Acceptor",
      };
      
      // Process their shift
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
      
      // Create the matched swap entry
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
