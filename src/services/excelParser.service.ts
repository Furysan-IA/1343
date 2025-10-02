import * as XLSX from 'xlsx';
import { ParsedExcelData } from '@/types/upload.types';

export class ExcelParser {
  static async parseFile(file: File): Promise<ParsedExcelData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length === 0) {
            reject(new Error('El archivo está vacío'));
            return;
          }

          const headers = (jsonData[0] as any[]).map(h => String(h || '').trim());
          const rows = jsonData.slice(1).filter((row: any) => {
            return Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== '');
          });

          resolve({
            rows,
            headers,
            totalRows: rows.length
          });
        } catch (error) {
          reject(new Error(`Error al parsear Excel: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };

      reader.readAsBinaryString(file);
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
