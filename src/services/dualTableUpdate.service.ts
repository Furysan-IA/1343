import { supabase } from '../lib/supabase';
import { ExtractionResult } from './certificateProcessing.service';
import { createBackupSnapshot } from './backup.service';
import { logCertificateProcessing } from './certificateDiagnostics.service';

export interface ClientMatch {
  exists: boolean;
  record?: any;
  needsUpdate: boolean;
  isNewer: boolean;
  existingDate?: Date;
}

export interface ProductMatch {
  exists: boolean;
  record?: any;
  needsUpdate: boolean;
  isNewer: boolean;
  existingDate?: Date;
}

export interface DualMatchResult {
  clientMatch: ClientMatch;
  productMatch: ProductMatch;
  extraction: ExtractionResult;

  action: 'insert_both' | 'update_both' | 'insert_client_update_product' |
          'update_client_insert_product' | 'skip' | 'needs_completion';

  isNewClient: boolean;
  missingClientData: string[];
  skipReason?: string;
  dateDifferenceDays?: number;
}

export interface ProcessingStats {
  totalProcessed: number;
  clientsInserted: number;
  clientsUpdated: number;
  productsInserted: number;
  productsUpdated: number;
  skipped: number;
  newClientsNeedingCompletion: number;
  errors: any[];
}

export const checkClientExists = async (
  clientData: any
): Promise<ClientMatch> => {
  if (!clientData || !clientData.cuit) {
    return {
      exists: false,
      needsUpdate: false,
      isNewer: false
    };
  }

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('cuit', clientData.cuit)
    .maybeSingle();

  if (error) {
    console.error('Error checking client:', error);
    return {
      exists: false,
      needsUpdate: false,
      isNewer: false
    };
  }

  if (!data) {
    return {
      exists: false,
      needsUpdate: false,
      isNewer: false
    };
  }

  const existingDate = data.updated_at ? new Date(data.updated_at) : new Date(data.created_at);
  const newDate = new Date(clientData.fecha_emision);
  const isNewer = newDate > existingDate;

  return {
    exists: true,
    record: data,
    needsUpdate: isNewer,
    isNewer,
    existingDate
  };
};

export const checkProductExists = async (
  productData: any
): Promise<ProductMatch> => {
  if (!productData || !productData.codificacion) {
    return {
      exists: false,
      needsUpdate: false,
      isNewer: false
    };
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('codificacion', productData.codificacion)
    .maybeSingle();

  if (error) {
    console.error('Error checking product:', error);
    return {
      exists: false,
      needsUpdate: false,
      isNewer: false
    };
  }

  if (!data) {
    return {
      exists: false,
      needsUpdate: false,
      isNewer: false
    };
  }

  const existingDate = data.updated_at ? new Date(data.updated_at) : new Date(data.created_at);
  const newDate = new Date(productData.fecha_emision);
  const isNewer = newDate > existingDate;

  return {
    exists: true,
    record: data,
    needsUpdate: isNewer,
    isNewer,
    existingDate
  };
};

export const analyzeCertificateForUpdate = async (
  extraction: ExtractionResult
): Promise<DualMatchResult> => {
  const [clientMatch, productMatch] = await Promise.all([
    checkClientExists(extraction.clientData),
    checkProductExists(extraction.productData)
  ]);

  let action: DualMatchResult['action'] = 'skip';
  let isNewClient = false;
  const missingClientData: string[] = [];

  if (!clientMatch.exists && extraction.hasClientData) {
    isNewClient = true;
    if (extraction.missingClientFields.length > 0) {
      missingClientData.push(...extraction.missingClientFields);
      action = 'needs_completion';
    }
  }

  let skipReason: string | undefined;
  let dateDifferenceDays: number | undefined;

  if (!clientMatch.exists && !productMatch.exists) {
    action = 'insert_both';
  } else if (clientMatch.needsUpdate && productMatch.needsUpdate) {
    action = 'update_both';
  } else if (!clientMatch.exists && productMatch.needsUpdate) {
    action = 'insert_client_update_product';
  } else if (clientMatch.needsUpdate && !productMatch.exists) {
    action = 'update_client_insert_product';
  } else if (!clientMatch.needsUpdate && !productMatch.needsUpdate) {
    action = 'skip';

    const certDate = new Date(extraction.originalRecord.fecha_emision);
    const existingClientDate = clientMatch.existingDate;
    const existingProductDate = productMatch.existingDate;

    if (existingClientDate || existingProductDate) {
      const referenceDate = existingClientDate || existingProductDate;
      dateDifferenceDays = Math.floor((referenceDate!.getTime() - certDate.getTime()) / (1000 * 60 * 60 * 24));

      skipReason = `Certificado más antiguo que el registro existente. El certificado es de ${certDate.toLocaleDateString('es-AR')}, pero ya existe un registro de ${referenceDate!.toLocaleDateString('es-AR')} (${dateDifferenceDays} días más reciente)`;
    } else {
      skipReason = 'Certificado no requiere actualización';
    }
  }

  if (missingClientData.length > 0) {
    action = 'needs_completion';
  }

  return {
    clientMatch,
    productMatch,
    extraction,
    action,
    isNewClient,
    missingClientData,
    skipReason,
    dateDifferenceDays
  };
};

export const insertClient = async (clientData: any): Promise<boolean> => {
  if (!clientData) return false;

  const { error } = await supabase
    .from('clients')
    .insert({
      cuit: clientData.cuit,
      razon_social: clientData.razon_social,
      direccion: clientData.direccion,
      email: clientData.email,
      telefono: clientData.telefono,
      contacto: clientData.contacto,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error inserting client:', error);
    return false;
  }

  return true;
};

export const updateClient = async (cuit: string, clientData: any): Promise<boolean> => {
  if (!clientData || !cuit) return false;

  const { error } = await supabase
    .from('clients')
    .update({
      razon_social: clientData.razon_social,
      direccion: clientData.direccion,
      email: clientData.email,
      telefono: clientData.telefono,
      contacto: clientData.contacto,
      updated_at: new Date().toISOString()
    })
    .eq('cuit', cuit);

  if (error) {
    console.error('Error updating client:', error);
    return false;
  }

  return true;
};

const PROTECTED_PRODUCT_FIELDS = [
  'qr_path',
  'qr_link',
  'qr_status',
  'qr_generated_at',
  'djc_path',
  'djc_status',
  'certificado_status',
  'enviado_cliente',
  'uuid',
  'created_at',
  'updated_at',
  'dias_para_vencer'
];

const prepareProductDataForInsert = (productData: any): any => {
  const insertPayload: any = {};

  Object.keys(productData).forEach(key => {
    if (PROTECTED_PRODUCT_FIELDS.includes(key)) {
      return;
    }

    const value = productData[key];
    if (value === null || value === undefined || value === '') {
      return;
    }

    if (key === 'fecha_vencimiento' || key === 'vencimiento') {
      if (value instanceof Date) {
        insertPayload.vencimiento = value.toISOString();
      } else {
        insertPayload.vencimiento = value;
      }
    } else if (key === 'fecha_emision') {
      if (value instanceof Date) {
        insertPayload.fecha_emision = value.toISOString();
      } else {
        insertPayload.fecha_emision = value;
      }
    } else if (key === 'fecha_emision_certificado_extranjero' || key === 'fecha_cancelacion' || key === 'fecha_proxima_vigilancia') {
      if (value instanceof Date) {
        insertPayload[key] = value.toISOString();
      } else {
        insertPayload[key] = value;
      }
    } else if (key === 'titular_responsable' && !insertPayload.titular) {
      insertPayload.titular = value;
    } else {
      insertPayload[key] = value;
    }
  });

  if (productData.certificado_path && productData.certificado_path.trim() !== '') {
    insertPayload.certificado_status = 'Subido';
  }

  insertPayload.created_at = new Date().toISOString();
  insertPayload.updated_at = new Date().toISOString();

  return insertPayload;
};

export const insertProduct = async (productData: any): Promise<boolean> => {
  if (!productData || !productData.codificacion) {
    console.error('Cannot insert product: missing codificacion');
    return false;
  }

  const insertPayload = prepareProductDataForInsert(productData);

  const { error } = await supabase
    .from('products')
    .insert(insertPayload);

  if (error) {
    console.error('Error inserting product:', error);
    return false;
  }

  console.log(`Product inserted: ${productData.codificacion}, fields: ${Object.keys(insertPayload).length}`);
  return true;
};

const prepareProductDataForUpdate = (productData: any): any => {
  const updatePayload: any = {};
  let fieldCount = 0;

  Object.keys(productData).forEach(key => {
    if (PROTECTED_PRODUCT_FIELDS.includes(key)) {
      return;
    }

    if (key === 'codificacion' || key === 'cuit') {
      return;
    }

    const value = productData[key];
    if (value === null || value === undefined || value === '') {
      return;
    }

    if (key === 'fecha_vencimiento' || key === 'vencimiento') {
      if (value instanceof Date) {
        updatePayload.vencimiento = value.toISOString();
      } else {
        updatePayload.vencimiento = value;
      }
      fieldCount++;
    } else if (key === 'fecha_emision') {
      if (value instanceof Date) {
        updatePayload.fecha_emision = value.toISOString();
      } else {
        updatePayload.fecha_emision = value;
      }
      fieldCount++;
    } else if (key === 'fecha_emision_certificado_extranjero' || key === 'fecha_cancelacion' || key === 'fecha_proxima_vigilancia') {
      if (value instanceof Date) {
        updatePayload[key] = value.toISOString();
      } else {
        updatePayload[key] = value;
      }
      fieldCount++;
    } else if (key === 'titular_responsable') {
      updatePayload.titular = value;
      fieldCount++;
    } else {
      updatePayload[key] = value;
      fieldCount++;
    }
  });

  if (productData.certificado_path && productData.certificado_path.trim() !== '') {
    updatePayload.certificado_status = 'Subido';
    fieldCount++;
  }

  updatePayload.updated_at = new Date().toISOString();

  return { payload: updatePayload, fieldCount };
};

export const updateProduct = async (codificacion: string, productData: any): Promise<boolean> => {
  if (!productData || !codificacion) {
    console.error('Cannot update product: missing codificacion or productData');
    return false;
  }

  const { payload, fieldCount } = prepareProductDataForUpdate(productData);

  if (fieldCount === 0) {
    console.warn(`No fields to update for product ${codificacion}`);
    return true;
  }

  const { error } = await supabase
    .from('products')
    .update(payload)
    .eq('codificacion', codificacion);

  if (error) {
    console.error('Error updating product:', error);
    return false;
  }

  console.log(`Product updated: ${codificacion}, fields: ${fieldCount}`);
  return true;
};

export const processAllCertificates = async (
  analyses: DualMatchResult[],
  batchId: string,
  filename: string,
  createBackup: boolean = true
): Promise<ProcessingStats> => {
  if (createBackup) {
    try {
      await createBackupSnapshot(batchId, analyses, filename);
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }

  const stats: ProcessingStats = {
    totalProcessed: 0,
    clientsInserted: 0,
    clientsUpdated: 0,
    productsInserted: 0,
    productsUpdated: 0,
    skipped: 0,
    newClientsNeedingCompletion: 0,
    errors: []
  };

  let rowNumber = 2;
  for (const analysis of analyses) {
    await logCertificateProcessing(batchId, analysis, rowNumber);
    rowNumber++;

    try {
      switch (analysis.action) {
        case 'insert_both':
          if (await insertClient(analysis.extraction.clientData)) {
            stats.clientsInserted++;
          }
          if (await insertProduct(analysis.extraction.productData)) {
            stats.productsInserted++;
          }
          break;

        case 'update_both':
          if (await updateClient(analysis.extraction.clientData.cuit, analysis.extraction.clientData)) {
            stats.clientsUpdated++;
          }
          if (await updateProduct(analysis.extraction.productData.codificacion, analysis.extraction.productData)) {
            stats.productsUpdated++;
          }
          break;

        case 'insert_client_update_product':
          if (await insertClient(analysis.extraction.clientData)) {
            stats.clientsInserted++;
          }
          if (await updateProduct(analysis.extraction.productData.codificacion, analysis.extraction.productData)) {
            stats.productsUpdated++;
          }
          break;

        case 'update_client_insert_product':
          if (await updateClient(analysis.extraction.clientData.cuit, analysis.extraction.clientData)) {
            stats.clientsUpdated++;
          }
          if (await insertProduct(analysis.extraction.productData)) {
            stats.productsInserted++;
          }
          break;

        case 'needs_completion':
          stats.newClientsNeedingCompletion++;
          break;

        case 'skip':
          stats.skipped++;
          break;
      }

      stats.totalProcessed++;
    } catch (error) {
      stats.errors.push({
        record: analysis.extraction.originalRecord,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return stats;
};

export const createBatchRecord = async (
  filename: string,
  totalRecords: number
): Promise<string> => {
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('upload_batches')
    .insert({
      filename,
      file_size: 0,
      total_records: totalRecords,
      uploaded_by: user.user.id,
      status: 'processing'
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data.id;
};

export const updateBatchStats = async (
  batchId: string,
  stats: ProcessingStats
): Promise<void> => {
  const { error } = await supabase
    .from('upload_batches')
    .update({
      processed_records: stats.totalProcessed,
      new_records: stats.clientsInserted + stats.productsInserted,
      updated_records: stats.clientsUpdated + stats.productsUpdated,
      skipped_records: stats.skipped,
      error_records: stats.errors.length,
      status: 'completed',
      completed_at: new Date().toISOString(),
      error_summary: stats.errors
    })
    .eq('id', batchId);

  if (error) {
    console.error('Error updating batch stats:', error);
  }
};
