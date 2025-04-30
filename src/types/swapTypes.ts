
// Types for swap requests
export interface ShiftData {
  id: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'day' | 'afternoon' | 'night';
}

export interface SwapRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  requestDate: string;
  requesterShift: ShiftData;
  acceptableShifts: {
    types: string[];
    dates: string[];
  };
}
