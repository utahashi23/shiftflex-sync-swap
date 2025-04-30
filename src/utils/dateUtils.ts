
/**
 * Utility functions for date operations
 */

/**
 * Returns the number of days in a given month
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Returns the day of the week for the first day of the month (0-6, where 0 is Sunday)
 */
export const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

/**
 * Formats a date as YYYY-MM-DD
 */
export const formatDateString = (year: number, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Generate start and end dates for a month
 */
export const getMonthDateRange = (date: Date): { startDate: string, endDate: string } => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-based
  
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  return { startDate, endDate };
};

/**
 * Check if a shift start time falls within a specific shift type based on hour
 */
export const getShiftType = (startTime: string): 'day' | 'afternoon' | 'night' => {
  const startHour = new Date(`2000-01-01T${startTime}`).getHours();
  
  if (startHour <= 8) {
    return 'day';
  } else if (startHour > 8 && startHour < 16) {
    return 'afternoon';
  } else {
    return 'night';
  }
};
