
import { SwapRequest } from './types';

// Format the received data into SwapRequest objects
export const formatSwapRequests = (data: any[]): SwapRequest[] => {
  const formattedRequests: SwapRequest[] = data.map((item: any) => {
    const shift = item.shift;
    const preferredDates = item.preferred_dates || [];
    
    if (!shift) return null;
    
    // Format preferred dates
    const formattedDates = preferredDates.map((date: any) => ({
      id: date.id,
      date: date.date,
      acceptedTypes: date.accepted_types as ("day" | "afternoon" | "night")[]
    }));
    
    return {
      id: item.id,
      requesterId: item.requester_id,
      status: item.status,
      originalShift: {
        id: shift.id,
        date: shift.date,
        title: shift.truckName || `Shift-${shift.id.substring(0, 5)}`,
        startTime: shift.startTime.substring(0, 5),
        endTime: shift.endTime.substring(0, 5),
        type: shift.type,
        colleagueType: shift.colleague_type || 'Unknown'
      },
      preferredDates: formattedDates
    };
  }).filter(Boolean) as SwapRequest[];
  
  return formattedRequests;
};
