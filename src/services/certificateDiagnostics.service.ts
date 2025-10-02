import { supabase } from '../lib/supabase';
import { DualMatchResult } from './dualTableUpdate.service';
import { RejectedRecord } from './certificateProcessing.service';
import * as XLSX from 'xlsx';

export interface CertificateLogEntry {
  id?: string;
  batch_id: string;
  row_number?: number;
  action_taken: string;
  skip_reason?: string;
  certificate_date?: string;
  existing_date?: string;
  cuit?: string;
  codificacion?: string;
  razon_social?: string;
  missing_fields?: string[];
  raw_data?: any;
}

export interface DiagnosticReport {
  batchId: string;
  filename: string;
  totalInFile: number;
  totalProcessed: number;
  totalSkipped: number;
  totalRejected: number;

  skippedByReason: {
    reason: string;
    count: number;
    certificates: CertificateLogEntry[];
  }[];

  rejectedRecords: RejectedRecord[];

  actionBreakdown: {
    action: string;
    count: number;
    description: string;
  }[];

  dateFilterStats?: {
    beforeFilter: number;
    afterFilter: number;
    excludedByDate: number;
  };
}

export const logCertificateProcessing = async (
  batchId: string,
  analysis: DualMatchResult,
  rowNumber?: number
): Promise<void> => {
  try {
    const entry: CertificateLogEntry = {
      batch_id: batchId,
      row_number: rowNumber,
      action_taken: analysis.action,
      certificate_date: analysis.extraction.originalRecord.fecha_emision?.toISOString(),
      cuit: analysis.extraction.clientData?.cuit?.toString(),
      codificacion: analysis.extraction.productData?.codificacion,
      razon_social: analysis.extraction.clientData?.razon_social,
      missing_fields: analysis.missingClientData.length > 0 ? analysis.missingClientData : [],
      raw_data: analysis.extraction.originalRecord
    };

    if (analysis.action === 'skip' && analysis.skipReason) {
      entry.skip_reason = analysis.skipReason;
      entry.existing_date = analysis.clientMatch.existingDate?.toISOString() ||
                           analysis.productMatch.existingDate?.toISOString();
    }

    if (analysis.action === 'needs_completion') {
      entry.skip_reason = `Cliente nuevo incompleto. Campos faltantes: ${analysis.missingClientData.join(', ')}`;
    }

    await supabase
      .from('certificate_processing_log')
      .insert(entry);
  } catch (error) {
    console.error('Error logging certificate processing:', error);
  }
};

export const logRejectedRecord = async (
  batchId: string,
  rejected: RejectedRecord
): Promise<void> => {
  try {
    const entry: CertificateLogEntry = {
      batch_id: batchId,
      row_number: rejected.rowNumber,
      action_taken: 'rejected',
      skip_reason: rejected.reason,
      missing_fields: rejected.missingFields || [],
      raw_data: rejected.data
    };

    await supabase
      .from('certificate_processing_log')
      .insert(entry);
  } catch (error) {
    console.error('Error logging rejected record:', error);
  }
};

export const generateDiagnosticReport = async (
  batchId: string,
  filename: string,
  totalInFile: number
): Promise<DiagnosticReport> => {
  const { data: logs, error } = await supabase
    .from('certificate_processing_log')
    .select('*')
    .eq('batch_id', batchId)
    .order('row_number', { ascending: true });

  if (error) {
    console.error('Error fetching diagnostic logs:', error);
    throw new Error('No se pudo generar el reporte de diagnóstico');
  }

  if (!logs || logs.length === 0) {
    return {
      batchId,
      filename,
      totalInFile,
      totalProcessed: 0,
      totalSkipped: 0,
      totalRejected: 0,
      skippedByReason: [],
      rejectedRecords: [],
      actionBreakdown: []
    };
  }

  const skippedLogs = logs.filter(log => log.action_taken === 'skip');
  const rejectedLogs = logs.filter(log => log.action_taken === 'rejected');
  const processedLogs = logs.filter(log =>
    log.action_taken !== 'skip' &&
    log.action_taken !== 'rejected' &&
    log.action_taken !== 'needs_completion'
  );

  const skippedByReasonMap = new Map<string, CertificateLogEntry[]>();
  skippedLogs.forEach(log => {
    const reason = log.skip_reason || 'Sin razón especificada';
    if (!skippedByReasonMap.has(reason)) {
      skippedByReasonMap.set(reason, []);
    }
    skippedByReasonMap.get(reason)!.push(log as CertificateLogEntry);
  });

  const skippedByReason = Array.from(skippedByReasonMap.entries()).map(([reason, certificates]) => ({
    reason,
    count: certificates.length,
    certificates
  }));

  const actionCountMap = new Map<string, number>();
  logs.forEach(log => {
    const action = log.action_taken;
    actionCountMap.set(action, (actionCountMap.get(action) || 0) + 1);
  });

  const actionDescriptions: Record<string, string> = {
    'insert_both': 'Nuevos clientes y productos insertados',
    'update_both': 'Clientes y productos actualizados',
    'insert_client_update_product': 'Cliente nuevo insertado, producto actualizado',
    'update_client_insert_product': 'Cliente actualizado, producto nuevo insertado',
    'skip': 'Certificados omitidos (más antiguos)',
    'needs_completion': 'Clientes nuevos que necesitan completar información',
    'rejected': 'Registros rechazados durante parseo'
  };

  const actionBreakdown = Array.from(actionCountMap.entries()).map(([action, count]) => ({
    action,
    count,
    description: actionDescriptions[action] || action
  }));

  const rejectedRecords: RejectedRecord[] = rejectedLogs.map(log => ({
    rowNumber: log.row_number || 0,
    reason: log.skip_reason || 'Desconocido',
    data: log.raw_data || {},
    missingFields: Array.isArray(log.missing_fields) ? log.missing_fields as string[] : []
  }));

  return {
    batchId,
    filename,
    totalInFile,
    totalProcessed: processedLogs.length,
    totalSkipped: skippedLogs.length,
    totalRejected: rejectedLogs.length,
    skippedByReason,
    rejectedRecords,
    actionBreakdown
  };
};

export const exportDiagnosticToExcel = (report: DiagnosticReport): void => {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['Reporte de Diagnóstico de Certificados'],
    ['Archivo:', report.filename],
    ['Batch ID:', report.batchId],
    [''],
    ['Total de registros en archivo:', report.totalInFile],
    ['Total procesados:', report.totalProcessed],
    ['Total omitidos:', report.totalSkipped],
    ['Total rechazados:', report.totalRejected],
    [''],
    ['Desglose por Acción:'],
    ['Acción', 'Cantidad', 'Descripción'],
    ...report.actionBreakdown.map(item => [item.action, item.count, item.description])
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

  if (report.skippedByReason.length > 0) {
    const skippedData = [
      ['Certificados Omitidos'],
      [''],
      ['Razón', 'Cantidad'],
      ...report.skippedByReason.map(item => [item.reason, item.count]),
      [''],
      ['Detalle de Certificados Omitidos:'],
      ['Fila', 'CUIT', 'Codificación', 'Razón Social', 'Fecha Certificado', 'Fecha Existente', 'Razón']
    ];

    report.skippedByReason.forEach(group => {
      group.certificates.forEach(cert => {
        skippedData.push([
          cert.row_number?.toString() || 'N/A',
          cert.cuit || 'N/A',
          cert.codificacion || 'N/A',
          cert.razon_social || 'N/A',
          cert.certificate_date ? new Date(cert.certificate_date).toLocaleDateString('es-AR') : 'N/A',
          cert.existing_date ? new Date(cert.existing_date).toLocaleDateString('es-AR') : 'N/A',
          cert.skip_reason || 'N/A'
        ]);
      });
    });

    const skippedWs = XLSX.utils.aoa_to_sheet(skippedData);
    XLSX.utils.book_append_sheet(wb, skippedWs, 'Omitidos');
  }

  if (report.rejectedRecords.length > 0) {
    const rejectedData = [
      ['Registros Rechazados'],
      [''],
      ['Fila', 'Razón', 'Campos Faltantes'],
      ...report.rejectedRecords.map(item => [
        item.rowNumber.toString(),
        item.reason,
        item.missingFields?.join(', ') || 'N/A'
      ])
    ];

    const rejectedWs = XLSX.utils.aoa_to_sheet(rejectedData);
    XLSX.utils.book_append_sheet(wb, rejectedWs, 'Rechazados');
  }

  XLSX.writeFile(wb, `diagnostico_certificados_${report.batchId}.xlsx`);
};

export const getSkippedCertificatesByBatch = async (batchId: string): Promise<CertificateLogEntry[]> => {
  const { data, error } = await supabase
    .from('certificate_processing_log')
    .select('*')
    .eq('batch_id', batchId)
    .eq('action_taken', 'skip')
    .order('row_number', { ascending: true });

  if (error) {
    console.error('Error fetching skipped certificates:', error);
    return [];
  }

  return (data || []) as CertificateLogEntry[];
};

export const getRejectedRecordsByBatch = async (batchId: string): Promise<CertificateLogEntry[]> => {
  const { data, error } = await supabase
    .from('certificate_processing_log')
    .select('*')
    .eq('batch_id', batchId)
    .eq('action_taken', 'rejected')
    .order('row_number', { ascending: true });

  if (error) {
    console.error('Error fetching rejected records:', error);
    return [];
  }

  return (data || []) as CertificateLogEntry[];
};
