
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
  fetchSwapRequests: () => Promise<void>;
  handleDeleteSwapRequest: (requestId: string) => Promise<void>;
  handleDeletePreferredDate: (dateId: string, requestId: string) => Promise<void>;
}
