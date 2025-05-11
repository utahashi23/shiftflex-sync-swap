

export interface LeaveBlock {
  id: string;
  block_number: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export interface UserLeaveBlock {
  id: string;
  user_id: string;
  leave_block_id: string;
  block_number: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export interface LeaveSwapRequest {
  id: string;
  requester_id: string;
  requester_leave_block_id: string;
  requested_leave_block_id: string;
  status: string;
  created_at: string;
  requester_leave_block?: LeaveBlock;
  requested_leave_block?: LeaveBlock;
}

export interface LeaveSwapMatch {
  match_id: string;
  match_status: string;
  created_at: string;
  my_leave_block_id: string;
  my_block_number: number;
  my_start_date: string;
  my_end_date: string;
  other_leave_block_id: string;
  other_block_number: number;
  other_start_date: string;
  other_end_date: string;
  other_user_id: string;
  other_user_name: string;
  other_employee_id: string;
  is_requester: boolean;
  my_user_name: string;
  my_employee_id: string;
}
