
export interface PreferredDate {
  id: string;
  date: string;
  acceptedTypes: ("day" | "afternoon" | "night")[];
}

export interface SwapRequest {
  id: string;
  status: string;
  originalShift: {
    id: string;
    date: string;
    title: string;
    startTime: string;
    endTime: string;
    type: string;
  };
  preferredDates: PreferredDate[];
  requesterId: string;
  acceptedByOthers: boolean; // Flag to indicate if this request has been accepted by others
  acceptedMatchId: string | null; // Reference to the accepted match if available
}

export interface UseSwapRequestsReturn {
  swapRequests: SwapRequest[];
  isLoading: boolean;
  fetchSwapRequests: () => Promise<void>;
  deleteSwapRequest: (requestId: string) => Promise<boolean>;
  deletePreferredDay: (dayId: string, requestId: string) => Promise<boolean>;
}
