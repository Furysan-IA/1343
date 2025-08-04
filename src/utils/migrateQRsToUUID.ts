// utils/migrateQRsToUUID.ts - Script para ejecutar una vez
import { supabase } from '../lib/supabase';
import { qrConfigService } from '../services/qrConfig.service';

export async function migrateExistingQRsToUUID() {
  console.log('🔄 Iniciando migración de QRs a UUID...');
  
  try {
    // 1. Obtener todos los productos con QR generado
    const { data: products, error } = await supabase
      .from('products')
      .select('codificacion, uuid, qr_link, qr_path')
      .not('qr_path', 'is', null);

    if (error) throw error;

    console.log(`📊 Encontrados ${products?.length || 0} productos con QR`);

    if (!products || products.length === 0) {
      console.log('✅ No hay productos con QR para migrar');
      return;
    }

    // 2. Actualizar cada producto
    let migrated = 0;
    let errors = 0;

    for (const product of products) {
      try {
        // Solo migrar si tiene UUID
        if (!product.uuid) {
          console.warn(`⚠️ Producto ${product.codificacion} no tiene UUID`);
          errors++;
          continue;
        }

        // Generar nueva URL con UUID
        const newQrLink = qrConfigService.generateProductUrl(product.uuid);

        // Verificar si ya está usando UUID
        if (product.qr_link && product.qr_link.includes(product.uuid)) {
          console.log(`✓ Producto ${product.codificacion} ya usa UUID`);
          continue;
        }

        // Actualizar en la base de datos
        const { error: updateError } = await supabase
          .from('products')
          .update({
            qr_link: newQrLink,
            qr_status: 'Pendiente regeneración',
            updated_at: new Date().toISOString()
          })
          .eq('codificacion', product.codificacion);

        if (updateError) throw updateError;

        migrated++;
        console.log(`✅ Migrado: ${product.codificacion} -> ${product.uuid}`);

      } catch (err) {
        console.error(`❌ Error migrando ${product.codificacion}:`, err);
        errors++;
      }
    }

    console.log(`
🎉 Migración completada:
   - Productos migrados: ${migrated}
   - Errores: ${errors}
   - Total procesados: ${products.length}
   
⚠️  IMPORTANTE: Los QR físicos necesitan ser regenerados e impresos nuevamente.
    `);

  } catch (error) {
    console.error('❌ Error en la migración:', error);
  }
}

// Para ejecutar desde la consola del navegador:
// migrateExistingQRsToUUID();