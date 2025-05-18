
/**
 * Get the number of days in a month
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Get the first day of the month
 */
export const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

/**
 * Format a date string
 */
export const formatDateString = (year: number, month: number, day: number): string => {
  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
};

/**
 * Get the start and end dates for a given month
 */
export const getMonthDateRange = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
  
  return { startDate, endDate };
};

/**
 * Normalize a date string to YYYY-MM-DD format
 * Handles different date formats and ensures consistency
 */
export const normalizeDate = (date: string): string => {
  if (!date) return '';
  
  try {
    // Check if already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // Handle various date formats
    const parsedDate = new Date(date);
    
    if (isNaN(parsedDate.getTime())) {
      console.error('Invalid date format:', date);
      return date; // Return original if parsing fails
    }
    
    // Format to YYYY-MM-DD
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error normalizing date:', error);
    return date; // Return original if processing fails
  }
};

/**
 * Compare two dates for equality (ignoring time)
 */
export const areDatesEqual = (date1: string | undefined, date2: string | undefined): boolean => {
  if (!date1 || !date2) return false;
  
  const normalizedDate1 = normalizeDate(date1);
  const normalizedDate2 = normalizeDate(date2);
  
  return normalizedDate1 === normalizedDate2;
};

/**
 * Format time from database format (HH:MM:SS) to display format (HH:MM AM/PM)
 */
export const formatTime = (timeStr: string): string => {
  if (!timeStr) return '';
  
  try {
    // Handle both HH:MM:SS and HH:MM formats
    const timeParts = timeStr.split(':');
    let hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    
    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    
    // Format with leading zeros
    const formattedHours = hours.toString();
    const formattedMinutes = minutes.toString().padStart(2, '0');
    
    return `${formattedHours}:${formattedMinutes} ${period}`;
  } catch (e) {
    console.error('Error formatting time:', e);
    return timeStr;
  }
};
