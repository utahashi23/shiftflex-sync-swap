
// Format a date to YYYY-MM-DD string
export const formatDateString = (year: number, month: number, day: number) => {
  // Create the date object using local timezone
  const date = new Date(year, month, day);
  
  // Format as YYYY-MM-DD using local timezone components
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Normalize any date string to YYYY-MM-DD in local timezone
export const normalizeDate = (dateString: string): string => {
  const date = new Date(dateString);
  return formatDateString(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
};

export const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

// Function to get the start and end date of a month
export const getMonthDateRange = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // First day of the month
  const startDate = formatDateString(year, month, 1);
  
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = formatDateString(year, month, lastDay);
  
  return { startDate, endDate };
};

// Format time from ISO or time string to readable time (e.g. "9:00 AM")
export const formatTime = (timeStr: string): string => {
  if (!timeStr) return '';
  
  let hours: number;
  let minutes: number;
  
  // Handle ISO date strings
  if (timeStr.includes('T')) {
    const date = new Date(timeStr);
    hours = date.getHours();
    minutes = date.getMinutes();
  } else {
    // Handle time strings like "09:00:00"
    const timeParts = timeStr.split(':');
    hours = parseInt(timeParts[0], 10);
    minutes = parseInt(timeParts[1], 10);
  }
  
  // Convert to 12 hour format with AM/PM
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // Handle midnight (0) as 12
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  
  return `${hours}:${minutesStr} ${ampm}`;
};
