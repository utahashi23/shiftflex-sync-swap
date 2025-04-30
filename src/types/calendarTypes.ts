
// Types for calendar shifts
export interface CalendarShift {
  id: number | string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'day' | 'afternoon' | 'night';
  colleagueType: 'Qualified' | 'Graduate' | 'ACO' | 'Unknown';
  location?: string;
}
