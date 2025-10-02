import { supabase } from '@/lib/supabase';
import { Client, Product, UploadBatch } from '@/types/upload.types';

export class DatabaseService {
  async getAllClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('razon_social');

    if (error) throw new Error(`Error obteniendo clientes: ${error.message}`);
    return data || [];
  }

  async getClientByCuit(cuit: number): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('cuit', cuit)
      .maybeSingle();

    if (error) {
      throw new Error(`Error obteniendo cliente: ${error.message}`);
    }
    return data;
  }

  async getClientsByCuits(cuits: number[]): Promise<Client[]> {
    console.log(`🔍 DatabaseService - Verificando ${cuits.length} CUITs específicos...`);

    if (cuits.length === 0) return [];

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .in('cuit', cuits);

    if (error) {
      console.error('❌ Error obteniendo clientes por CUIT:', error);
      throw new Error(`Error obteniendo clientes por CUIT: ${error.message}`);
    }

    console.log(`✅ Clientes existentes encontrados: ${data?.length || 0} de ${cuits.length}`);

    return data || [];
  }

  async getAllProducts(): Promise<Product[]> {
    console.log('🔍 DatabaseService - Obteniendo todos los productos existentes...');
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('codificacion');

    if (error) {
      console.error('❌ Error obteniendo productos:', error);
      throw new Error(`Error obteniendo productos: ${error.message}`);
    }

    console.log(`✅ Productos existentes obtenidos: ${data?.length || 0}`);
    if (data && data.length > 0) {
      console.log(`📋 Primeras 3 codificaciones existentes:`, data.slice(0, 3).map(p => p.codificacion));
    }

    return data || [];
  }

  async getProductByCodificacion(codificacion: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('codificacion', codificacion)
      .maybeSingle();

    if (error) {
      throw new Error(`Error obteniendo producto: ${error.message}`);
    }
    return data;
  }

  async getProductsByCodificaciones(codificaciones: string[]): Promise<Product[]> {
    console.log(`🔍 DatabaseService - Verificando ${codificaciones.length} codificaciones específicas...`);

    if (codificaciones.length === 0) return [];

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('codificacion', codificaciones);

    if (error) {
      console.error('❌ Error obteniendo productos por codificación:', error);
      throw new Error(`Error obteniendo productos por codificación: ${error.message}`);
    }

    console.log(`✅ Productos existentes encontrados: ${data?.length || 0} de ${codificaciones.length}`);
    if (data && data.length > 0) {
      console.log(`📋 Primeras 3 codificaciones encontradas:`, data.slice(0, 3).map(p => p.codificacion));
    }

    return data || [];
  }

  async insertClient(client: Client, userId: string, batchId: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .insert({
        ...client,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) throw new Error(`Error insertando cliente: ${error.message}`);

    await this.logClientAudit({
      client_cuit: client.cuit,
      batch_id: batchId,
      operation_type: 'INSERT',
      new_values: client,
      performed_by: userId,
      notes: 'Cliente creado desde carga masiva'
    });
  }

  async updateClient(client: Client, userId: string, batchId: string, previousValues: Client): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({
        ...client,
        updated_at: new Date().toISOString()
      })
      .eq('cuit', client.cuit);

    if (error) throw new Error(`Error actualizando cliente: ${error.message}`);

    const changedFields: any = {};
    Object.keys(client).forEach(key => {
      if ((client as any)[key] !== (previousValues as any)[key]) {
        changedFields[key] = true;
      }
    });

    await this.logClientAudit({
      client_cuit: client.cuit,
      batch_id: batchId,
      operation_type: 'UPDATE',
      changed_fields: changedFields,
      previous_values: previousValues,
      new_values: client,
      performed_by: userId,
      notes: 'Cliente actualizado desde carga masiva'
    });
  }

  async bulkInsertClients(clients: Client[], userId: string, batchId: string): Promise<number> {
    if (clients.length === 0) return 0;

    const clientsWithTimestamps = clients.map(c => ({
      ...c,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error, count } = await supabase
      .from('clients')
      .insert(clientsWithTimestamps);

    if (error) throw new Error(`Error en inserción masiva de clientes: ${error.message}`);

    await this.bulkLogClientAudit(
      clients.map(c => ({
        client_cuit: c.cuit,
        batch_id: batchId,
        operation_type: 'INSERT',
        new_values: c,
        performed_by: userId,
        notes: 'Cliente creado desde carga masiva'
      }))
    );

    return count || clients.length;
  }

  async insertProduct(product: Product, userId: string, batchId: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .insert({
        ...product,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        djc_status: 'No Generada',
        certificado_status: 'Pendiente Subida',
        enviado_cliente: 'Pendiente',
        qr_status: 'No generado'
      });

    if (error) throw new Error(`Error insertando producto: ${error.message}`);

    const inserted = await this.getProductByCodificacion(product.codificacion);

    await this.logProductAudit({
      product_uuid: inserted?.uuid,
      batch_id: batchId,
      operation_type: 'INSERT',
      new_values: product,
      performed_by: userId,
      notes: 'Producto creado desde carga masiva'
    });
  }

  async updateProduct(product: Product, userId: string, batchId: string, previousValues: Product): Promise<void> {
    const existing = await this.getProductByCodificacion(product.codificacion);

    const merged = {
      ...product,
      uuid: existing?.uuid,
      qr_path: existing?.qr_path,
      qr_link: existing?.qr_link,
      certificado_path: existing?.certificado_path,
      djc_path: existing?.djc_path,
      qr_status: existing?.qr_status,
      djc_status: existing?.djc_status,
      certificado_status: existing?.certificado_status,
      enviado_cliente: existing?.enviado_cliente,
      qr_generated_at: existing?.qr_generated_at,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('products')
      .update(merged)
      .eq('codificacion', product.codificacion);

    if (error) throw new Error(`Error actualizando producto: ${error.message}`);

    const changedFields: any = {};
    Object.keys(product).forEach(key => {
      if ((product as any)[key] !== (previousValues as any)[key]) {
        changedFields[key] = true;
      }
    });

    await this.logProductAudit({
      product_uuid: merged.uuid,
      batch_id: batchId,
      operation_type: 'UPDATE',
      changed_fields: changedFields,
      previous_values: previousValues,
      new_values: product,
      performed_by: userId,
      notes: 'Producto actualizado desde carga masiva'
    });
  }

  async bulkInsertProducts(products: Product[], userId: string, batchId: string): Promise<number> {
    if (products.length === 0) return 0;

    const productsWithDefaults = products.map(p => ({
      ...p,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      djc_status: 'No Generada',
      certificado_status: 'Pendiente Subida',
      enviado_cliente: 'Pendiente',
      qr_status: 'No generado'
    }));

    console.log(`📦 Intentando insertar ${products.length} productos...`);
    console.log(`📋 Primeras 3 codificaciones:`, products.slice(0, 3).map(p => p.codificacion));

    const { error, count } = await supabase
      .from('products')
      .insert(productsWithDefaults);

    if (error) {
      console.error('❌ Error en inserción masiva:', error);
      throw new Error(`Error en inserción masiva de productos: ${error.message}`);
    }

    return count || products.length;
  }

  async createUploadBatch(batch: UploadBatch): Promise<string> {
    const { data, error } = await supabase
      .from('upload_batches')
      .insert({
        ...batch,
        uploaded_at: new Date().toISOString(),
        status: 'processing'
      })
      .select('id')
      .single();

    if (error) throw new Error(`Error creando batch: ${error.message}`);
    return data.id;
  }

  async updateUploadBatch(batchId: string, updates: Partial<UploadBatch>): Promise<void> {
    const { error } = await supabase
      .from('upload_batches')
      .update(updates)
      .eq('id', batchId);

    if (error) throw new Error(`Error actualizando batch: ${error.message}`);
  }

  async completeUploadBatch(batchId: string, stats: {
    processed_records: number;
    new_records: number;
    updated_records: number;
    error_records: number;
    processing_time_ms: number;
  }): Promise<void> {
    await this.updateUploadBatch(batchId, {
      ...stats,
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  }

  async createBackupSnapshot(
    batchId: string,
    snapshotType: 'before_processing' | 'after_processing',
    userId: string,
    metadata: any = {}
  ): Promise<string> {
    const { data, error } = await supabase
      .from('backup_snapshots')
      .insert({
        batch_id: batchId,
        snapshot_type: snapshotType,
        created_by: userId,
        metadata,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw new Error(`Error creando snapshot: ${error.message}`);
    return data.id;
  }

  async backupClients(snapshotId: string, clients: Client[]): Promise<void> {
    if (clients.length === 0) return;

    const backupData = clients.map(client => ({
      snapshot_id: snapshotId,
      original_client_id: client.cuit,
      client_data: client,
      backed_up_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('backup_clients')
      .insert(backupData);

    if (error) throw new Error(`Error respaldando clientes: ${error.message}`);

    await supabase
      .from('backup_snapshots')
      .update({ total_clients_backed_up: clients.length })
      .eq('id', snapshotId);
  }

  async backupProducts(snapshotId: string, products: Product[]): Promise<void> {
    if (products.length === 0) return;

    const backupData = products.map(product => ({
      snapshot_id: snapshotId,
      original_product_id: product.uuid,
      product_data: product,
      backed_up_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('backup_products')
      .insert(backupData);

    if (error) throw new Error(`Error respaldando productos: ${error.message}`);

    await supabase
      .from('backup_snapshots')
      .update({ total_products_backed_up: products.length })
      .eq('id', snapshotId);
  }

  private async logClientAudit(log: {
    client_cuit: number;
    batch_id: string;
    operation_type: string;
    changed_fields?: any;
    previous_values?: any;
    new_values?: any;
    performed_by: string;
    notes?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('client_audit_log')
      .insert({
        ...log,
        performed_at: new Date().toISOString()
      });

    if (error) console.error('Error en audit log de cliente:', error);
  }

  private async bulkLogClientAudit(logs: Array<{
    client_cuit: number;
    batch_id: string;
    operation_type: string;
    changed_fields?: any;
    previous_values?: any;
    new_values?: any;
    performed_by: string;
    notes?: string;
  }>): Promise<void> {
    const logsWithTimestamp = logs.map(log => ({
      ...log,
      performed_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('client_audit_log')
      .insert(logsWithTimestamp);

    if (error) console.error('Error en audit log masivo de clientes:', error);
  }

  private async logProductAudit(log: {
    product_uuid?: string;
    batch_id: string;
    operation_type: string;
    changed_fields?: any;
    previous_values?: any;
    new_values?: any;
    performed_by: string;
    notes?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('product_audit_log')
      .insert({
        ...log,
        performed_at: new Date().toISOString()
      });

    if (error) console.error('Error en audit log de producto:', error);
  }

  async pushUndoAction(action: {
    session_id: string;
    batch_id: string;
    action_type: string;
    action_data: any;
    user_id: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('undo_stack')
      .insert({
        ...action,
        created_at: new Date().toISOString(),
        is_undone: false
      });

    if (error) console.error('Error guardando acción para undo:', error);
  }
}

export const dbService = new DatabaseService();
