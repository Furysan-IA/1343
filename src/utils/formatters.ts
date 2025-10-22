// Utility functions for formatting data

export const formatCuit = (cuit: string | number): string => {
  if (!cuit) return '';
  const str = cuit.toString();
  if (str.length !== 11) return str;
  return `${str.slice(0, 2)}-${str.slice(2, 10)}-${str.slice(10)}`;
};

export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('es-AR');
};

export const formatDateTime = (date: string | Date): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('es-AR');
};

/**
 * Formats a date string without timezone conversion
 * Use this for certificate dates stored as YYYY-MM-DD to avoid timezone shifts
 *
 * @param date - Date string in format YYYY-MM-DD or ISO timestamp
 * @param format - Output format: 'short' (DD/MM/YYYY) or 'long' (D de MMMM de YYYY)
 * @returns Formatted date string
 */
export const formatDateWithoutTimezone = (
  date: string | Date | null | undefined,
  format: 'short' | 'long' = 'short'
): string => {
  if (!date) return '-';

  try {
    // If it's a Date object, convert to ISO string first
    const dateStr = date instanceof Date ? date.toISOString() : date;

    // Extract date components directly from the string to avoid timezone conversion
    // Works with both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ss.sssZ' formats
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!match) {
      console.warn('Invalid date format:', dateStr);
      return '-';
    }

    const [, year, month, day] = match;
    const numericDay = parseInt(day, 10);
    const numericMonth = parseInt(month, 10);
    const numericYear = parseInt(year, 10);

    if (format === 'long') {
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      return `${numericDay} de ${months[numericMonth - 1]} de ${numericYear}`;
    }

    // Default: 'short' format DD/MM/YYYY
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return '-';
  }
};