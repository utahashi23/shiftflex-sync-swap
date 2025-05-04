
export interface MatchResult {
  isCompatible: boolean;
  reason?: string;
}

export interface RequestData {
  id: string;
  requester_id: string;
  _embedded_shift?: any;
}

export interface ShiftData {
  id: string;
  date: string;
  normalizedDate: string;
  type: string;
  start_time: string;
  end_time: string;
  user_id: string;
}

export interface MatchEntry {
  request: RequestData;
  otherRequest: RequestData;
}
