
export interface SwapMatch {
  id: string;
  status: "pending" | "accepted" | "completed" | "other_accepted";
  myShift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    truckName?: string;
    type: string;
    colleagueType: string;
    employeeId?: string;
  };
  otherShift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    truckName?: string;
    type: string;
    userId: string;
    userName: string;
    colleagueType: string;
    employeeId?: string;
  };
  myRequestId: string;
  otherRequestId: string;
  requesterId?: string; // ID of the user who initiated this swap
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
  fetchMatches: (userPerspectiveOnly?: boolean, userInitiatorOnly?: boolean) => Promise<void>;
  acceptMatch: (matchId: string) => Promise<boolean>;
  cancelMatch: (matchId: string) => Promise<boolean>;
  finalizeMatch: (matchId: string) => Promise<boolean>;
  completeMatch: (matchId: string) => Promise<boolean>;
}
