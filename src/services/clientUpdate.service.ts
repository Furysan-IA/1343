import { supabase } from '../lib/supabase';
import { ClientRecord } from './fileValidation.service';
import { MatchResult } from './clientMatching.service';

export interface BatchMetadata {
  filename: string;
  fileSize: number;
  totalRecords: number;
  referenceDate?: Date;
}

export interface UpdateOperation {
  cuit: string;
  operation: 'insert' | 'update' | 'skip';
  success: boolean;
  error?: string;
  previousValues?: any;
  newValues?: any;
}

export interface ProcessingReport {
  batchId: string;
  summary: {
    totalRecords: number;
    processed: number;
    inserted: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  operations: UpdateOperation[];
  processingTimeMs: number;
  startTime: string;
  endTime: string;
}

export const createBatch = async (
  metadata: BatchMetadata,
  userId: string
): Promise<string> => {
  const { data, error } = await supabase
    .from('upload_batches')
    .insert({
      filename: metadata.filename,
      file_size: metadata.fileSize,
      total_records: metadata.totalRecords,
      status: 'processing',
      uploaded_by: userId,
      reference_date: metadata.referenceDate?.toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Error al crear el lote: ${error.message}`);
  }

  return data.id;
};

export const updateBatchStatus = async (
  batchId: string,
  status: string,
  stats?: {
    processed?: number;
    new_records?: number;
    updated_records?: number;
    skipped_records?: number;
    error_records?: number;
    processing_time_ms?: number;
  }
): Promise<void> => {
  const updates: any = {
    status,
    ...(stats || {}),
  };

  if (status === 'completed' || status === 'failed') {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('upload_batches')
    .update(updates)
    .eq('id', batchId);

  if (error) {
    throw new Error(`Error al actualizar el lote: ${error.message}`);
  }
};

export const insertClient = async (
  client: ClientRecord,
  batchId: string,
  userId: string
): Promise<UpdateOperation> => {
  const startTime = Date.now();

  try {
    const cuitNumber = parseInt(client.cuit.replace(/[-\s]/g, ''), 10);

    const { error } = await supabase.from('clients').insert({
      cuit: cuitNumber,
      razon_social: client.razon_social,
      email: client.email,
      telefono: client.telefono || null,
      direccion: client.direccion,
      contacto: client.contacto || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    await supabase.from('client_audit_log').insert({
      client_cuit: cuitNumber,
      batch_id: batchId,
      operation_type: 'INSERT',
      new_values: client,
      performed_by: userId,
    });

    return {
      cuit: client.cuit,
      operation: 'insert',
      success: true,
      newValues: client,
    };
  } catch (error: any) {
    return {
      cuit: client.cuit,
      operation: 'insert',
      success: false,
      error: error.message,
    };
  }
};

export const updateClient = async (
  existingCuit: number,
  newData: ClientRecord,
  batchId: string,
  userId: string
): Promise<UpdateOperation> => {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('cuit', existingCuit)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        razon_social: newData.razon_social,
        email: newData.email,
        telefono: newData.telefono || null,
        direccion: newData.direccion,
        contacto: newData.contacto || null,
        updated_at: new Date().toISOString(),
      })
      .eq('cuit', existingCuit);

    if (updateError) {
      throw updateError;
    }

    const changedFields: string[] = [];
    const previousValues: any = {};
    const newValues: any = {};

    Object.keys(newData).forEach((key) => {
      if (key === 'cuit' || key === 'last_modified') return;

      const oldVal = existing[key];
      const newVal = newData[key as keyof ClientRecord];

      if (oldVal !== newVal) {
        changedFields.push(key);
        previousValues[key] = oldVal;
        newValues[key] = newVal;
      }
    });

    await supabase.from('client_audit_log').insert({
      client_cuit: existingCuit,
      batch_id: batchId,
      operation_type: 'UPDATE',
      changed_fields: changedFields,
      previous_values: previousValues,
      new_values: newValues,
      performed_by: userId,
    });

    return {
      cuit: existingCuit.toString(),
      operation: 'update',
      success: true,
      previousValues,
      newValues,
    };
  } catch (error: any) {
    return {
      cuit: existingCuit.toString(),
      operation: 'update',
      success: false,
      error: error.message,
    };
  }
};

export const skipClient = async (
  client: ClientRecord,
  batchId: string,
  userId: string,
  reason: string
): Promise<UpdateOperation> => {
  try {
    const cuitNumber = parseInt(client.cuit.replace(/[-\s]/g, ''), 10);

    await supabase.from('client_audit_log').insert({
      client_cuit: cuitNumber,
      batch_id: batchId,
      operation_type: 'SKIP',
      new_values: client,
      performed_by: userId,
      notes: reason,
    });

    return {
      cuit: client.cuit,
      operation: 'skip',
      success: true,
    };
  } catch (error: any) {
    return {
      cuit: client.cuit,
      operation: 'skip',
      success: false,
      error: error.message,
    };
  }
};

export const processBatchOperations = async (
  operations: Array<{
    match: MatchResult;
    action: 'add' | 'update' | 'skip';
  }>,
  batchId: string,
  userId: string
): Promise<UpdateOperation[]> => {
  const results: UpdateOperation[] = [];

  for (const op of operations) {
    let result: UpdateOperation;

    if (op.action === 'add') {
      result = await insertClient(op.match.uploadedClient, batchId, userId);
    } else if (op.action === 'update' && op.match.existingClient) {
      result = await updateClient(
        op.match.existingClient.cuit,
        op.match.uploadedClient,
        batchId,
        userId
      );
    } else {
      result = await skipClient(
        op.match.uploadedClient,
        batchId,
        userId,
        'Usuario omitió la operación'
      );
    }

    results.push(result);
  }

  return results;
};

export const generateReport = async (
  batchId: string
): Promise<ProcessingReport> => {
  const { data: batch, error: batchError } = await supabase
    .from('upload_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (batchError) {
    throw new Error(`Error al cargar el lote: ${batchError.message}`);
  }

  const { data: operations, error: opsError } = await supabase
    .from('client_audit_log')
    .select('*')
    .eq('batch_id', batchId)
    .order('performed_at');

  if (opsError) {
    throw new Error(`Error al cargar las operaciones: ${opsError.message}`);
  }

  const operationResults: UpdateOperation[] = (operations || []).map((op) => ({
    cuit: op.client_cuit.toString(),
    operation: op.operation_type.toLowerCase() as 'insert' | 'update' | 'skip',
    success: true,
    previousValues: op.previous_values,
    newValues: op.new_values,
  }));

  const summary = {
    totalRecords: batch.total_records,
    processed: batch.processed_records || 0,
    inserted: batch.new_records || 0,
    updated: batch.updated_records || 0,
    skipped: batch.skipped_records || 0,
    errors: batch.error_records || 0,
  };

  return {
    batchId,
    summary,
    operations: operationResults,
    processingTimeMs: batch.processing_time_ms || 0,
    startTime: batch.uploaded_at,
    endTime: batch.completed_at || new Date().toISOString(),
  };
};

export const savePotentialDuplicate = async (
  batchId: string,
  match: MatchResult
): Promise<void> => {
  if (match.type !== 'potential' || !match.existingClient) return;

  const { error } = await supabase.from('potential_duplicates').insert({
    batch_id: batchId,
    existing_client_cuit: match.existingClient.cuit,
    uploaded_client_data: match.uploadedClient,
    confidence_score: match.confidence,
    match_criteria: match.matchCriteria,
    resolution_status: 'pending',
  });

  if (error) {
    console.error('Error al guardar duplicado potencial:', error);
  }
};

export const addToUndoStack = async (
  sessionId: string,
  batchId: string,
  actionType: string,
  actionData: any,
  userId: string
): Promise<void> => {
  const { data: recentActions } = await supabase
    .from('undo_stack')
    .select('id')
    .eq('session_id', sessionId)
    .eq('is_undone', false)
    .order('created_at', { ascending: false });

  if (recentActions && recentActions.length >= 5) {
    const toDelete = recentActions.slice(4);
    await supabase
      .from('undo_stack')
      .delete()
      .in(
        'id',
        toDelete.map((a) => a.id)
      );
  }

  await supabase.from('undo_stack').insert({
    session_id: sessionId,
    batch_id: batchId,
    action_type: actionType,
    action_data: actionData,
    user_id: userId,
  });
};

export const getUndoStack = async (
  sessionId: string
): Promise<any[]> => {
  const { data, error } = await supabase
    .from('undo_stack')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_undone', false)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error al cargar el stack de deshacer:', error);
    return [];
  }

  return data || [];
};

export const undoAction = async (
  actionId: string,
  userId: string
): Promise<boolean> => {
  try {
    const { data: action, error: fetchError } = await supabase
      .from('undo_stack')
      .select('*')
      .eq('id', actionId)
      .single();

    if (fetchError || !action) {
      throw new Error('Acción no encontrada');
    }

    if (action.action_type === 'add_client') {
      const cuit = parseInt(action.action_data.cuit, 10);
      await supabase.from('clients').delete().eq('cuit', cuit);

      await supabase.from('client_audit_log').insert({
        client_cuit: cuit,
        batch_id: action.batch_id,
        operation_type: 'DELETE',
        previous_values: action.action_data,
        performed_by: userId,
        notes: 'Acción deshecha por el usuario',
      });
    }

    await supabase
      .from('undo_stack')
      .update({ is_undone: true })
      .eq('id', actionId);

    return true;
  } catch (error: any) {
    console.error('Error al deshacer acción:', error);
    return false;
  }
};
