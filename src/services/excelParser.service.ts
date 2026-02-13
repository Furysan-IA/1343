import * as XLSX from 'xlsx';
import { ParsedExcelData } from '@/types/upload.types';

export class ExcelParser {
  static async parseFile(file: File): Promise<ParsedExcelData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, {
            type: 'array',
            cellDates: true,
            cellStyles: true
          });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert directly to objects using first row as headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            defval: null,      // Default value for empty cells
            blankrows: false   // Skip completely blank rows
          });

          if (jsonData.length === 0) {
            reject(new Error('El archivo está vacío'));
            return;
          }

          // Extract headers from the keys of the first object
          const headers = Object.keys(jsonData[0]);

          console.log('📊 ExcelParser - Parsed rows:', jsonData.length);
          console.log('📋 ExcelParser - Headers detected:', headers.length);

          resolve({
            rows: jsonData,
            headers,
            totalRows: jsonData.length
          });
        } catch (error) {
          reject(new Error(`Error al parsear Excel: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  static validateFile(file: File): { valid: boolean; error?: string } {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      return {
        valid: false,
        error: 'Formato de archivo no válido. Use .xlsx, .xls o .csv'
      };
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'El archivo es demasiado grande. Máximo 10MB'
      };
    }

    return { valid: true };
  }
}
