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
