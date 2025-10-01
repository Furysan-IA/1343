import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export type EntityType = 'client' | 'product';

export interface UniversalRecord {
  [key: string]: any;
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  code: string;
}

export interface ParsedData {
  headers: string[];
  rows: UniversalRecord[];
  metadata: {
    filename: string;
    fileSize: number;
    rowCount: number;
    columnCount: number;
    uploadedAt: Date;
  };
}

const CLIENT_REQUIRED_FIELDS = ['cuit', 'razon_social', 'direccion', 'email'];
const PRODUCT_REQUIRED_FIELDS = ['codificacion', 'cuit', 'producto'];

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_ROWS = 10000;

const normalizeHeader = (header: string): string => {
  return header
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

export const validateFile = (file: File) => {
  const errors: ValidationError[] = [];

  if (file.size > MAX_FILE_SIZE) {
    errors.push({
      row: 0,
      field: 'file',
      value: file.size,
      message: `File size exceeds maximum of 50MB`,
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
      message: `Invalid file format. Supported formats: ${validExtensions.join(', ')}`,
      code: 'FP-001'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const parseFile = async (file: File): Promise<ParsedData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

        if (jsonData.length === 0) {
          reject(new Error('File is empty'));
          return;
        }

        const headers = (jsonData[0] as any[]).map(h => normalizeHeader(String(h)));

        const rows: UniversalRecord[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.every(cell => !cell)) continue;

          const record: any = {};
          headers.forEach((header, index) => {
            const value = row[index];

            if (value !== undefined && value !== null && value !== '') {
              if (header.includes('fecha') || header.includes('vencimiento') || header.includes('emision')) {
                const parsed = parseDate(value);
                record[header] = parsed ? parsed.toISOString() : value;
              } else if (header === 'cuit' || header.includes('cod_')) {
                record[header] = parseInt(String(value).replace(/\D/g, '')) || value;
              } else {
                record[header] = value;
              }
            }
          });

          rows.push(record);
        }

        if (rows.length > MAX_ROWS) {
          reject(new Error(`File contains ${rows.length} rows. Maximum allowed is ${MAX_ROWS}`));
          return;
        }

        resolve({
          headers,
          rows,
          metadata: {
            filename: file.name,
            fileSize: file.size,
            rowCount: rows.length,
            columnCount: headers.length,
            uploadedAt: new Date()
          }
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
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

export const validateParsedData = (data: ParsedData, entityType: EntityType) => {
  const errors: ValidationError[] = [];
  const requiredFields = entityType === 'client' ? CLIENT_REQUIRED_FIELDS : PRODUCT_REQUIRED_FIELDS;

  const missingFields = requiredFields.filter(field => !data.headers.includes(field));
  if (missingFields.length > 0) {
    errors.push({
      row: 0,
      field: 'headers',
      value: missingFields,
      message: `Missing required columns: ${missingFields.join(', ')}`,
      code: 'FP-003'
    });
    return { isValid: false, errors, warnings: [] };
  }

  const seenKeys = new Set<string>();

  data.rows.forEach((row, index) => {
    const rowNumber = index + 2;

    requiredFields.forEach(field => {
      if (!row[field]) {
        errors.push({
          row: rowNumber,
          field,
          value: row[field],
          message: `${field} is required`,
          code: 'VL-004'
        });
      }
    });

    const keyField = entityType === 'client' ? 'cuit' : 'codificacion';
    const keyValue = String(row[keyField]);

    if (keyValue && seenKeys.has(keyValue)) {
      errors.push({
        row: rowNumber,
        field: keyField,
        value: keyValue,
        message: `Duplicate ${keyField} in file`,
        code: 'VL-003'
      });
    } else if (keyValue) {
      seenKeys.add(keyValue);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings: []
  };
};

export const createBatch = async (
  metadata: { filename: string; fileSize: number; totalRecords: number },
  entityType: EntityType
): Promise<string> => {
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('upload_batches')
    .insert({
      filename: metadata.filename,
      file_size: metadata.fileSize,
      total_records: metadata.totalRecords,
      uploaded_by: user.user.id,
      status: 'processing',
      entity_type: entityType
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating batch:', error);
    throw error;
  }

  return data.id;
};

export const detectDuplicates = async (
  records: UniversalRecord[],
  entityType: EntityType
): Promise<{
  exactMatches: Map<string, any>;
  newRecords: UniversalRecord[];
}> => {
  const exactMatches = new Map<string, any>();
  const newRecords: UniversalRecord[] = [];

  if (entityType === 'client') {
    for (const record of records) {
      const cuit = record.cuit;
      if (!cuit) continue;

      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('cuit', cuit)
        .maybeSingle();

      if (data) {
        exactMatches.set(String(cuit), data);
      } else {
        newRecords.push(record);
      }
    }
  } else {
    for (const record of records) {
      const codificacion = record.codificacion;
      if (!codificacion) continue;

      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('codificacion', codificacion)
        .maybeSingle();

      if (data) {
        exactMatches.set(String(codificacion), data);
      } else {
        newRecords.push(record);
      }
    }
  }

  return { exactMatches, newRecords };
};

export const insertRecords = async (
  records: UniversalRecord[],
  batchId: string,
  entityType: EntityType
): Promise<{ success: boolean; insertedCount: number; errors: any[] }> => {
  const errors: any[] = [];
  let insertedCount = 0;

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const chunkSize = 100;
  const tableName = entityType === 'client' ? 'clients' : 'products';
  const auditTable = entityType === 'client' ? 'client_audit_log' : 'product_audit_log';

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);

    const { data, error } = await supabase
      .from(tableName)
      .insert(chunk)
      .select();

    if (error) {
      errors.push({ chunk: i / chunkSize, error: error.message });
    } else if (data) {
      insertedCount += data.length;

      for (const record of data) {
        const keyField = entityType === 'client' ? 'cuit' : 'uuid';
        await supabase.from(auditTable).insert({
          [entityType === 'client' ? 'client_cuit' : 'product_uuid']: record[keyField],
          batch_id: batchId,
          operation_type: 'INSERT',
          new_values: record,
          performed_by: user.user.id,
          notes: `${entityType} inserted from batch upload`
        });
      }
    }
  }

  return { success: errors.length === 0, insertedCount, errors };
};

export const updateBatchStatus = async (batchId: string, updates: any): Promise<void> => {
  const updateData: any = { ...updates };

  if (updates.status === 'completed' || updates.status === 'failed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('upload_batches')
    .update(updateData)
    .eq('id', batchId);

  if (error) throw error;
};
