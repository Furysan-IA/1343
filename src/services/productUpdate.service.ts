import { supabase } from '@/lib/supabase';
import { Product } from '@/types/upload.types';

export interface UpdateStats {
  totalProcessed: number;
  updated: number;
  unchanged: number;
  notFound: number;
  errors: string[];
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
          .from('productos')
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
          .from('productos')
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
}
