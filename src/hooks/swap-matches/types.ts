
export interface SwapMatch {
  id: string;
  status: string;
  myShift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    truckName: string | null;
    type: string;
  };
  otherShift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    truckName: string | null;
    type: string;
    userId: string;
    userName: string;
  };
  myRequestId: string;
  otherRequestId: string;
  createdAt: string;
}

export interface SwapMatchesState {
  matches: SwapMatch[];
  pastMatches: SwapMatch[];
  rawApiData: any;
  isLoading: boolean;
  error: Error | null;
}

export interface UseSwapMatchesReturn extends SwapMatchesState {
  fetchMatches: () => Promise<void>;
  acceptMatch: (matchId: string) => Promise<boolean>;
  completeMatch: (matchId: string) => Promise<boolean>;
}
