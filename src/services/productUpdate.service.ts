import { supabase } from '@/lib/supabase';
import { Product } from '@/types/upload.types';
import { AuditService } from './audit.service';

export interface UpdateStats {
  totalProcessed: number;
  updated: number;
  unchanged: number;
  notFound: number;
  errors: string[];
  batchId?: string;
  fieldBreakdown?: Record<string, number>;
}

export interface SelectiveUpdateOptions {
  allowedFields: string[];
  overwriteMode: boolean;
  sourceFile?: string;
  batchId?: string;
}

export class ProductUpdateService {
  static async updateExistingProducts(products: Product[]): Promise<UpdateStats> {
    console.log('🔄 ProductUpdateService - Iniciando actualización masiva...');
    console.log('📦 Total de productos a procesar:', products.length);

    const stats: UpdateStats = {
      totalProcessed: 0,
      updated: 0,
      unchanged: 0,
      notFound: 0,
      errors: []
    };

    for (const product of products) {
      try {
        stats.totalProcessed++;

        const { data: existingProduct, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('codificacion', product.codificacion)
          .maybeSingle();

        if (fetchError) {
          console.error(`❌ Error al buscar producto ${product.codificacion}:`, fetchError);
          stats.errors.push(`Error al buscar ${product.codificacion}: ${fetchError.message}`);
          continue;
        }

        if (!existingProduct) {
          console.log(`⚠️ Producto ${product.codificacion} no existe en la BD`);
          stats.notFound++;
          continue;
        }

        const updates = this.buildUpdateObject(existingProduct, product);

        if (Object.keys(updates).length === 0) {
          console.log(`✓ Producto ${product.codificacion} ya está completo`);
          stats.unchanged++;
          continue;
        }

        console.log(`🔄 Actualizando ${product.codificacion} con:`, Object.keys(updates));

        const { error: updateError } = await supabase
          .from('products')
          .update(updates)
          .eq('codificacion', product.codificacion);

        if (updateError) {
          console.error(`❌ Error al actualizar ${product.codificacion}:`, updateError);
          stats.errors.push(`Error al actualizar ${product.codificacion}: ${updateError.message}`);
          continue;
        }

        stats.updated++;
        console.log(`✅ Producto ${product.codificacion} actualizado correctamente`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
        console.error(`❌ Error procesando ${product.codificacion}:`, error);
        stats.errors.push(`Error procesando ${product.codificacion}: ${errorMsg}`);
      }
    }

    console.log('✅ Actualización masiva completada:');
    console.log('  - Total procesados:', stats.totalProcessed);
    console.log('  - Actualizados:', stats.updated);
    console.log('  - Sin cambios:', stats.unchanged);
    console.log('  - No encontrados:', stats.notFound);
    console.log('  - Errores:', stats.errors.length);

    return stats;
  }

  private static buildUpdateObject(existing: any, incoming: Product): Record<string, any> {
    const updates: Record<string, any> = {};

    const fieldsToUpdate = [
      'titular',
      'tipo_certificacion',
      'estado',
      'direccion_legal_empresa',
      'fabricante',
      'planta_fabricacion',
      'origen',
      'producto',
      'marca',
      'modelo',
      'caracteristicas_tecnicas',
      'normas_aplicacion',
      'informe_ensayo_nro',
      'laboratorio',
      'ocp_extranjero',
      'n_certificado_extranjero',
      'fecha_emision_certificado_extranjero',
      'disposicion_convenio',
      'cod_rubro',
      'cod_subrubro',
      'nombre_subrubro',
      'fecha_emision',
      'vencimiento',
      'fecha_cancelacion',
      'motivo_cancelacion',
      'dias_para_vencer',
      'organismo_certificacion',
      'esquema_certificacion'
    ];

    for (const field of fieldsToUpdate) {
      const existingValue = existing[field];
      const incomingValue = incoming[field as keyof Product];

      const isEmpty = existingValue === null ||
                     existingValue === undefined ||
                     existingValue === '' ||
                     (typeof existingValue === 'string' && existingValue.trim() === '');

      const hasIncomingValue = incomingValue !== null &&
                               incomingValue !== undefined &&
                               incomingValue !== '';

      if (isEmpty && hasIncomingValue) {
        updates[field] = incomingValue;
      }
    }

    // Siempre establecer IACSA como organismo si está vacío
    if (!existing.organismo_certificacion ||
        existing.organismo_certificacion === '' ||
        existing.organismo_certificacion === null) {
      updates.organismo_certificacion = 'IACSA';
    }

    // Determinar esquema basado en la codificación si está vacío
    if (!existing.esquema_certificacion ||
        existing.esquema_certificacion === '' ||
        existing.esquema_certificacion === null) {
      if (existing.codificacion?.startsWith('CSE')) {
        updates.esquema_certificacion = 'Licencia de Marca (Sistema Nº 5)';
      } else if (existing.codificacion?.startsWith('TCSE')) {
        updates.esquema_certificacion = 'Licencia de Tipo (Sistema Nº 2)';
      }
    }

    return updates;
  }

  static async updateProductsFromExcel(
    products: Product[],
    onProgress?: (current: number, total: number) => void
  ): Promise<UpdateStats> {
    console.log('📊 Iniciando actualización desde Excel...');

    const batchSize = 10;
    const stats: UpdateStats = {
      totalProcessed: 0,
      updated: 0,
      unchanged: 0,
      notFound: 0,
      errors: []
    };

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const batchStats = await this.updateExistingProducts(batch);

      stats.totalProcessed += batchStats.totalProcessed;
      stats.updated += batchStats.updated;
      stats.unchanged += batchStats.unchanged;
      stats.notFound += batchStats.notFound;
      stats.errors.push(...batchStats.errors);

      if (onProgress) {
        onProgress(Math.min(i + batchSize, products.length), products.length);
      }
    }

    return stats;
  }

  private static buildSelectiveUpdateObject(
    existing: any,
    incoming: Product,
    allowedFields: string[],
    overwriteMode: boolean
  ): { updates: Record<string, any>; oldValues: Record<string, any> } {
    const updates: Record<string, any> = {};
    const oldValues: Record<string, any> = {};

    const LOCKED_FIELDS = ['codificacion', 'cuit', 'uuid', 'created_at', 'updated_at'];

    for (const field of allowedFields) {
      if (LOCKED_FIELDS.includes(field)) {
        console.warn(`⚠️ Campo bloqueado ${field} ignorado`);
        continue;
      }

      const existingValue = existing[field];
      const incomingValue = incoming[field as keyof Product];

      const isEmpty = existingValue === null ||
                     existingValue === undefined ||
                     existingValue === '' ||
                     (typeof existingValue === 'string' && existingValue.trim() === '');

      const hasIncomingValue = incomingValue !== null &&
                               incomingValue !== undefined &&
                               incomingValue !== '';

      if (overwriteMode) {
        if (hasIncomingValue && existingValue !== incomingValue) {
          updates[field] = incomingValue;
          oldValues[field] = existingValue;
        }
      } else {
        if (isEmpty && hasIncomingValue) {
          updates[field] = incomingValue;
          oldValues[field] = existingValue;
        }
      }
    }

    return { updates, oldValues };
  }

  static async updateProductsSelective(
    products: Product[],
    options: SelectiveUpdateOptions,
    onProgress?: (current: number, total: number) => void
  ): Promise<UpdateStats> {
    console.log('🎯 Iniciando actualización selectiva...');
    console.log('📋 Campos permitidos:', options.allowedFields);
    console.log('🔄 Modo sobrescritura:', options.overwriteMode);

    const batchId = options.batchId || AuditService.generateBatchId();
    const updateType = options.overwriteMode ? 'overwrite' : 'fill_empty';
    const fieldBreakdown: Record<string, number> = {};

    const stats: UpdateStats = {
      totalProcessed: 0,
      updated: 0,
      unchanged: 0,
      notFound: 0,
      errors: [],
      batchId,
      fieldBreakdown
    };

    const batchSize = 10;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      for (const product of batch) {
        try {
          stats.totalProcessed++;

          const { data: existingProduct, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('codificacion', product.codificacion)
            .maybeSingle();

          if (fetchError) {
            console.error(`❌ Error al buscar ${product.codificacion}:`, fetchError);
            stats.errors.push(`Error al buscar ${product.codificacion}: ${fetchError.message}`);
            continue;
          }

          if (!existingProduct) {
            console.log(`⚠️ Producto ${product.codificacion} no encontrado`);
            stats.notFound++;
            continue;
          }

          const { updates, oldValues } = this.buildSelectiveUpdateObject(
            existingProduct,
            product,
            options.allowedFields,
            options.overwriteMode
          );

          if (Object.keys(updates).length === 0) {
            console.log(`✓ Producto ${product.codificacion} sin cambios`);
            stats.unchanged++;
            continue;
          }

          console.log(`🔄 Actualizando ${product.codificacion}:`, Object.keys(updates));

          const { error: updateError } = await supabase
            .from('products')
            .update(updates)
            .eq('codificacion', product.codificacion);

          if (updateError) {
            console.error(`❌ Error al actualizar ${product.codificacion}:`, updateError);
            stats.errors.push(`Error al actualizar ${product.codificacion}: ${updateError.message}`);
            continue;
          }

          Object.keys(updates).forEach(field => {
            fieldBreakdown[field] = (fieldBreakdown[field] || 0) + 1;
          });

          await AuditService.logProductUpdate({
            product_uuid: existingProduct.uuid,
            codificacion: product.codificacion,
            update_type: updateType,
            fields_updated: Object.keys(updates),
            old_values: oldValues,
            new_values: updates,
            source_file: options.sourceFile,
            batch_id: batchId
          });

          stats.updated++;
          console.log(`✅ Producto ${product.codificacion} actualizado`);

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
          console.error(`❌ Error procesando ${product.codificacion}:`, error);
          stats.errors.push(`Error procesando ${product.codificacion}: ${errorMsg}`);
        }
      }

      if (onProgress) {
        onProgress(Math.min(i + batchSize, products.length), products.length);
      }
    }

    console.log('✅ Actualización selectiva completada:');
    console.log('  - Total procesados:', stats.totalProcessed);
    console.log('  - Actualizados:', stats.updated);
    console.log('  - Sin cambios:', stats.unchanged);
    console.log('  - No encontrados:', stats.notFound);
    console.log('  - Errores:', stats.errors.length);
    console.log('  - Batch ID:', batchId);

    return stats;
  }
}
