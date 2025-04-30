
import { CalendarShift } from '@/types/calendarTypes';

// Mock shift data with proper type annotations
export const mockShifts: CalendarShift[] = [
  { id: 1, date: '2025-05-01', title: '02-MAT01', startTime: '07:00', endTime: '15:00', type: 'day', colleagueType: 'Qualified' },
  { id: 2, date: '2025-05-03', title: '04-MAT03', startTime: '15:00', endTime: '23:00', type: 'afternoon', colleagueType: 'Graduate' },
  { id: 3, date: '2025-05-05', title: '09-MAT12', startTime: '23:00', endTime: '07:00', type: 'night', colleagueType: 'ACO' },
  { id: 4, date: '2025-05-07', title: '06-MAT07', startTime: '07:00', endTime: '15:00', type: 'day', colleagueType: 'Qualified' },
  { id: 5, date: '2025-05-10', title: '08-MAT11', startTime: '23:00', endTime: '07:00', type: 'night', colleagueType: 'ACO' },
  { id: 6, date: '2025-05-13', title: '02-MAT01', startTime: '15:00', endTime: '23:00', type: 'afternoon', colleagueType: 'Graduate' },
  { id: 7, date: '2025-05-18', title: '09-MAT12', startTime: '07:00', endTime: '15:00', type: 'day', colleagueType: 'Qualified' },
  { id: 8, date: '2025-05-21', title: '04-MAT03', startTime: '23:00', endTime: '07:00', type: 'night', colleagueType: 'Graduate' },
  { id: 9, date: '2025-05-25', title: '06-MAT07', startTime: '15:00', endTime: '23:00', type: 'afternoon', colleagueType: 'ACO' },
  { id: 10, date: '2025-05-28', title: '08-MAT11', startTime: '07:00', endTime: '15:00', type: 'day', colleagueType: 'Qualified' },
];

// Fetch calendar shifts
export const fetchCalendarShifts = async (userId: string | undefined): Promise<CalendarShift[]> => {
  // In a real app, this would fetch from Supabase
  // const { data, error } = await supabase
  //   .from('shifts')
  //   .select('*')
  //   .eq('user_id', userId);
  
  // For now, return mock data
  await new Promise(resolve => setTimeout(resolve, 800));
  return mockShifts;
};
