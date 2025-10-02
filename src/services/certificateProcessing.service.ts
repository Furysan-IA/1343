import * as XLSX from 'xlsx';

export interface CertificateRecord {
  fecha_emision: Date;

  // Datos del cliente
  cuit?: string;
  razon_social?: string;
  direccion?: string;
  email?: string;
  telefono?: string;
  contacto?: string;

  // Datos del producto
  codificacion?: string;
  titular_responsable?: string;
  tipo_certificacion?: string;
  fecha_vencimiento?: Date;

  // Metadatos
  [key: string]: any;
}

export interface ExtractionResult {
  clientData: {
    cuit?: string;
    razon_social?: string;
    direccion?: string;
    email?: string;
    telefono?: string;
    contacto?: string;
    fecha_emision: Date;
  } | null;

  productData: {
    codificacion?: string;
    titular_responsable?: string;
    tipo_certificacion?: string;
    fecha_vencimiento?: Date;
    fecha_emision: Date;
  } | null;

  originalRecord: CertificateRecord;
  hasClientData: boolean;
  hasProductData: boolean;
  isComplete: boolean;
  missingClientFields: string[];
  missingProductFields: string[];
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  code: string;
}

export interface RejectedRecord {
  rowNumber: number;
  reason: string;
  data: any;
  missingFields?: string[];
}

export interface ParsedCertificates {
  headers: string[];
  records: CertificateRecord[];
  extractions: ExtractionResult[];
  rejectedRecords: RejectedRecord[];
  metadata: {
    filename: string;
    fileSize: number;
    totalRecords: number;
    totalRejected: number;
    columnCount: number;
    uploadedAt: Date;
  };
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_ROWS = 10000;

const normalizeHeader = (header: string): string => {
  return header.toLowerCase().trim().replace(/\s+/g, '_');
};

const parseDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 86400000);
  }

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const CLIENT_FIELDS = ['cuit', 'razon_social', 'direccion', 'email', 'telefono', 'contacto'];
const PRODUCT_FIELDS = ['codificacion', 'titular_responsable', 'tipo_certificacion', 'fecha_vencimiento'];
const REQUIRED_FIELD = 'fecha_emision';

export const validateFile = (file: File): { isValid: boolean; errors: ValidationError[] } => {
  const errors: ValidationError[] = [];

  if (file.size > MAX_FILE_SIZE) {
    errors.push({
      row: 0,
      field: 'file',
      value: file.size,
      message: `El tamaño del archivo excede el máximo de 50MB`,
      code: 'FP-002'
    });
  }

  const validExtensions = ['.xlsx', '.xls', '.csv'];
  const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (!validExtensions.includes(fileExtension)) {
    errors.push({
      row: 0,
      field: 'file',
      value: fileExtension,
      message: `Formato de archivo inválido. Formatos soportados: ${validExtensions.join(', ')}`,
      code: 'FP-001'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const parseCertificateFile = async (file: File): Promise<ParsedCertificates> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo. Por favor intenta de nuevo.'));
    };

    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          reject(new Error('No se pudo leer el contenido del archivo'));
          return;
        }

        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellStyles: true
        });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error('El archivo no contiene hojas de cálculo'));
          return;
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        if (!worksheet) {
          reject(new Error('No se pudo leer la primera hoja del archivo'));
          return;
        }

        // Convert directly to objects using first row as headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: null,
          blankrows: false,
          raw: false
        });

        if (!jsonData || jsonData.length === 0) {
          reject(new Error('El archivo está vacío o solo contiene encabezados'));
          return;
        }

        // Extract and normalize headers from first object
        const originalHeaders = Object.keys(jsonData[0]);
        const headers = originalHeaders.map(h => normalizeHeader(String(h || '')));

        if (!headers.includes('fecha_emision')) {
          reject(new Error('El archivo debe contener la columna "fecha_emision"'));
          return;
        }

        const records: CertificateRecord[] = [];
        const extractions: ExtractionResult[] = [];
        const rejectedRecords: RejectedRecord[] = [];

        jsonData.forEach((rawRow: any, index: number) => {
          const rowNumber = index + 2;

          const record: any = {};
          originalHeaders.forEach((originalHeader, idx) => {
            const normalizedHeader = headers[idx];
            let value = rawRow[originalHeader];

            if (normalizedHeader === 'fecha_emision' || normalizedHeader === 'fecha_vencimiento') {
              value = parseDate(value);
            }

            record[normalizedHeader] = value;
          });

          if (!record.fecha_emision) {
            rejectedRecords.push({
              rowNumber,
              reason: 'Falta campo obligatorio: fecha_emision',
              data: record,
              missingFields: ['fecha_emision']
            });
            return;
          }

          records.push(record);

          const extraction = extractClientAndProductData(record);
          extractions.push(extraction);
        });

        if (records.length > MAX_ROWS) {
          reject(new Error(`El archivo contiene ${records.length} filas. Máximo permitido: ${MAX_ROWS}`));
          return;
        }

        if (records.length === 0) {
          reject(new Error('No se encontraron registros válidos con fecha_emision en el archivo'));
          return;
        }

        resolve({
          headers,
          records,
          extractions,
          rejectedRecords,
          metadata: {
            filename: file.name,
            fileSize: file.size,
            totalRecords: records.length,
            totalRejected: rejectedRecords.length,
            columnCount: headers.length,
            uploadedAt: new Date()
          }
        });
      } catch (error: any) {
        console.error('Error parsing certificate file:', error);
        reject(new Error(error.message || 'Error al procesar el archivo. Verifica el formato.'));
      }
    };

    reader.readAsArrayBuffer(file);
  });
};

export const extractClientAndProductData = (record: CertificateRecord): ExtractionResult => {
  const clientData: any = {
    fecha_emision: record.fecha_emision
  };
  const productData: any = {
    fecha_emision: record.fecha_emision
  };

  let hasClientData = false;
  let hasProductData = false;
  const missingClientFields: string[] = [];
  const missingProductFields: string[] = [];

  CLIENT_FIELDS.forEach(field => {
    if (record[field]) {
      clientData[field] = record[field];
      hasClientData = true;
    } else {
      missingClientFields.push(field);
    }
  });

  PRODUCT_FIELDS.forEach(field => {
    if (record[field]) {
      productData[field] = record[field];
      hasProductData = true;
    } else {
      missingProductFields.push(field);
    }
  });

  const isClientComplete = missingClientFields.length === 0 && hasClientData;
  const isProductComplete = missingProductFields.length === 0 && hasProductData;

  return {
    clientData: hasClientData ? clientData : null,
    productData: hasProductData ? productData : null,
    originalRecord: record,
    hasClientData,
    hasProductData,
    isComplete: isClientComplete && isProductComplete,
    missingClientFields: hasClientData ? missingClientFields : [],
    missingProductFields: hasProductData ? missingProductFields : []
  };
};

export const filterByEmissionDate = (
  extractions: ExtractionResult[],
  referenceDate: Date
): ExtractionResult[] => {
  return extractions.filter(extraction => {
    return extraction.originalRecord.fecha_emision > referenceDate;
  });
};

export const categorizeExtractions = (extractions: ExtractionResult[]) => {
  const completeRecords: ExtractionResult[] = [];
  const incompleteClients: ExtractionResult[] = [];
  const incompleteProducts: ExtractionResult[] = [];
  const completeButPartial: ExtractionResult[] = [];

  extractions.forEach(extraction => {
    if (extraction.isComplete) {
      completeRecords.push(extraction);
    } else if (extraction.hasClientData && !extraction.hasProductData) {
      incompleteProducts.push(extraction);
    } else if (extraction.hasProductData && !extraction.hasClientData) {
      incompleteClients.push(extraction);
    } else if (extraction.hasClientData || extraction.hasProductData) {
      if (extraction.missingClientFields.length > 0 || extraction.missingProductFields.length > 0) {
        completeButPartial.push(extraction);
      }
    }
  });

  return {
    completeRecords,
    incompleteClients,
    incompleteProducts,
    completeButPartial,
    totalComplete: completeRecords.length,
    totalIncomplete: incompleteClients.length + incompleteProducts.length + completeButPartial.length
  };
};

export const generateValidationReport = (extractions: ExtractionResult[]): string => {
  const categories = categorizeExtractions(extractions);

  let report = 'Reporte de Validación de Certificados\n';
  report += '=====================================\n\n';

  report += `Total de registros: ${extractions.length}\n`;
  report += `Registros completos: ${categories.totalComplete}\n`;
  report += `Registros incompletos: ${categories.totalIncomplete}\n\n`;

  if (categories.incompleteClients.length > 0) {
    report += `Clientes nuevos que necesitan completar información (${categories.incompleteClients.length}):\n`;
    report += '-----------------------------------------------------------\n';
    categories.incompleteClients.forEach((ext, index) => {
      report += `${index + 1}. Campos faltantes: ${ext.missingClientFields.join(', ')}\n`;
    });
    report += '\n';
  }

  if (categories.incompleteProducts.length > 0) {
    report += `Productos que necesitan completar información (${categories.incompleteProducts.length}):\n`;
    report += '-----------------------------------------------------------\n';
    categories.incompleteProducts.forEach((ext, index) => {
      report += `${index + 1}. Campos faltantes: ${ext.missingProductFields.join(', ')}\n`;
    });
    report += '\n';
  }

  return report;
};
