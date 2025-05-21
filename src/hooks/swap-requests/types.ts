
export interface SwapRequest {
  id: string;
  requester_id: string;
  requester_shift_id: string;
  wanted_date: string;
  accepted_shift_types: string[];
  status: 'pending' | 'matched' | 'accepted' | 'confirmed' | 'completed';
  matched_with_id: string | null;
  created_at: string;
  updated_at: string;
  required_skillset?: string[] | null;
  shifts?: any;
  preferredDates?: PreferredDate[];
}

export interface PreferredDate {
  id: string;
  date: string;
  swap_id: string;
  created_at: string;
}

export interface DeletePreferredDateResult {
  success: boolean;
  requestDeleted?: boolean;
  error?: string;
  message?: string;
}
