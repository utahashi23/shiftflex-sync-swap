
// Type definitions for swap requests

export interface SwapRequest {
  id: string;
  requester_id: string;
  requester_shift_id: string;
  status: string;
  created_at: string;
  updated_at?: string;
  acceptor_id?: string;
  acceptor_shift_id?: string;
  preferred_dates?: PreferredDate[];
  preferred_dates_count?: number;
  required_skillset?: string[];
}

export interface PreferredDate {
  id: string;
  date: string;
  request_id?: string;
  accepted_types?: string[];
}

export interface DeletePreferredDateResult {
  success: boolean;
  error?: string;
  requestDeleted?: boolean;
  message?: string;
}

export interface CreateSwapRequestParams {
  shiftId: string;
  preferredDates: {
    date: string;
    acceptedTypes: string[];
  }[];
  requiredSkillset?: string[];
}
