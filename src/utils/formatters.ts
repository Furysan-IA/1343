// Utility functions for formatting data

export const formatCuit = (cuit: string | number): string => {
  if (!cuit) return 'CAMPO NO ENCONTRADO';
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