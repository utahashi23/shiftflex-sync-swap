
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
 * IMPROVED: More robust handling for various date formats
 */
export const normalizeDate = (date: string | Date): string => {
  if (!date) return '';
  
  try {
    // Handle Date objects
    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // For string inputs
    const dateStr = String(date).trim();
    
    // Check if already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Validate the date is actually valid
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed month
      const day = parseInt(parts[2], 10);
      
      const dateObj = new Date(year, month, day);
      if (
        dateObj.getFullYear() === year &&
        dateObj.getMonth() === month &&
        dateObj.getDate() === day
      ) {
        return dateStr; // Valid date in correct format
      }
    }
    
    // Handle various date formats
    const parsedDate = new Date(dateStr);
    
    if (isNaN(parsedDate.getTime())) {
      console.error('Invalid date format:', dateStr);
      return dateStr; // Return original if parsing fails
    }
    
    // Format to YYYY-MM-DD
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error normalizing date:', error);
    return typeof date === 'string' ? date : ''; // Return original if processing fails
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

/**
 * Parse date in any format and convert to Date object
 * This is a utility function to ensure consistent date handling
 */
export const parseDateSafely = (date: any): Date | null => {
  if (!date) return null;
  
  try {
    // If already a Date object
    if (date instanceof Date) return date;
    
    // Handle string formats
    if (typeof date === 'string') {
      const normalized = normalizeDate(date);
      // Try to create a date from normalized format
      const result = new Date(normalized);
      if (!isNaN(result.getTime())) {
        return result;
      }
    }
    
    // Last attempt with native parsing
    const fallback = new Date(date);
    if (!isNaN(fallback.getTime())) {
      return fallback;
    }
    
    console.error('Could not parse date:', date);
    return null;
  } catch (e) {
    console.error('Error parsing date:', e, date);
    return null;
  }
};
