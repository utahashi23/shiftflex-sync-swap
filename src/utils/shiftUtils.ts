
import { format, parseISO } from 'date-fns';

/**
 * Determine shift type based on start time
 */
export const getShiftType = (startTime: string | null | undefined): 'day' | 'afternoon' | 'night' => {
  if (!startTime) return 'day';
  
  try {
    const timeStr = startTime.substring(0, 5); // Extract HH:MM
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    if (hours < 12) {
      return 'day';
    } else if (hours < 17) {
      return 'afternoon';
    } else {
      return 'night';
    }
  } catch (err) {
    console.error('Error parsing shift time:', err);
    return 'day'; // Default to day shift if parsing fails
  }
};

/**
 * Format a date string safely
 */
export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'Unknown date';
  try {
    return format(parseISO(dateStr), 'PPP');
  } catch (e) {
    console.error(`Error formatting date: ${dateStr}`, e);
    return 'Invalid date';
  }
};

/**
 * Format a time string safely
 */
export const formatTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '';
  
  try {
    if (timeStr.length >= 5) {
      return timeStr.substring(0, 5);
    }
    return timeStr;
  } catch (e) {
    return '';
  }
};
