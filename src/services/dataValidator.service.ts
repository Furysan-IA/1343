import { Client, Product, ValidatedData, ValidationIssue, ChangeDetail } from '@/types/upload.types';

export class DataValidator {
  static async validateAgainstDatabase(
    uploadedClients: Client[],
    uploadedProducts: Product[],
    existingClients: Client[],
    existingProducts: Product[]
  ): Promise<ValidatedData> {
    console.log('🔍 DataValidator - Iniciando validación...');
    console.log('📊 Clientes mapeados:', uploadedClients.length);
    console.log('📦 Productos mapeados:', uploadedProducts.length);
    console.log('📊 Clientes existentes en BD:', existingClients.length);
    console.log('📦 Productos existentes en BD:', existingProducts.length);

    const newClients: Client[] = [];
    const updatedClients: ChangeDetail[] = [];
    const newProducts: Product[] = [];
    const updatedProducts: ChangeDetail[] = [];
    const issues: ValidationIssue[] = [];

    const existingClientMap = new Map(existingClients.map(c => [c.cuit, c]));
    const existingProductMap = new Map(existingProducts.map(p => [p.codificacion, p]));

    const uploadedCUITs = new Set<number>();
    const uploadedCodificaciones = new Set<string>();

    uploadedClients.forEach(client => {
      if (uploadedCUITs.has(client.cuit)) {
        issues.push({
          type: 'duplicate_client',
          severity: 'error',
          message: `CUIT duplicado en el archivo: ${client.cuit} - ${client.razon_social}`
        });
        return;
      }
      uploadedCUITs.add(client.cuit);

      const existing = existingClientMap.get(client.cuit);

      if (!existing) {
        newClients.push(client);

        if (client.email === 'No encontrado' || client.direccion === 'No encontrado') {
          issues.push({
            type: 'missing_data',
            severity: 'warning',
            message: `Cliente ${client.razon_social} - Datos faltantes que se completarán con "No encontrado"`
          });
        }
      } else {
        const changes = this.detectClientChanges(existing, client);
        if (changes.length > 0) {
          updatedClients.push({
            existing,
            new: client,
            changes
          });

          issues.push({
            type: 'data_change',
            severity: 'info',
            message: `Cliente ${client.razon_social} tiene cambios en: ${changes.join(', ')}`
          });
        }
      }
    });

    uploadedProducts.forEach((product, index) => {
      if (uploadedCodificaciones.has(product.codificacion)) {
        issues.push({
          type: 'duplicate_product',
          severity: 'error',
          message: `Codificación duplicada en el archivo: ${product.codificacion}`
        });
        return;
      }
      uploadedCodificaciones.add(product.codificacion);

      const clientExists = existingClientMap.has(product.cuit) || uploadedCUITs.has(product.cuit);
      if (!clientExists) {
        console.warn(`⚠️ Producto ${index + 1}: ${product.codificacion} - CUIT ${product.cuit} no existe en clientes (ni existentes ni del archivo)`);
        issues.push({
          type: 'invalid_data',
          severity: 'warning',
          message: `Producto ${product.codificacion} - CUIT ${product.cuit} no encontrado. Se insertará igualmente.`
        });
      }

      const existing = existingProductMap.get(product.codificacion);

      if (!existing) {
        console.log(`✅ Producto NUEVO detectado: ${product.codificacion}`);
        newProducts.push(product);
      } else {
        const changes = this.detectProductChanges(existing, product);
        if (changes.length > 0) {
          console.log(`🔄 Producto a ACTUALIZAR: ${product.codificacion} - cambios en: ${changes.join(', ')}`);
          updatedProducts.push({
            existing,
            new: { ...product },
            changes
          });

          issues.push({
            type: 'data_change',
            severity: 'info',
            message: `Producto ${product.codificacion} tiene cambios en: ${changes.join(', ')}`
          });
        } else {
          console.log(`⏭️ Producto sin cambios: ${product.codificacion}`);
        }
      }
    });

    console.log('✅ Resultados de validación:');
    console.log('  - Nuevos clientes:', newClients.length);
    console.log('  - Clientes a actualizar:', updatedClients.length);
    console.log('  - Nuevos productos:', newProducts.length);
    console.log('  - Productos a actualizar:', updatedProducts.length);
    console.log('  - Issues detectados:', issues.length);

    return {
      newClients,
      updatedClients,
      newProducts,
      updatedProducts,
      issues
    };
  }

  private static detectClientChanges(existing: Client, updated: Client): string[] {
    const changes: string[] = [];

    if (existing.razon_social !== updated.razon_social) changes.push('razón social');
    if (existing.direccion !== updated.direccion && updated.direccion !== 'No encontrado') {
      changes.push('dirección');
    }
    if (existing.email !== updated.email && updated.email !== 'No encontrado') {
      changes.push('email');
    }
    if (existing.telefono !== updated.telefono && updated.telefono) {
      changes.push('teléfono');
    }
    if (existing.contacto !== updated.contacto && updated.contacto) {
      changes.push('contacto');
    }

    return changes;
  }

  private static detectProductChanges(existing: Product, updated: Product): string[] {
    const changes: string[] = [];
    const fieldsToCheck: (keyof Product)[] = [
      'producto', 'marca', 'modelo', 'estado', 'fabricante',
      'planta_fabricacion', 'origen', 'caracteristicas_tecnicas',
      'normas_aplicacion', 'informe_ensayo_nro', 'laboratorio',
      'fecha_emision', 'vencimiento', 'organismo_certificacion'
    ];

    fieldsToCheck.forEach(field => {
      const existingValue = existing[field];
      const updatedValue = updated[field];

      if (existingValue !== updatedValue && updatedValue !== undefined) {
        changes.push(field.replace(/_/g, ' '));
      }
    });

    return changes;
  }
}
