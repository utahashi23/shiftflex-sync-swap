
export interface MatchTestResult {
  request1Id: string;
  request2Id: string;
  request1ShiftDate: string;
  request2ShiftDate: string;
  matchReason: string;
  // Additional data for displaying shift details
  request1Shift?: any;
  request2Shift?: any;
  request1User?: any;
  request2User?: any;
}

export interface SwapRequestWithDetails {
  id: string;
  requester_id: string;
  requester_shift_id: string;
  status: string;
  shift_date: string;
  preferred_dates_count: number;
  shift?: any;
  user?: { first_name: string; last_name: string };
}
