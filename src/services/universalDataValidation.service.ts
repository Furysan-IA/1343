import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export type EntityType = 'client' | 'product';

export interface UniversalRecord {
  [key: string]: any;
}

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface ClientMatch {
  cuit: string;
  existing: any;
  incoming: any;
  changes: FieldChange[];
  hasChanges: boolean;
}

export interface ProductMatch {
  codificacion: string;
  existing: any;
  incoming: any;
  changes: FieldChange[];
  hasChanges: boolean;
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
  console.log('📁 parseFile started for:', file.name);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        console.log('📖 FileReader onload triggered');
        const data = e.target?.result;

        if (!data) {
          throw new Error('No data read from file');
        }

        console.log('📊 Reading workbook...');
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });

        const firstSheetName = workbook.SheetNames[0];
        console.log('📄 Sheet name:', firstSheetName);
        const worksheet = workbook.Sheets[firstSheetName];

        console.log('🔄 Converting to JSON...');
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

        if (jsonData.length === 0) {
          reject(new Error('El archivo está vacío'));
          return;
        }

        console.log('✅ JSON data extracted, rows:', jsonData.length);
        const headers = (jsonData[0] as any[]).map(h => normalizeHeader(String(h)));
        console.log('📋 Headers:', headers);

        const rows: UniversalRecord[] = [];

        console.log('🔄 Processing rows...');
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

        console.log('✅ Processed rows:', rows.length);

        if (rows.length > MAX_ROWS) {
          reject(new Error(`El archivo contiene ${rows.length} filas. El máximo permitido es ${MAX_ROWS}`));
          return;
        }

        console.log('🎉 parseFile completed successfully');
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
      } catch (error: any) {
        console.error('❌ Error in parseFile:', error);
        console.error('Error stack:', error?.stack);
        reject(new Error(`Error al procesar archivo: ${error?.message || 'Desconocido'}`));
      }
    };

    reader.onerror = (error) => {
      console.error('❌ FileReader error:', error);
      reject(new Error('Error al leer el archivo'));
    };

    console.log('🚀 Starting to read file as binary string...');
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

export const validateParsedData = (data: ParsedData) => {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  const hasClientFields = CLIENT_REQUIRED_FIELDS.every(field => data.headers.includes(field));
  const hasProductFields = PRODUCT_REQUIRED_FIELDS.every(field => data.headers.includes(field));

  if (!hasClientFields && !hasProductFields) {
    const allRequired = [...new Set([...CLIENT_REQUIRED_FIELDS, ...PRODUCT_REQUIRED_FIELDS])];
    const missing = allRequired.filter(field => !data.headers.includes(field));
    errors.push({
      row: 0,
      field: 'headers',
      value: missing,
      message: `Missing required columns. Need either client fields (${CLIENT_REQUIRED_FIELDS.join(', ')}) or product fields (${PRODUCT_REQUIRED_FIELDS.join(', ')}) or both`,
      code: 'FP-003'
    });
    return { isValid: false, errors, warnings, hasClientFields, hasProductFields };
  }

  const seenCUITs = new Set<string>();
  const seenCodificaciones = new Set<string>();

  data.rows.forEach((row, index) => {
    const rowNumber = index + 2;

    if (hasClientFields) {
      CLIENT_REQUIRED_FIELDS.forEach(field => {
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

      const cuit = String(row.cuit || '');
      if (cuit && seenCUITs.has(cuit)) {
        errors.push({
          row: rowNumber,
          field: 'cuit',
          value: cuit,
          message: `Duplicate CUIT in file`,
          code: 'VL-003'
        });
      } else if (cuit) {
        seenCUITs.add(cuit);
      }
    }

    if (hasProductFields) {
      PRODUCT_REQUIRED_FIELDS.forEach(field => {
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

      const codificacion = String(row.codificacion || '');
      if (codificacion && seenCodificaciones.has(codificacion)) {
        errors.push({
          row: rowNumber,
          field: 'codificacion',
          value: codificacion,
          message: `Duplicate codificacion in file`,
          code: 'VL-003'
        });
      } else if (codificacion) {
        seenCodificaciones.add(codificacion);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasClientFields,
    hasProductFields
  };
};

// Función para detectar certificados duplicados en la base de datos
export const checkExistingCertificates = async (records: UniversalRecord[]): Promise<{
  duplicates: Array<{ codificacion: string; existing: any; incoming: any }>;
  newRecords: UniversalRecord[];
}> => {
  console.log('🔍 Checking for existing certificates...');

  // Extraer todas las codificaciones únicas del archivo
  const codificaciones = records
    .map(r => r.codificacion)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i); // Únicos

  if (codificaciones.length === 0) {
    console.log('⚠️ No certificate codes found in file');
    return { duplicates: [], newRecords: records };
  }

  console.log(`📋 Found ${codificaciones.length} unique certificate codes in file`);

  // Buscar en la base de datos
  const { data: existingCerts, error } = await supabase
    .from('product_certificates')
    .select('*')
    .in('codificacion', codificaciones);

  if (error) {
    console.error('❌ Error checking certificates:', error);
    throw new Error(`Error al verificar certificados: ${error.message}`);
  }

  console.log(`✅ Found ${existingCerts?.length || 0} existing certificates in database`);

  if (!existingCerts || existingCerts.length === 0) {
    return { duplicates: [], newRecords: records };
  }

  // Crear mapa de certificados existentes por codificación
  const existingMap = new Map(existingCerts.map(cert => [cert.codificacion, cert]));

  const duplicates: Array<{ codificacion: string; existing: any; incoming: any }> = [];
  const newRecords: UniversalRecord[] = [];

  records.forEach(record => {
    if (record.codificacion && existingMap.has(record.codificacion)) {
      duplicates.push({
        codificacion: record.codificacion,
        existing: existingMap.get(record.codificacion),
        incoming: record
      });
    } else {
      newRecords.push(record);
    }
  });

  console.log(`🔍 Analysis complete: ${duplicates.length} duplicates, ${newRecords.length} new records`);

  return { duplicates, newRecords };
};

export const createBatch = async (
  metadata: { filename: string; fileSize: number; totalRecords: number }
): Promise<string> => {
  console.log('📦 createBatch started:', metadata);

  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    throw new Error('Usuario no autenticado');
  }

  console.log('👤 User authenticated:', user.user.id);

  const { data, error } = await supabase
    .from('upload_batches')
    .insert({
      filename: metadata.filename,
      file_size: metadata.fileSize,
      total_records: metadata.totalRecords,
      uploaded_by: user.user.id,
      status: 'processing',
      entity_type: 'mixed'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating batch:', error);
    throw new Error(`Error al crear batch: ${error.message}`);
  }

  console.log('✅ Batch created successfully:', data.id);
  return data.id;
};

const detectFieldChanges = (existing: any, incoming: any, fieldsToCheck: string[]): FieldChange[] => {
  const changes: FieldChange[] = [];

  for (const field of fieldsToCheck) {
    const oldVal = existing[field];
    const newVal = incoming[field];

    if (newVal !== undefined && newVal !== null && newVal !== '') {
      const oldStr = String(oldVal || '').trim();
      const newStr = String(newVal || '').trim();

      if (oldStr !== newStr) {
        changes.push({
          field,
          oldValue: oldVal,
          newValue: newVal
        });
      }
    }
  }

  return changes;
};

export const detectDuplicates = async (
  records: UniversalRecord[]
): Promise<{
  clientMatches: ClientMatch[];
  productMatches: ProductMatch[];
  newClients: UniversalRecord[];
  newProducts: UniversalRecord[];
}> => {
  const clientMatches: ClientMatch[] = [];
  const productMatches: ProductMatch[] = [];
  const newClients: UniversalRecord[] = [];
  const newProducts: UniversalRecord[] = [];

  const seenCUITs = new Set<string>();
  const seenCodificaciones = new Set<string>();

  const clientFieldsToCheck = ['razon_social', 'direccion', 'email'];
  const productFieldsToCheck = [
    'estado', 'vencimiento', 'fecha_emision', 'marca', 'modelo',
    'producto', 'titular', 'en_proceso_renovacion', 'normas_aplicacion'
  ];

  for (const record of records) {
    const cuit = record.cuit;
    if (cuit && !seenCUITs.has(String(cuit))) {
      seenCUITs.add(String(cuit));

      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('cuit', cuit)
        .maybeSingle();

      if (data) {
        const incomingClient = {
          cuit: record.cuit,
          razon_social: record.razon_social,
          direccion: record.direccion,
          email: record.email
        };

        const changes = detectFieldChanges(data, incomingClient, clientFieldsToCheck);

        clientMatches.push({
          cuit: String(cuit),
          existing: data,
          incoming: incomingClient,
          changes,
          hasChanges: changes.length > 0
        });
      } else {
        newClients.push({
          cuit: record.cuit,
          razon_social: record.razon_social,
          direccion: record.direccion,
          email: record.email
        });
      }
    }

    const codificacion = record.codificacion;
    if (codificacion && !seenCodificaciones.has(String(codificacion))) {
      seenCodificaciones.add(String(codificacion));

      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('codificacion', codificacion)
        .maybeSingle();

      if (data) {
        const changes = detectFieldChanges(data, record, productFieldsToCheck);

        productMatches.push({
          codificacion: String(codificacion),
          existing: data,
          incoming: record,
          changes,
          hasChanges: changes.length > 0
        });
      } else {
        newProducts.push(record);
      }
    }
  }

  return { clientMatches, productMatches, newClients, newProducts };
};

export const insertClientsAndProducts = async (
  clientRecords: UniversalRecord[],
  productRecords: UniversalRecord[],
  batchId: string,
  updateExistingClients: boolean = true
): Promise<{
  success: boolean;
  clientsInserted: number;
  clientsUpdated: number;
  productsInserted: number;
  errors: any[]
}> => {
  const errors: any[] = [];
  let clientsInserted = 0;
  let clientsUpdated = 0;
  let productsInserted = 0;

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  console.log('Starting batch insert:', {
    clients: clientRecords.length,
    products: productRecords.length,
    updateExistingClients,
    batchId
  });

  if (clientRecords.length > 0) {
    console.log('Inserting clients...');
    const chunkSize = 100;

    for (let i = 0; i < clientRecords.length; i += chunkSize) {
      const chunk = clientRecords.slice(i, i + chunkSize);

      for (const clientRecord of chunk) {
        const { data: existing } = await supabase
          .from('clients')
          .select('*')
          .eq('cuit', clientRecord.cuit)
          .maybeSingle();

        if (existing && updateExistingClients) {
          const { error } = await supabase
            .from('clients')
            .update({
              razon_social: clientRecord.razon_social,
              direccion: clientRecord.direccion,
              email: clientRecord.email,
              updated_at: new Date().toISOString()
            })
            .eq('cuit', clientRecord.cuit);

          if (error) {
            errors.push({ type: 'client_update', cuit: clientRecord.cuit, error: error.message });
          } else {
            clientsUpdated++;
            await supabase.from('client_audit_log').insert({
              client_cuit: clientRecord.cuit,
              batch_id: batchId,
              operation_type: 'UPDATE',
              old_values: existing,
              new_values: clientRecord,
              performed_by: user.user.id,
              notes: 'Client updated from batch upload'
            });
          }
        } else if (!existing) {
          const { data, error } = await supabase
            .from('clients')
            .insert(clientRecord)
            .select()
            .single();

          if (error) {
            errors.push({ type: 'client_insert', cuit: clientRecord.cuit, error: error.message });
          } else if (data) {
            clientsInserted++;
            await supabase.from('client_audit_log').insert({
              client_cuit: data.cuit,
              batch_id: batchId,
              operation_type: 'INSERT',
              new_values: data,
              performed_by: user.user.id,
              notes: 'Client inserted from batch upload'
            });
          }
        }
      }
    }
    console.log('Clients processed:', { inserted: clientsInserted, updated: clientsUpdated });
  }

  if (productRecords.length > 0) {
    console.log('Inserting products...');
    const chunkSize = 50;

    for (let i = 0; i < productRecords.length; i += chunkSize) {
      const chunk = productRecords.slice(i, i + chunkSize);

      for (const productRecord of chunk) {
        const { data: existing } = await supabase
          .from('products')
          .select('*')
          .eq('codificacion', productRecord.codificacion)
          .maybeSingle();

        if (!existing) {
          const { data, error } = await supabase
            .from('products')
            .insert(productRecord)
            .select()
            .single();

          if (error) {
            errors.push({ type: 'product_insert', codificacion: productRecord.codificacion, error: error.message });
          } else if (data) {
            productsInserted++;
            await supabase.from('product_audit_log').insert({
              product_uuid: data.uuid,
              batch_id: batchId,
              operation_type: 'INSERT',
              new_values: data,
              performed_by: user.user.id,
              notes: 'Product inserted from batch upload'
            });
          }
        } else {
          console.log(`Product ${productRecord.codificacion} already exists - SKIPPING to preserve QR/links`);
        }
      }
    }
    console.log('Products inserted:', productsInserted);
  }

  return {
    success: errors.length === 0,
    clientsInserted,
    clientsUpdated,
    productsInserted,
    errors
  };
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
