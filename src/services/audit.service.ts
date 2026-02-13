import { supabase } from '@/lib/supabase';

export interface AuditLogEntry {
  id?: string;
  product_uuid?: string;
  codificacion: string;
  update_type: 'fill_empty' | 'overwrite';
  fields_updated: string[];
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  updated_by: string;
  updated_at?: Date;
  source_file?: string;
  batch_id?: string;
  fields_count: number;
}

export interface AuditStats {
  totalUpdates: number;
  fieldBreakdown: Record<string, number>;
  productsAffected: number;
  batchId: string;
}

export class AuditService {
  static async logProductUpdate(
    entry: Omit<AuditLogEntry, 'id' | 'updated_at' | 'fields_count' | 'updated_by'>
  ): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('❌ No user found for audit log');
        return null;
      }

      const fields_count = entry.fields_updated.length;

      const { data, error } = await supabase
        .from('product_update_audit_log')
        .insert({
          ...entry,
          fields_count,
          updated_by: user.id
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creating audit log:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('❌ Exception in logProductUpdate:', error);
      return null;
    }
  }

  static async logBatchUpdate(
    entries: Omit<AuditLogEntry, 'id' | 'updated_at' | 'fields_count' | 'updated_by'>[]
  ): Promise<string[]> {
    const ids: string[] = [];

    for (const entry of entries) {
      const id = await this.logProductUpdate(entry);
      if (id) {
        ids.push(id);
      }
    }

    return ids;
  }

  static async getAuditHistory(
    filters?: {
      codificacion?: string;
      batch_id?: string;
      from_date?: Date;
      to_date?: Date;
      update_type?: 'fill_empty' | 'overwrite';
    }
  ): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('product_update_audit_log')
        .select('*')
        .order('updated_at', { ascending: false });

      if (filters?.codificacion) {
        query = query.eq('codificacion', filters.codificacion);
      }

      if (filters?.batch_id) {
        query = query.eq('batch_id', filters.batch_id);
      }

      if (filters?.update_type) {
        query = query.eq('update_type', filters.update_type);
      }

      if (filters?.from_date) {
        query = query.gte('updated_at', filters.from_date.toISOString());
      }

      if (filters?.to_date) {
        query = query.lte('updated_at', filters.to_date.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching audit history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception in getAuditHistory:', error);
      return [];
    }
  }

  static async getBatchStats(batchId: string): Promise<AuditStats | null> {
    try {
      const entries = await this.getAuditHistory({ batch_id: batchId });

      if (entries.length === 0) {
        return null;
      }

      const fieldBreakdown: Record<string, number> = {};
      const productsSet = new Set<string>();

      entries.forEach(entry => {
        productsSet.add(entry.codificacion);

        entry.fields_updated.forEach(field => {
          fieldBreakdown[field] = (fieldBreakdown[field] || 0) + 1;
        });
      });

      return {
        totalUpdates: entries.length,
        fieldBreakdown,
        productsAffected: productsSet.size,
        batchId
      };
    } catch (error) {
      console.error('❌ Exception in getBatchStats:', error);
      return null;
    }
  }

  static async getProductHistory(codificacion: string): Promise<AuditLogEntry[]> {
    return this.getAuditHistory({ codificacion });
  }

  static generateBatchId(): string {
    return crypto.randomUUID();
  }

  static async exportAuditReport(batchId: string): Promise<any[]> {
    const entries = await this.getAuditHistory({ batch_id: batchId });

    return entries.map(entry => ({
      Codificacion: entry.codificacion,
      'Tipo Actualizacion': entry.update_type === 'fill_empty' ? 'Completar Vacios' : 'Sobrescribir',
      'Campos Actualizados': entry.fields_updated.join(', '),
      'Cantidad Campos': entry.fields_count,
      'Archivo Origen': entry.source_file || 'N/A',
      'Fecha': entry.updated_at ? new Date(entry.updated_at).toLocaleString('es-AR') : 'N/A'
    }));
  }
}
