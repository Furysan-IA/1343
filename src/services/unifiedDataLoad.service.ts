import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

export interface UnifiedRecord {
  client: ClientData;
  product: ProductData;
}

export interface ClientData {
  cuit: number;
  razon_social: string;
  direccion: string;
  email: string;
  [key: string]: any;
}

export interface ProductData {
  codificacion: string;
  cuit: number;
  producto: string;
  marca?: string;
  modelo?: string;
  fecha_emision?: string;
  vencimiento?: string;
  [key: string]: any;
}

export interface ProcessResult {
  success: boolean;
  clientsProcessed: {
    inserted: number;
    updated: number;
    skipped: number;
  };
  productsProcessed: {
    inserted: number;
    updated: number;
    skipped: number;
  };
  errors: Array<{
    row: number;
    message: string;
    data?: any;
  }>;
}

const CLIENT_FIELDS = [
  'cuit', 'razon_social', 'direccion', 'email', 'telefono', 'contacto'
];

const PRODUCT_PROTECTED_FIELDS = [
  'qr_path', 'qr_link', 'certificado_path', 'djc_path',
  'qr_config', 'djc_status', 'certificado_status'
];

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

const parseDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return new Date(date.y, date.m - 1, date.d);
  }

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const parseUnifiedFile = async (file: File): Promise<UnifiedRecord[]> => {
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
          reject(new Error('Archivo vacío'));
          return;
        }

        const headers = (jsonData[0] as any[]).map(h => normalizeHeader(String(h)));
        const records: UnifiedRecord[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.every(cell => !cell)) continue;

          const fullRecord: any = {};
          headers.forEach((header, index) => {
            const value = row[index];
            if (value !== undefined && value !== null && value !== '') {
              if (header.includes('fecha') || header.includes('vencimiento') || header.includes('emision')) {
                const parsed = parseDate(value);
                fullRecord[header] = parsed ? parsed.toISOString() : value;
              } else if (header === 'cuit') {
                fullRecord[header] = parseInt(String(value).replace(/\D/g, ''));
              } else {
                fullRecord[header] = value;
              }
            }
          });

          const clientData: any = {};
          const productData: any = {};

          Object.keys(fullRecord).forEach(key => {
            if (CLIENT_FIELDS.includes(key)) {
              clientData[key] = fullRecord[key];
            } else {
              productData[key] = fullRecord[key];
            }
          });

          if (clientData.cuit && productData.codificacion) {
            productData.cuit = clientData.cuit;
            records.push({
              client: clientData as ClientData,
              product: productData as ProductData
            });
          }
        }

        console.log(`Parsed ${records.length} unified records`);
        resolve(records);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
};

export const processUnifiedData = async (
  records: UnifiedRecord[],
  batchId: string
): Promise<ProcessResult> => {
  const result: ProcessResult = {
    success: true,
    clientsProcessed: { inserted: 0, updated: 0, skipped: 0 },
    productsProcessed: { inserted: 0, updated: 0, skipped: 0 },
    errors: []
  };

  console.log(`Processing ${records.length} unified records...`);

  const uniqueClients = new Map<number, ClientData>();
  records.forEach(record => {
    uniqueClients.set(record.client.cuit, record.client);
  });

  console.log(`Unique clients: ${uniqueClients.size}`);

  for (const [cuit, clientData] of uniqueClients) {
    try {
      const { data: existing } = await supabase
        .from('clients')
        .select('*')
        .eq('cuit', cuit)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('clients')
          .update({
            razon_social: clientData.razon_social,
            direccion: clientData.direccion,
            email: clientData.email,
            updated_at: new Date().toISOString()
          })
          .eq('cuit', cuit);

        if (error) {
          console.error(`Error updating client ${cuit}:`, error);
          result.errors.push({ row: 0, message: `Client ${cuit}: ${error.message}` });
        } else {
          result.clientsProcessed.updated++;
        }
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(clientData);

        if (error) {
          console.error(`Error inserting client ${cuit}:`, error);
          result.errors.push({ row: 0, message: `Client ${cuit}: ${error.message}` });
        } else {
          result.clientsProcessed.inserted++;
        }
      }
    } catch (error: any) {
      console.error(`Exception processing client ${cuit}:`, error);
      result.errors.push({ row: 0, message: `Client ${cuit}: ${error.message}` });
    }
  }

  console.log('Clients processed. Now processing products...');

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const productData = record.product;

    try {
      const { data: existing } = await supabase
        .from('products')
        .select('*')
        .eq('codificacion', productData.codificacion)
        .maybeSingle();

      if (existing) {
        const updateData: any = {};

        Object.keys(productData).forEach(key => {
          if (!PRODUCT_PROTECTED_FIELDS.includes(key) &&
              key !== 'codificacion' &&
              key !== 'created_at' &&
              key !== 'updated_at') {
            updateData[key] = productData[key];
          }
        });

        updateData.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from('products')
          .update(updateData)
          .eq('codificacion', productData.codificacion);

        if (error) {
          console.error(`Error updating product ${productData.codificacion}:`, error);
          result.errors.push({
            row: i + 1,
            message: `Product ${productData.codificacion}: ${error.message}`
          });
        } else {
          result.productsProcessed.updated++;
        }
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) {
          console.error(`Error inserting product ${productData.codificacion}:`, error);
          result.errors.push({
            row: i + 1,
            message: `Product ${productData.codificacion}: ${error.message}`,
            data: productData
          });
        } else {
          result.productsProcessed.inserted++;
        }
      }
    } catch (error: any) {
      console.error(`Exception processing product ${productData.codificacion}:`, error);
      result.errors.push({
        row: i + 1,
        message: `Product ${productData.codificacion}: ${error.message}`
      });
    }
  }

  await supabase
    .from('upload_batches')
    .update({
      status: result.errors.length === 0 ? 'completed' : 'completed_with_errors',
      processed_records: records.length,
      new_records: result.clientsProcessed.inserted + result.productsProcessed.inserted,
      updated_records: result.clientsProcessed.updated + result.productsProcessed.updated,
      error_count: result.errors.length
    })
    .eq('id', batchId);

  result.success = result.errors.length === 0;

  console.log('Processing complete:', result);
  return result;
};
