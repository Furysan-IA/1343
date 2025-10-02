import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export type EntityType = 'client' | 'product';

// Helper function to retry database queries with exponential backoff
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      if (attempt === maxRetries - 1) throw error;

      const delay = initialDelay * Math.pow(2, attempt);
      console.warn(`⚠️ Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
};

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

// Columnas válidas en la tabla products
const VALID_PRODUCT_COLUMNS = new Set([
  'codificacion', 'cuit', 'titular', 'tipo_certificacion', 'estado',
  'en_proceso_renovacion', 'direccion_legal_empresa', 'fabricante',
  'planta_fabricacion', 'origen', 'producto', 'marca', 'modelo',
  'caracteristicas_tecnicas', 'normas_aplicacion', 'informe_ensayo_nro',
  'laboratorio', 'ocp_extranjero', 'n_certificado_extranjero',
  'fecha_emision_certificado_extranjero', 'disposicion_convenio',
  'cod_rubro', 'cod_subrubro', 'nombre_subrubro', 'fecha_emision',
  'vencimiento', 'fecha_cancelacion', 'motivo_cancelacion', 'dias_para_vencer',
  'djc_status', 'certificado_status', 'enviado_cliente', 'certificado_path',
  'djc_path', 'qr_path', 'qr_link', 'qr_status', 'qr_generated_at',
  'organismo_certificacion', 'esquema_certificacion', 'fecha_proxima_vigilancia'
]);

// Columnas válidas en la tabla clients
const VALID_CLIENT_COLUMNS = new Set([
  'cuit', 'razon_social', 'direccion', 'email', 'telefono', 'contacto'
]);

const normalizeHeader = (header: string): string => {
  return header
    .toLowerCase()
    .trim()
    .replace(/\./g, '')           // Quitar puntos
    .replace(/\s+/g, '_')         // Espacios a guiones bajos
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9_]/g, '');  // Quitar cualquier otro caracter especial
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
        const originalHeaders = jsonData[0] as any[];
        const headers = originalHeaders.map(h => normalizeHeader(String(h)));
        console.log('📋 Original headers:', originalHeaders);
        console.log('📋 Normalized headers:', headers);

        const rows: UniversalRecord[] = [];

        console.log('🔄 Processing rows...');
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.every(cell => !cell)) continue;

          const record: any = {};
          headers.forEach((header, index) => {
            const value = row[index];

            // Aplicar conversión de tipos para cada campo
            const converted = convertToDbType(value, header);

            // Solo agregar al record si no es null
            if (converted !== null) {
              record[header] = converted;
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

// Filtra campos inválidos de un record
const filterValidFields = (record: any, entityType: EntityType): any => {
  const validColumns = entityType === 'client' ? VALID_CLIENT_COLUMNS : VALID_PRODUCT_COLUMNS;
  const filtered: any = {};

  Object.keys(record).forEach(key => {
    if (validColumns.has(key)) {
      filtered[key] = record[key];
    } else {
      console.log(`⚠️ Skipping invalid column "${key}" for ${entityType}`);
    }
  });

  return filtered;
};

// Convierte valores del Excel a tipos compatibles con PostgreSQL
const convertToDbType = (value: any, fieldName: string): any => {
  // Si es null, undefined o string vacío, retornar null
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // BIGINT: cuit
  if (fieldName === 'cuit') {
    const cleaned = String(value).replace(/\D/g, '');
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? null : parsed;
  }

  // INTEGER: cod_rubro, cod_subrubro, dias_para_vencer
  if (fieldName === 'cod_rubro' || fieldName === 'cod_subrubro' || fieldName === 'dias_para_vencer') {
    const cleaned = String(value).replace(/\D/g, '');
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? null : parsed;
  }

  // DATE: todas las fechas
  if (fieldName.includes('fecha') || fieldName === 'vencimiento') {
    const parsed = parseDate(value);
    if (!parsed) return null;

    // Formatear como YYYY-MM-DD para PostgreSQL date type
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // TEXT: todo lo demás se mantiene como string
  return String(value).trim();
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
export const checkExistingCertificates = async (
  records: UniversalRecord[],
  onProgress?: (progress: number, message: string) => void
): Promise<{
  duplicates: Array<{ codificacion: string; existing: any; incoming: any }>;
  newRecords: UniversalRecord[];
  filtered: UniversalRecord[];
  stats: {
    totalInFile: number;
    withBaja: number;
    activeRecords: number;
    withCodificacion: number;
    duplicatesFound: number;
    newRecordsCount: number;
  };
}> => {
  console.log('🔍 Checking for existing certificates...');
  console.log('📊 Total records in file:', records.length);

  // PASO 1: Filtrar registros con estado "baja"
  const activeRecords = records.filter(r => {
    const estado = String(r.estado || '').toLowerCase().trim();
    return estado !== 'baja';
  });

  const bajaRecords = records.length - activeRecords.length;
  console.log(`🚫 Filtered out ${bajaRecords} records with estado="baja"`);
  console.log(`✅ Active records to process: ${activeRecords.length}`);

  // PASO 2: Extraer todas las codificaciones únicas del archivo (solo activos)
  const recordsWithCode = activeRecords.filter(r => r.codificacion);
  console.log(`📋 Records with codificacion field: ${recordsWithCode.length}`);

  // Mostrar primeros 20 certificados detectados en el archivo
  console.log('\n📜 LISTADO DE CERTIFICADOS EN EL ARCHIVO (primeros 20):');
  console.log('═'.repeat(80));
  recordsWithCode.slice(0, 20).forEach((record, idx) => {
    console.log(`${idx + 1}. ${record.codificacion} | Estado: ${record.estado || 'N/A'} | Titular: ${record.titular || 'N/A'}`);
  });
  if (recordsWithCode.length > 20) {
    console.log(`... y ${recordsWithCode.length - 20} certificados más`);
  }
  console.log('═'.repeat(80) + '\n');

  const codificaciones = recordsWithCode
    .map(r => r.codificacion)
    .filter((v, i, a) => a.indexOf(v) === i); // Únicos

  console.log(`🔢 Unique certificate codes in file: ${codificaciones.length}`);

  if (codificaciones.length === 0) {
    console.log('⚠️ No certificate codes found in active records');
    return {
      duplicates: [],
      newRecords: activeRecords,
      filtered: activeRecords,
      stats: {
        totalInFile: records.length,
        withBaja: bajaRecords,
        activeRecords: activeRecords.length,
        withCodificacion: 0,
        duplicatesFound: 0,
        newRecordsCount: activeRecords.length
      }
    };
  }

  // PASO 3: Omitir verificación de duplicados para evitar congelamiento
  // Los duplicados se manejarán automáticamente con UPSERT en la base de datos
  console.log('⚡ Skipping duplicate check for performance (will use UPSERT on insert)');
  console.log(`✅ Processing all ${activeRecords.length} active records as new/update`);

  onProgress?.(70, 'Preparando registros para carga...');

  const existingCerts: any[] = []; // Empty - no pre-check needed

  // Mostrar certificados existentes en BD
  if (existingCerts && existingCerts.length > 0) {
    console.log('\n🗄️ CERTIFICADOS EXISTENTES EN BASE DE DATOS (primeros 20):');
    console.log('═'.repeat(80));
    existingCerts.slice(0, 20).forEach((cert, idx) => {
      console.log(`${idx + 1}. ${cert.codificacion} | Titular: ${cert.titular || 'N/A'} | Estado: ${cert.estado || 'N/A'}`);
    });
    if (existingCerts.length > 20) {
      console.log(`... y ${existingCerts.length - 20} certificados más`);
    }
    console.log('═'.repeat(80) + '\n');
  }

  if (!existingCerts || existingCerts.length === 0) {
    return {
      duplicates: [],
      newRecords: activeRecords,
      filtered: activeRecords,
      stats: {
        totalInFile: records.length,
        withBaja: bajaRecords,
        activeRecords: activeRecords.length,
        withCodificacion: recordsWithCode.length,
        duplicatesFound: 0,
        newRecordsCount: activeRecords.length
      }
    };
  }

  // PASO 4: Crear mapa de certificados existentes por codificación
  const existingMap = new Map(existingCerts.map(cert => [cert.codificacion, cert]));

  const duplicates: Array<{ codificacion: string; existing: any; incoming: any }> = [];
  const newRecords: UniversalRecord[] = [];

  activeRecords.forEach(record => {
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

  console.log('\n📊 RESUMEN FINAL:');
  console.log('═'.repeat(80));
  console.log(`Total filas en archivo:          ${records.length}`);
  console.log(`Registros con estado "baja":      ${bajaRecords}`);
  console.log(`Registros activos a procesar:    ${activeRecords.length}`);
  console.log(`Con campo codificacion:          ${recordsWithCode.length}`);
  console.log(`Códigos únicos en archivo:       ${codificaciones.length}`);
  console.log(`Certificados YA en base datos:   ${existingCerts.length}`);
  console.log(`DUPLICADOS detectados:           ${duplicates.length}`);
  console.log(`NUEVOS registros:                ${newRecords.length}`);
  console.log('═'.repeat(80) + '\n');

  return {
    duplicates,
    newRecords,
    filtered: activeRecords,
    stats: {
      totalInFile: records.length,
      withBaja: bajaRecords,
      activeRecords: activeRecords.length,
      withCodificacion: recordsWithCode.length,
      duplicatesFound: duplicates.length,
      newRecordsCount: newRecords.length
    }
  };
};

export const createBatch = async (
  metadata: { filename: string; fileSize: number; totalRecords: number }
): Promise<string> => {
  try {
    console.log('📦 createBatch started:', metadata);

    console.log('🔐 Refreshing session and getting authenticated user...');

    // PASO 1: Intentar refrescar la sesión primero
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData?.session) {
        console.warn('⚠️ No active session found, will attempt refresh...');

        // Intentar refrescar la sesión
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error('❌ Session refresh failed:', refreshError);
          throw new Error('Tu sesión ha expirado. Por favor, cierra sesión y vuelve a ingresar.');
        }

        console.log('✅ Session refreshed successfully');
      } else {
        console.log('✅ Active session found');
      }
    } catch (sessionCheckError: any) {
      console.error('❌ Error checking/refreshing session:', sessionCheckError);
      throw new Error('Error de autenticación. Por favor, recarga la página e intenta nuevamente.');
    }

    // PASO 2: Obtener el usuario autenticado con timeout
    const getUserWithTimeout = async () => {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout after 5 seconds')), 5000)
      );
      const getUserPromise = supabase.auth.getUser();
      return Promise.race([getUserPromise, timeout]);
    };

    let authResult;
    try {
      authResult = await getUserWithTimeout();
    } catch (timeoutError: any) {
      console.error('❌ Auth timeout or error:', timeoutError);
      throw new Error(`Error de autenticación: ${timeoutError.message}`);
    }

    const { data: user, error: authError } = authResult as any;

    console.log('🔐 Auth response:', { hasUser: !!user?.user, authError });

    if (authError) {
      console.error('❌ Auth error:', authError);
      throw new Error(`Tu sesión ha expirado. Por favor, cierra sesión y vuelve a ingresar.`);
    }

    if (!user?.user) {
      console.error('❌ No user found in auth response');
      throw new Error('Usuario no autenticado. Por favor, recarga la página.');
    }

    console.log('👤 User authenticated:', user.user.id);

    console.log('💾 Inserting batch into database...');
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

    console.log('💾 Database response:', { hasData: !!data, error });

    if (error) {
      console.error('❌ Database error creating batch:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Error al crear batch: ${error.message}`);
    }

    if (!data) {
      console.error('❌ No data returned from batch insert');
      throw new Error('No se recibió respuesta al crear el batch');
    }

    console.log('✅✅✅ Batch created successfully with ID:', data.id);
    return data.id;
  } catch (error: any) {
    console.error('❌❌❌ FATAL ERROR in createBatch:', error);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    throw error;
  }
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
  incompleteClients: UniversalRecord[];
  incompleteProducts: UniversalRecord[];
}> => {
  console.log('🔍 Starting detectDuplicates - Loading all existing data from DB...');

  const clientMatches: ClientMatch[] = [];
  const productMatches: ProductMatch[] = [];
  const newClients: UniversalRecord[] = [];
  const newProducts: UniversalRecord[] = [];
  const incompleteClients: UniversalRecord[] = [];
  const incompleteProducts: UniversalRecord[] = [];

  const seenCUITs = new Set<string>();
  const seenCodificaciones = new Set<string>();

  const clientFieldsToCheck = ['razon_social', 'direccion', 'email'];
  const productFieldsToCheck = [
    'estado', 'vencimiento', 'fecha_emision', 'marca', 'modelo',
    'producto', 'titular', 'en_proceso_renovacion', 'normas_aplicacion'
  ];

  // OPTIMIZATION: Load ALL clients and products from database ONCE
  console.log('📥 Loading all clients from database...');
  const { data: allClients, error: clientsError } = await supabase
    .from('clients')
    .select('*');

  if (clientsError) {
    console.error('❌ Error loading clients:', clientsError);
    throw new Error(`Error cargando clientes: ${clientsError.message}`);
  }

  console.log('📥 Loading all products from database...');
  const { data: allProducts, error: productsError } = await supabase
    .from('products')
    .select('*');

  if (productsError) {
    console.error('❌ Error loading products:', productsError);
    throw new Error(`Error cargando productos: ${productsError.message}`);
  }

  console.log(`✅ Loaded ${allClients?.length || 0} clients and ${allProducts?.length || 0} products from DB`);

  // Create lookup maps for fast access
  const clientsByCUIT = new Map();
  (allClients || []).forEach(client => {
    const cuitStr = String(client.cuit || '').trim();
    if (cuitStr) {
      clientsByCUIT.set(cuitStr, client);
    }
  });

  const productsByCodificacion = new Map();
  (allProducts || []).forEach(product => {
    // Normalize: trim, uppercase, remove multiple spaces
    const codStr = String(product.codificacion || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
    if (codStr) {
      productsByCodificacion.set(codStr, product);
    }
  });

  console.log(`📊 Created lookup maps: ${clientsByCUIT.size} clients, ${productsByCodificacion.size} products`);

  // Log sample codificaciones from DB for debugging
  const sampleCodsFromDB = Array.from(productsByCodificacion.keys()).slice(0, 5);
  console.log('🔍 Sample codificaciones from DB:', sampleCodsFromDB);

  console.log('🔄 Processing records from file...');

  let sampleCodsFromFileLogged = false;
  const sampleCodsFromFile: string[] = [];

  for (const record of records) {
    // Process clients
    const cuit = record.cuit;
    const cuitStr = String(cuit || '').trim();
    const isValidCuit = cuitStr && cuitStr !== 'NA' && cuitStr !== 'N/A' && cuitStr !== '0' && cuitStr.length > 0;

    if (isValidCuit && !seenCUITs.has(cuitStr)) {
      seenCUITs.add(cuitStr);

      const existingClient = clientsByCUIT.get(cuitStr);

      if (existingClient) {
        const incomingClient = {
          cuit: record.cuit,
          razon_social: record.razon_social,
          direccion: record.direccion,
          email: record.email
        };

        const changes = detectFieldChanges(existingClient, incomingClient, clientFieldsToCheck);

        clientMatches.push({
          cuit: String(cuit),
          existing: existingClient,
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
    } else if (cuitStr) {
      incompleteClients.push({
        cuit: record.cuit,
        razon_social: record.razon_social,
        direccion: record.direccion,
        email: record.email,
        _validation_warning: 'CUIT inválido o incompleto'
      });
    }

    // Process products
    const codificacion = record.codificacion;
    // Normalize: trim, uppercase, remove multiple spaces
    const codificacionStr = String(codificacion || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
    const isValidCodificacion = codificacionStr && codificacionStr !== 'NA' && codificacionStr !== 'N/A' && codificacionStr.length > 0;

    // Collect samples for debugging
    if (sampleCodsFromFile.length < 5 && codificacionStr) {
      sampleCodsFromFile.push(codificacionStr);
    }
    if (!sampleCodsFromFileLogged && sampleCodsFromFile.length === 5) {
      console.log('🔍 Sample codificaciones from file:', sampleCodsFromFile);
      sampleCodsFromFileLogged = true;
    }

    if (isValidCodificacion && !seenCodificaciones.has(codificacionStr)) {
      seenCodificaciones.add(codificacionStr);

      const existingProduct = productsByCodificacion.get(codificacionStr);

      // Detectar campos inválidos (que no existen en la DB)
      const invalidFields: string[] = [];
      Object.keys(record).forEach(key => {
        if (!VALID_PRODUCT_COLUMNS.has(key) && key !== '_validation_warning') {
          invalidFields.push(key);
        }
      });

      // Detectar campos requeridos faltantes
      const missingFields: string[] = [];
      PRODUCT_REQUIRED_FIELDS.forEach(field => {
        if (!record[field] || record[field] === '' || record[field] === null) {
          missingFields.push(field);
        }
      });

      if (existingProduct) {
        const changes = detectFieldChanges(existingProduct, record, productFieldsToCheck);

        productMatches.push({
          codificacion: String(codificacion),
          existing: existingProduct,
          incoming: record,
          changes,
          hasChanges: changes.length > 0
        });
      } else {
        // Si tiene campos inválidos o faltantes, va a incompleteProducts
        if (invalidFields.length > 0 || missingFields.length > 0) {
          let warning = '';
          if (invalidFields.length > 0) {
            warning += `Campos inválidos: ${invalidFields.join(', ')}. `;
          }
          if (missingFields.length > 0) {
            warning += `Campos faltantes: ${missingFields.join(', ')}.`;
          }

          incompleteProducts.push({
            ...record,
            _validation_warning: warning.trim(),
            _invalid_fields: invalidFields,
            _missing_fields: missingFields
          });
        } else {
          newProducts.push(record);
        }
      }
    } else if (codificacionStr) {
      incompleteProducts.push({
        ...record,
        _validation_warning: 'Codificación inválida o incompleta'
      });
    }
  }

  console.log('✅ Detection complete:', {
    clientMatches: clientMatches.length,
    productMatches: productMatches.length,
    newClients: newClients.length,
    newProducts: newProducts.length,
    incompleteClients: incompleteClients.length,
    incompleteProducts: incompleteProducts.length
  });

  return { clientMatches, productMatches, newClients, newProducts, incompleteClients, incompleteProducts };
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
  productsUpdated: number;
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
        // Filtrar campos válidos
        const cleanRecord = filterValidFields(clientRecord, 'client');

        const { data: existing } = await supabase
          .from('clients')
          .select('*')
          .eq('cuit', cleanRecord.cuit)
          .maybeSingle();

        if (existing && updateExistingClients) {
          const { error } = await supabase
            .from('clients')
            .update({
              ...cleanRecord,
              updated_at: new Date().toISOString()
            })
            .eq('cuit', cleanRecord.cuit);

          if (error) {
            errors.push({ type: 'client_update', cuit: clientRecord.cuit, error: error.message });
          } else {
            clientsUpdated++;
            try {
              await supabase.from('client_audit_log').insert({
                client_cuit: clientRecord.cuit,
                batch_id: batchId,
                operation_type: 'UPDATE',
                previous_values: existing,
                new_values: clientRecord,
                performed_by: user.user.id,
                notes: 'Client updated from batch upload'
              });
            } catch (auditError) {
              console.warn('Failed to log audit for client update:', auditError);
            }
          }
        } else if (!existing) {
          // Validar campos requeridos antes de insertar
          if (!cleanRecord.razon_social || !cleanRecord.direccion || !cleanRecord.email) {
            console.warn(`Skipping client ${cleanRecord.cuit} - missing required fields`);
            continue;
          }

          const { data, error } = await supabase
            .from('clients')
            .insert(cleanRecord)
            .select()
            .single();

          if (error) {
            errors.push({ type: 'client_insert', cuit: clientRecord.cuit, error: error.message });
          } else if (data) {
            clientsInserted++;
            try {
              await supabase.from('client_audit_log').insert({
                client_cuit: data.cuit,
                batch_id: batchId,
                operation_type: 'INSERT',
                new_values: data,
                performed_by: user.user.id,
                notes: 'Client inserted from batch upload'
              });
            } catch (auditError) {
              console.warn('Failed to log audit for client insert:', auditError);
            }
          }
        }
      }
    }
    console.log('Clients processed:', { inserted: clientsInserted, updated: clientsUpdated });
  }

  let productsUpdated = 0;

  if (productRecords.length > 0) {
    console.log('Processing products...');
    const chunkSize = 50;

    // Campos protegidos que NO se deben actualizar
    const PROTECTED_FIELDS = ['uuid', 'qr_path', 'qr_link', 'qr_status', 'qr_generated_at', 'created_at'];

    for (let i = 0; i < productRecords.length; i += chunkSize) {
      const chunk = productRecords.slice(i, i + chunkSize);

      for (const productRecord of chunk) {
        // Filtrar campos válidos
        const cleanRecord = filterValidFields(productRecord, 'product');

        const { data: existing } = await supabase
          .from('products')
          .select('*')
          .eq('codificacion', cleanRecord.codificacion)
          .maybeSingle();

        if (!existing) {
          // INSERTAR nuevo producto
          if (!cleanRecord.codificacion || !cleanRecord.cuit) {
            console.warn(`Skipping product - missing required fields`);
            continue;
          }

          const { data, error } = await supabase
            .from('products')
            .insert(cleanRecord)
            .select()
            .single();

          if (error) {
            errors.push({ type: 'product_insert', codificacion: cleanRecord.codificacion, error: error.message });
          } else if (data) {
            productsInserted++;
            try {
              await supabase.from('product_audit_log').insert({
                product_uuid: data.uuid,
                batch_id: batchId,
                operation_type: 'INSERT',
                new_values: data,
                performed_by: user.user.id,
                notes: 'Product inserted from batch upload'
              });
            } catch (auditError) {
              console.warn('Failed to log audit for product insert:', auditError);
            }
          }
        } else {
          // ACTUALIZAR producto existente
          const updateData: any = {};

          // Copiar solo los campos que no están protegidos
          Object.keys(cleanRecord).forEach(key => {
            if (!PROTECTED_FIELDS.includes(key) && key !== 'codificacion') {
              updateData[key] = cleanRecord[key];
            }
          });

          updateData.updated_at = new Date().toISOString();

          const { error } = await supabase
            .from('products')
            .update(updateData)
            .eq('codificacion', cleanRecord.codificacion);

          if (error) {
            errors.push({ type: 'product_update', codificacion: cleanRecord.codificacion, error: error.message });
          } else {
            productsUpdated++;
            try {
              await supabase.from('product_audit_log').insert({
                product_uuid: existing.uuid,
                batch_id: batchId,
                operation_type: 'UPDATE',
                previous_values: existing,
                new_values: { ...existing, ...updateData },
                performed_by: user.user.id,
                notes: 'Product updated from batch upload'
              });
            } catch (auditError) {
              console.warn('Failed to log audit for product update:', auditError);
            }
          }
        }
      }
    }
    console.log('Products processed:', { inserted: productsInserted, updated: productsUpdated });
  }

  return {
    success: errors.length === 0,
    clientsInserted,
    clientsUpdated,
    productsInserted,
    productsUpdated,
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
