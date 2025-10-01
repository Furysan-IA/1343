import * as XLSX from 'xlsx';

export interface ValidationError {
  row?: number;
  field?: string;
  message: string;
  type: 'error' | 'warning';
}

export interface ClientRecord {
  cuit: string;
  razon_social: string;
  email: string;
  telefono?: string;
  direccion: string;
  contacto?: string;
  last_modified?: string;
}

export interface ParsedData {
  records: ClientRecord[];
  errors: ValidationError[];
  warnings: ValidationError[];
  metadata: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    fileName: string;
    fileSize: number;
  };
}

const REQUIRED_COLUMNS = ['cuit', 'razon_social', 'email', 'direccion'];
const OPTIONAL_COLUMNS = ['telefono', 'contacto', 'last_modified'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_ROWS = 10000;

const normalizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n');
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateCuit = (cuit: string): boolean => {
  const cleanCuit = cuit.toString().replace(/[-\s]/g, '');
  return /^\d{11}$/.test(cleanCuit);
};

const validatePhone = (phone: string): boolean => {
  if (!phone) return true;
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  return /^\+?\d{8,15}$/.test(cleanPhone);
};

export const validateFile = (file: File): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (file.size > MAX_FILE_SIZE) {
    errors.push({
      message: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      type: 'error',
    });
  }

  const validExtensions = ['.xlsx', '.xls', '.csv'];
  const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (!validExtensions.includes(fileExtension)) {
    errors.push({
      message: `Formato de archivo no soportado. Use: ${validExtensions.join(', ')}`,
      type: 'error',
    });
  }

  return errors;
};

export const parseFile = async (file: File): Promise<ParsedData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(firstSheet, {
          raw: false,
          defval: '',
        });

        if (rawData.length === 0) {
          reject(new Error('El archivo está vacío'));
          return;
        }

        if (rawData.length > MAX_ROWS) {
          reject(new Error(`El archivo excede el máximo de ${MAX_ROWS} registros`));
          return;
        }

        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];
        const records: ClientRecord[] = [];

        const firstRow: any = rawData[0];
        const columnMap: Record<string, string> = {};

        Object.keys(firstRow).forEach(key => {
          const normalized = normalizeColumnName(key);
          columnMap[key] = normalized;
        });

        const missingColumns = REQUIRED_COLUMNS.filter(
          col => !Object.values(columnMap).includes(col)
        );

        if (missingColumns.length > 0) {
          errors.push({
            message: `Faltan columnas requeridas: ${missingColumns.join(', ')}`,
            type: 'error',
          });
          resolve({
            records: [],
            errors,
            warnings,
            metadata: {
              totalRows: rawData.length,
              validRows: 0,
              invalidRows: rawData.length,
              fileName: file.name,
              fileSize: file.size,
            },
          });
          return;
        }

        const seenCuits = new Set<string>();

        rawData.forEach((row: any, index: number) => {
          const rowNumber = index + 2;
          const normalizedRow: Record<string, any> = {};

          Object.keys(row).forEach(key => {
            normalizedRow[columnMap[key]] = row[key];
          });

          const rowErrors: string[] = [];

          if (!normalizedRow.cuit || normalizedRow.cuit.toString().trim() === '') {
            rowErrors.push('CUIT es requerido');
          } else if (!validateCuit(normalizedRow.cuit.toString())) {
            rowErrors.push('CUIT inválido (debe tener 11 dígitos)');
          } else if (seenCuits.has(normalizedRow.cuit.toString().replace(/[-\s]/g, ''))) {
            rowErrors.push('CUIT duplicado en el archivo');
          } else {
            seenCuits.add(normalizedRow.cuit.toString().replace(/[-\s]/g, ''));
          }

          if (!normalizedRow.razon_social || normalizedRow.razon_social.trim() === '') {
            rowErrors.push('Razón Social es requerida');
          }

          if (!normalizedRow.email || normalizedRow.email.trim() === '') {
            rowErrors.push('Email es requerido');
          } else if (!validateEmail(normalizedRow.email)) {
            rowErrors.push('Email inválido');
          }

          if (!normalizedRow.direccion || normalizedRow.direccion.trim() === '') {
            rowErrors.push('Dirección es requerida');
          }

          if (normalizedRow.telefono && !validatePhone(normalizedRow.telefono)) {
            warnings.push({
              row: rowNumber,
              field: 'telefono',
              message: 'Formato de teléfono no estándar',
              type: 'warning',
            });
          }

          if (rowErrors.length > 0) {
            errors.push({
              row: rowNumber,
              message: rowErrors.join(', '),
              type: 'error',
            });
          } else {
            records.push({
              cuit: normalizedRow.cuit.toString().replace(/[-\s]/g, ''),
              razon_social: normalizedRow.razon_social.trim(),
              email: normalizedRow.email.trim().toLowerCase(),
              telefono: normalizedRow.telefono?.trim() || undefined,
              direccion: normalizedRow.direccion.trim(),
              contacto: normalizedRow.contacto?.trim() || undefined,
              last_modified: normalizedRow.last_modified || new Date().toISOString(),
            });
          }
        });

        resolve({
          records,
          errors,
          warnings,
          metadata: {
            totalRows: rawData.length,
            validRows: records.length,
            invalidRows: errors.filter(e => e.row !== undefined).length,
            fileName: file.name,
            fileSize: file.size,
          },
        });
      } catch (error: any) {
        reject(new Error(`Error al procesar el archivo: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsBinaryString(file);
  });
};

export const filterByDate = (
  records: ClientRecord[],
  referenceDate: Date
): ClientRecord[] => {
  return records.filter(record => {
    if (!record.last_modified) return true;

    const recordDate = new Date(record.last_modified);
    return recordDate > referenceDate;
  });
};

export const exportErrorReport = (errors: ValidationError[], fileName: string): void => {
  const csvContent = [
    ['Fila', 'Campo', 'Tipo', 'Mensaje'],
    ...errors.map(error => [
      error.row || 'N/A',
      error.field || 'General',
      error.type === 'error' ? 'Error' : 'Advertencia',
      error.message,
    ]),
  ]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `errores_${fileName}_${Date.now()}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
