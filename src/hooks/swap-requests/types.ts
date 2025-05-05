
// Define the structure of a preferred date in a swap request
export interface PreferredDate {
  id: string;
  date: string;
  acceptedTypes: ('day' | 'afternoon' | 'night')[];
}

// Define the structure of a swap request
export interface SwapRequest {
  id: string;
  requesterId: string;
  status: string;
  originalShift: {
    id: string;
    date: string;
    title: string;
    startTime: string;
    endTime: string;
    type: string;
    colleagueType?: string;
  };
  preferredDates: PreferredDate[];
}

// Define response type for getting user swap requests
export type GetUserSwapRequestsResponse = {
  data: SwapRequest[] | null;
  error: Error | null;
};

// Define request state for managing swap requests
export interface SwapRequestsState {
  swapRequests: SwapRequest[];
  isLoading: boolean;
  error: Error | null;
}
