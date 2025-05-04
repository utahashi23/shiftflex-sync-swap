
export const formatDateString = (year: number, month: number, day: number) => {
  const date = new Date(year, month, day);
  // Ensure we're using the local timezone for the date string
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  // Format as YYYY-MM-DD using local timezone components
  const y = localDate.getFullYear();
  const m = String(localDate.getMonth() + 1).padStart(2, '0');
  const d = String(localDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
