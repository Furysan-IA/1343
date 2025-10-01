import { supabase } from '../lib/supabase';
import { DualMatchResult } from './dualTableUpdate.service';

export interface BackupSnapshot {
  id: string;
  batch_id: string;
  snapshot_type: 'before_processing';
  total_clients_backed_up: number;
  total_products_backed_up: number;
  created_by: string;
  created_at: string;
  metadata: {
    filename?: string;
    description?: string;
    affected_clients: string[];
    affected_products: string[];
  };
}

export interface RestoreResult {
  success: boolean;
  clients_restored: number;
  products_restored: number;
  errors: string[];
}

export const createBackupSnapshot = async (
  batchId: string,
  analyses: DualMatchResult[],
  filename: string
): Promise<string> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const affectedClientCUITs: string[] = [];
  const affectedProductCodes: string[] = [];

  analyses.forEach(analysis => {
    if (analysis.clientMatch.exists && analysis.clientMatch.record) {
      affectedClientCUITs.push(analysis.clientMatch.record.cuit);
    }
    if (analysis.productMatch.exists && analysis.productMatch.record) {
      affectedProductCodes.push(analysis.productMatch.record.codificacion);
    }
  });

  const { data: snapshot, error: snapshotError } = await supabase
    .from('backup_snapshots')
    .insert({
      batch_id: batchId,
      snapshot_type: 'before_processing',
      created_by: user.user.id,
      metadata: {
        filename,
        description: `Backup before processing ${filename}`,
        affected_clients: affectedClientCUITs,
        affected_products: affectedProductCodes
      }
    })
    .select()
    .single();

  if (snapshotError) throw snapshotError;

  let clientsBackedUp = 0;
  let productsBackedUp = 0;

  if (affectedClientCUITs.length > 0) {
    const { data: clientsToBackup } = await supabase
      .from('clients')
      .select('*')
      .in('cuit', affectedClientCUITs);

    if (clientsToBackup && clientsToBackup.length > 0) {
      const backupRecords = clientsToBackup.map(client => ({
        snapshot_id: snapshot.id,
        original_client_id: client.id,
        client_data: client
      }));

      const { error: clientBackupError } = await supabase
        .from('backup_clients')
        .insert(backupRecords);

      if (clientBackupError) {
        console.error('Error backing up clients:', clientBackupError);
      } else {
        clientsBackedUp = clientsToBackup.length;
      }
    }
  }

  if (affectedProductCodes.length > 0) {
    const { data: productsToBackup } = await supabase
      .from('products')
      .select('*')
      .in('codificacion', affectedProductCodes);

    if (productsToBackup && productsToBackup.length > 0) {
      const backupRecords = productsToBackup.map(product => ({
        snapshot_id: snapshot.id,
        original_product_id: product.id,
        product_data: product
      }));

      const { error: productBackupError } = await supabase
        .from('backup_products')
        .insert(backupRecords);

      if (productBackupError) {
        console.error('Error backing up products:', productBackupError);
      } else {
        productsBackedUp = productsToBackup.length;
      }
    }
  }

  await supabase
    .from('backup_snapshots')
    .update({
      total_clients_backed_up: clientsBackedUp,
      total_products_backed_up: productsBackedUp
    })
    .eq('id', snapshot.id);

  return snapshot.id;
};

export const restoreFromSnapshot = async (
  snapshotId: string
): Promise<RestoreResult> => {
  const result: RestoreResult = {
    success: false,
    clients_restored: 0,
    products_restored: 0,
    errors: []
  };

  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data: backedUpClients } = await supabase
      .from('backup_clients')
      .select('*')
      .eq('snapshot_id', snapshotId);

    if (backedUpClients && backedUpClients.length > 0) {
      for (const backup of backedUpClients) {
        const clientData = backup.client_data as any;

        const { error } = await supabase
          .from('clients')
          .update({
            ...clientData,
            updated_at: new Date().toISOString()
          })
          .eq('id', backup.original_client_id);

        if (error) {
          result.errors.push(`Error restoring client ${clientData.cuit}: ${error.message}`);
        } else {
          result.clients_restored++;
        }
      }
    }

    const { data: backedUpProducts } = await supabase
      .from('backup_products')
      .select('*')
      .eq('snapshot_id', snapshotId);

    if (backedUpProducts && backedUpProducts.length > 0) {
      for (const backup of backedUpProducts) {
        const productData = backup.product_data as any;

        const { error } = await supabase
          .from('products')
          .update({
            ...productData,
            updated_at: new Date().toISOString()
          })
          .eq('id', backup.original_product_id);

        if (error) {
          result.errors.push(`Error restoring product ${productData.codificacion}: ${error.message}`);
        } else {
          result.products_restored++;
        }
      }
    }

    const status = result.errors.length === 0
      ? 'completed'
      : result.clients_restored > 0 || result.products_restored > 0
        ? 'partial'
        : 'failed';

    await supabase
      .from('restore_history')
      .insert({
        snapshot_id: snapshotId,
        restored_by: user.user.id,
        clients_restored: result.clients_restored,
        products_restored: result.products_restored,
        status,
        error_log: { errors: result.errors }
      });

    result.success = result.errors.length === 0;
    return result;
  } catch (error: any) {
    result.errors.push(error.message);
    return result;
  }
};

export const getBackupHistory = async (): Promise<BackupSnapshot[]> => {
  const { data, error } = await supabase
    .from('backup_snapshots')
    .select(`
      *,
      upload_batches(filename)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching backup history:', error);
    return [];
  }

  return data || [];
};

export const getSnapshotDetails = async (snapshotId: string) => {
  const [snapshotResult, clientsResult, productsResult, restoreResult] = await Promise.all([
    supabase
      .from('backup_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single(),

    supabase
      .from('backup_clients')
      .select('client_data')
      .eq('snapshot_id', snapshotId),

    supabase
      .from('backup_products')
      .select('product_data')
      .eq('snapshot_id', snapshotId),

    supabase
      .from('restore_history')
      .select('*')
      .eq('snapshot_id', snapshotId)
      .order('restored_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  return {
    snapshot: snapshotResult.data,
    clients: clientsResult.data?.map(b => b.client_data) || [],
    products: productsResult.data?.map(b => b.product_data) || [],
    lastRestore: restoreResult.data
  };
};

export const deleteSnapshot = async (snapshotId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('backup_snapshots')
    .delete()
    .eq('id', snapshotId);

  if (error) {
    console.error('Error deleting snapshot:', error);
    return false;
  }

  return true;
};
