
import { ShiftDetail } from "./types";

// Format date to user-friendly string
export const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

// Get shift type label
export const getShiftTypeLabel = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// Process swap requests data
export const processSwapRequests = (
  requests: any[], 
  shifts: any[], 
  currentUserId: string
) => {
  return requests
    .map(request => {
      // Find the shifts
      const requesterShift = shifts.find(s => s.id === request.requester_shift_id);
      const acceptorShift = shifts.find(s => s.id === request.acceptor_shift_id);
      
      if (!requesterShift || !acceptorShift) return null;
      
      // Determine which shift is "mine" vs "theirs" based on who's viewing
      const isRequester = request.requester_id === currentUserId;
      const myShift = isRequester ? requesterShift : acceptorShift;
      const theirShift = isRequester ? acceptorShift : requesterShift;
      
      // Format the shift details
      const formatShift = (shift: any, isOriginal: boolean): ShiftDetail => {
        // Determine shift type
        let type = 'day';
        const startHour = new Date(`2000-01-01T${shift.start_time}`).getHours();
        
        if (startHour <= 8) {
          type = 'day';
        } else if (startHour > 8 && startHour < 16) {
          type = 'afternoon';
        } else {
          type = 'night';
        }
        
        // Get colleague name if available
        const hasProfile = shift.profiles && (shift.profiles.first_name || shift.profiles.last_name);
        const colleague = hasProfile 
          ? `${shift.profiles.first_name || ''} ${shift.profiles.last_name || ''}`.trim()
          : 'Unnamed Colleague';
          
        return {
          id: shift.id,
          date: shift.date,
          title: shift.truck_name || `Shift-${shift.id.substring(0, 5)}`,
          startTime: shift.start_time.substring(0, 5),
          endTime: shift.end_time.substring(0, 5),
          type,
          colleagueType: 'Unknown', // We don't have this info in the DB yet
          ...(isOriginal ? {} : { colleague })
        };
      };
      
      return {
        id: request.id,
        originalShift: formatShift(myShift, true),
        matchedShift: formatShift(theirShift, false),
        status: request.status
      };
    })
    .filter(Boolean);
};
