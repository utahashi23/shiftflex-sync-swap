
export interface PreferredDate {
  id: string;
  date: string;
  accepted_types?: string[];
  acceptedTypes?: string[];
}

export interface Shift {
  id: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  truck_name?: string;
  colleagueType?: string;
}

export interface SwapRequest {
  id: string;
  requester_id?: string;
  requesterId?: string;
  requester_shift_id?: string;
  requesterShiftId?: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  preferredDates: PreferredDate[];
  shifts?: Shift; // Needed for accessing the shift property
  originalShift?: {
    id: string;
    date: string;
    title?: string;
    startTime?: string;
    endTime?: string;
    type?: string;
  };
}

export interface GetSwapRequestsResult {
  requests: SwapRequest[];
  error?: string;
}

export interface DeleteSwapRequestResult {
  success: boolean;
  error?: string;
}

export interface DeletePreferredDateResult {
  success: boolean;
  requestDeleted?: boolean;
  error?: string;
}
