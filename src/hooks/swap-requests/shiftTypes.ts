
// Define shift types as a union of string literals
export type ShiftType = "day" | "afternoon" | "night";

// Types for the swap matching algorithm
export interface ShiftWithType {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  truck_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  type: ShiftType;
}

export interface SwapRequestWithShift {
  id: string;
  shiftId: string;
  shift: ShiftWithType;
  preferredDates: {
    id: string;
    date: string;
    acceptedTypes: ShiftType[];
  }[];
}

export interface UserRequestMap {
  [userId: string]: SwapRequestWithShift[];
}

export interface ShiftsById {
  [shiftId: string]: ShiftWithType;
}

export interface UserRosteredDates {
  [userId: string]: Set<string>;
}
