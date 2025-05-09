
export interface PreferredDate {
  id: string;
  date: string;
  acceptedTypes: string[];
}

export interface SwapRequest {
  id: string;
  status: string;
  requesterId: string;
  originalShift: {
    id: string;
    date: string;
    title: string;
    startTime: string;
    endTime: string;
    type: string;
    colleagueType: string; // Add this field to fix the type error
  };
  preferredDates: PreferredDate[];
}
