
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
