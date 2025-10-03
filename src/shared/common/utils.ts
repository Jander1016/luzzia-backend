export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const normalizedEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

export const convertDate = (dateStr: string): string => {
  const [dd, mm, yyyy] = dateStr.split('/');
  return `${yyyy}-${mm}-${dd}`; // "2025-09-27"
};

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return formatDate(date1) === formatDate(date2);
}