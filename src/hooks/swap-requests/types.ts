
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
}

export interface UseSwapRequestsReturn {
  swapRequests: SwapRequest[];
  isLoading: boolean;
  fetchSwapRequests: (status?: string) => Promise<void>;
  deleteSwapRequest: (requestId: string) => Promise<boolean>;
  deletePreferredDay: (dayId: string, requestId: string) => Promise<boolean>;
}
