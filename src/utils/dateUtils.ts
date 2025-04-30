export const formatDateString = (year: number, month: number, day: number) => {
  const date = new Date(year, month, day);
  return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
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
