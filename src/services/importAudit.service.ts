import { supabase } from '../lib/supabase';
import { DetailedAnalysisResult } from '../types/changeAnalysis.types';

export interface ImportLogEntry {
  id?: string;
  user_id?: string;
  batch_id: string;
  operation_type: 'preview' | 'import';
  records_affected: number;
  changes_summary: any;
  status: 'success' | 'error' | 'partial';
  error_details?: string;
  created_at?: string;
}

export async function logImportOperation(logEntry: ImportLogEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('data_import_logs')
      .insert({
        user_id: user?.id,
        batch_id: logEntry.batch_id,
        operation_type: logEntry.operation_type,
        records_affected: logEntry.records_affected,
        changes_summary: logEntry.changes_summary,
        status: logEntry.status,
        error_details: logEntry.error_details
      });

    if (error) {
      console.error('Error logging import operation:', error);
    }
  } catch (error) {
    console.error('Failed to log import operation:', error);
  }
}

export async function logPreview(
  batchId: string,
  analysis: DetailedAnalysisResult
): Promise<void> {
  await logImportOperation({
    batch_id: batchId,
    operation_type: 'preview',
    records_affected: analysis.summary.totalProducts + analysis.summary.totalClients,
    changes_summary: {
      summary: analysis.summary,
      warnings: analysis.globalWarnings.length,
      criticalChanges: analysis.summary.criticalChanges
    },
    status: 'success'
  });
}

export async function logImportSuccess(
  batchId: string,
  productsProcessed: { inserted: number; updated: number; skipped: number },
  clientsProcessed: { inserted: number; updated: number; skipped: number }
): Promise<void> {
  await logImportOperation({
    batch_id: batchId,
    operation_type: 'import',
    records_affected:
      productsProcessed.inserted +
      productsProcessed.updated +
      clientsProcessed.inserted +
      clientsProcessed.updated,
    changes_summary: {
      products: productsProcessed,
      clients: clientsProcessed
    },
    status: 'success'
  });
}

export async function logImportError(
  batchId: string,
  errorMessage: string,
  partialResults?: any
): Promise<void> {
  await logImportOperation({
    batch_id: batchId,
    operation_type: 'import',
    records_affected: 0,
    changes_summary: partialResults || {},
    status: 'error',
    error_details: errorMessage
  });
}

export async function getImportHistory(limit: number = 50): Promise<ImportLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('data_import_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching import history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch import history:', error);
    return [];
  }
}
