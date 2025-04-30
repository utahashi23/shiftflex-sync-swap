
// Custom type definitions for our database tables
export type AppRole = 'admin' | 'user';

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  employee_id: string | null;
  organization: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Shift {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  truck_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftSwapRequest {
  id: string;
  requester_id: string;
  requester_shift_id: string;
  acceptor_id: string | null;
  acceptor_shift_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TruckName {
  id: string;
  name: string;
  status: string;
  created_at: string;
}
