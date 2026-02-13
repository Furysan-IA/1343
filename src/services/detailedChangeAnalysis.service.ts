import { supabase } from '../lib/supabase';
import {
  DetailedAnalysisResult,
  ProductComparison,
  ClientComparison,
  FieldChange,
  ChangeType,
  ChangeSeverity,
  FieldType
} from '../types/changeAnalysis.types';
import { UnifiedRecord } from './unifiedDataLoad.service';

const PROTECTED_FIELDS = [
  'id',
  'created_at',
  'updated_at',
  'qr_code_id',
  'codigo_qr'
];

const CRITICAL_FIELDS = [
  'estado',
  'fecha_vencimiento',
  'esquema_certificacion',
  'organismo_certificacion'
];

const PRODUCT_FIELD_LABELS: Record<string, string> = {
  codificacion: 'Codificación',
  nombre_producto: 'Nombre del Producto',
  modelo: 'Modelo',
  marca: 'Marca',
  tipo: 'Tipo',
  fabricante: 'Fabricante',
  estado: 'Estado',
  fecha_emision: 'Fecha de Emisión',
  fecha_vencimiento: 'Fecha de Vencimiento',
  norma: 'Norma',
  esquema_certificacion: 'Esquema de Certificación',
  organismo_certificacion: 'Organismo de Certificación',
  cuit: 'CUIT',
  enlace_declaracion: 'Enlace Declaración'
};

const CLIENT_FIELD_LABELS: Record<string, string> = {
  cuit: 'CUIT',
  razon_social: 'Razón Social',
  domicilio_legal: 'Domicilio Legal',
  localidad: 'Localidad',
  codigo_postal: 'Código Postal',
  provincia: 'Provincia',
  telefono: 'Teléfono',
  email: 'Email',
  direccion_planta: 'Dirección de Planta'
};

function getFieldType(fieldName: string): FieldType {
  if (fieldName.includes('fecha')) return 'date';
  if (['cuit', 'codigo_postal', 'telefono'].includes(fieldName)) return 'number';
  return 'text';
}

function calculateSeverity(fieldName: string, currentValue: any, newValue: any): ChangeSeverity {
  if (CRITICAL_FIELDS.includes(fieldName)) {
    if (fieldName === 'estado') {
      if (currentValue === 'Vigente' && newValue !== 'Vigente') return 'critical';
      if (currentValue !== 'Vigente' && newValue === 'Vigente') return 'high';
    }
    return 'high';
  }

  if (['nombre_producto', 'razon_social', 'esquema_certificacion'].includes(fieldName)) {
    return 'medium';
  }

  return 'low';
}

function normalizeValue(value: any): any {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') return value.trim();
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return value;
}

function valuesAreDifferent(current: any, newVal: any): boolean {
  const norm1 = normalizeValue(current);
  const norm2 = normalizeValue(newVal);

  if (norm1 === null && norm2 === null) return false;
  if (norm1 === null || norm2 === null) return true;

  return norm1 !== norm2;
}

function generateWarnings(changes: FieldChange[], changeType: ChangeType): string[] {
  const warnings: string[] = [];

  changes.forEach(change => {
    if (change.severity === 'critical') {
      warnings.push(`⚠️ Cambio crítico en ${change.fieldLabel}`);
    }

    if (change.field === 'fecha_vencimiento' && change.newValue) {
      const vencimiento = new Date(change.newValue);
      const hoy = new Date();
      if (vencimiento < hoy) {
        warnings.push('⚠️ Fecha de vencimiento en el pasado');
      }
    }

    if (change.field === 'estado' && change.newValue === 'Vencido') {
      warnings.push('⚠️ El producto pasará a estado Vencido');
    }
  });

  return warnings;
}

async function analyzeProduct(productData: any): Promise<ProductComparison> {
  const { data: existingProduct } = await supabase
    .from('products')
    .select('*')
    .eq('codificacion', productData.codificacion)
    .maybeSingle();

  if (!existingProduct) {
    return {
      codificacion: productData.codificacion,
      productName: productData.nombre_producto || 'Sin nombre',
      changeType: 'new',
      changes: [],
      warnings: [],
      impactLevel: 'low',
      hasConflicts: false
    };
  }

  const changes: FieldChange[] = [];
  const productFields = Object.keys(PRODUCT_FIELD_LABELS);

  productFields.forEach(field => {
    if (PROTECTED_FIELDS.includes(field)) return;

    const currentValue = existingProduct[field];
    const newValue = productData[field];

    if (valuesAreDifferent(currentValue, newValue)) {
      const isProtected = PROTECTED_FIELDS.includes(field);
      const severity = calculateSeverity(field, currentValue, newValue);

      changes.push({
        field,
        fieldLabel: PRODUCT_FIELD_LABELS[field] || field,
        currentValue: normalizeValue(currentValue),
        newValue: normalizeValue(newValue),
        fieldType: getFieldType(field),
        severity,
        isProtected,
        willChange: !isProtected && newValue !== undefined && newValue !== null
      });
    }
  });

  const warnings = generateWarnings(changes, 'update');
  const hasConflicts = warnings.length > 0;
  const impactLevel = changes.some(c => c.severity === 'critical') ? 'critical' :
                       changes.some(c => c.severity === 'high') ? 'high' :
                       changes.length > 5 ? 'medium' : 'low';

  return {
    codificacion: productData.codificacion,
    productName: productData.nombre_producto || existingProduct.nombre_producto || 'Sin nombre',
    changeType: changes.length > 0 ? 'update' : 'no_change',
    changes,
    warnings,
    impactLevel,
    hasConflicts
  };
}

async function analyzeClient(clientData: any): Promise<ClientComparison> {
  const { data: existingClient } = await supabase
    .from('clients')
    .select('*')
    .eq('cuit', clientData.cuit)
    .maybeSingle();

  if (!existingClient) {
    return {
      cuit: clientData.cuit,
      clientName: clientData.razon_social || 'Sin nombre',
      changeType: 'new',
      changes: [],
      warnings: [],
      impactLevel: 'low'
    };
  }

  const changes: FieldChange[] = [];
  const clientFields = Object.keys(CLIENT_FIELD_LABELS);

  clientFields.forEach(field => {
    if (PROTECTED_FIELDS.includes(field)) return;

    const currentValue = existingClient[field];
    const newValue = clientData[field];

    if (valuesAreDifferent(currentValue, newValue)) {
      const isProtected = PROTECTED_FIELDS.includes(field);
      const severity = calculateSeverity(field, currentValue, newValue);

      changes.push({
        field,
        fieldLabel: CLIENT_FIELD_LABELS[field] || field,
        currentValue: normalizeValue(currentValue),
        newValue: normalizeValue(newValue),
        fieldType: getFieldType(field),
        severity,
        isProtected,
        willChange: !isProtected && newValue !== undefined && newValue !== null
      });
    }
  });

  const warnings = generateWarnings(changes, 'update');
  const impactLevel = changes.some(c => c.severity === 'critical') ? 'critical' :
                       changes.some(c => c.severity === 'high') ? 'high' :
                       changes.length > 3 ? 'medium' : 'low';

  return {
    cuit: clientData.cuit,
    clientName: clientData.razon_social || existingClient.razon_social || 'Sin nombre',
    changeType: changes.length > 0 ? 'update' : 'no_change',
    changes,
    warnings,
    impactLevel
  };
}

export async function analyzeDetailedChanges(
  records: UnifiedRecord[]
): Promise<DetailedAnalysisResult> {
  const productComparisons: ProductComparison[] = [];
  const clientComparisons: ClientComparison[] = [];
  const globalWarnings: string[] = [];

  const uniqueClients = new Map<number, any>();
  records.forEach(record => {
    uniqueClients.set(record.client.cuit, record.client);
  });

  console.log(`Analyzing ${records.length} products and ${uniqueClients.size} clients...`);

  for (const [cuit, clientData] of uniqueClients) {
    try {
      const comparison = await analyzeClient(clientData);
      clientComparisons.push(comparison);
    } catch (error) {
      console.error(`Error analyzing client ${cuit}:`, error);
      globalWarnings.push(`Error al analizar cliente CUIT ${cuit}`);
    }
  }

  for (const record of records) {
    try {
      const comparison = await analyzeProduct(record.product);
      productComparisons.push(comparison);
    } catch (error) {
      console.error(`Error analyzing product ${record.product.codificacion}:`, error);
      globalWarnings.push(`Error al analizar producto ${record.product.codificacion}`);
    }
  }

  const productsNew = productComparisons.filter(p => p.changeType === 'new');
  const productsUpdate = productComparisons.filter(p => p.changeType === 'update');
  const productsNoChange = productComparisons.filter(p => p.changeType === 'no_change');

  const clientsNew = clientComparisons.filter(c => c.changeType === 'new');
  const clientsUpdate = clientComparisons.filter(c => c.changeType === 'update');
  const clientsNoChange = clientComparisons.filter(c => c.changeType === 'no_change');

  const totalFieldChanges = [...productComparisons, ...clientComparisons]
    .reduce((sum, item) => sum + item.changes.length, 0);

  const criticalChanges = [...productComparisons, ...clientComparisons]
    .reduce((sum, item) => sum + item.changes.filter(c => c.severity === 'critical').length, 0);

  const warnings = [...productComparisons, ...clientComparisons]
    .reduce((sum, item) => sum + item.warnings.length, 0);

  return {
    products: {
      new: productsNew,
      updates: productsUpdate,
      noChanges: productsNoChange
    },
    clients: {
      new: clientsNew,
      updates: clientsUpdate,
      noChanges: clientsNoChange
    },
    summary: {
      totalProducts: productComparisons.length,
      productsNew: productsNew.length,
      productsUpdate: productsUpdate.length,
      productsNoChange: productsNoChange.length,
      totalClients: clientComparisons.length,
      clientsNew: clientsNew.length,
      clientsUpdate: clientsUpdate.length,
      clientsNoChange: clientsNoChange.length,
      totalFieldChanges,
      criticalChanges,
      warnings
    },
    globalWarnings
  };
}

export function exportChangesReport(analysis: DetailedAnalysisResult): string {
  let report = '=== REPORTE DE CAMBIOS ===\n\n';

  report += '## RESUMEN\n';
  report += `Total Productos: ${analysis.summary.totalProducts}\n`;
  report += `  - Nuevos: ${analysis.summary.productsNew}\n`;
  report += `  - Actualizaciones: ${analysis.summary.productsUpdate}\n`;
  report += `  - Sin cambios: ${analysis.summary.productsNoChange}\n\n`;

  report += `Total Clientes: ${analysis.summary.totalClients}\n`;
  report += `  - Nuevos: ${analysis.summary.clientsNew}\n`;
  report += `  - Actualizaciones: ${analysis.summary.clientsUpdate}\n`;
  report += `  - Sin cambios: ${analysis.summary.clientsNoChange}\n\n`;

  report += `Campos que cambiarán: ${analysis.summary.totalFieldChanges}\n`;
  report += `Cambios críticos: ${analysis.summary.criticalChanges}\n`;
  report += `Advertencias: ${analysis.summary.warnings}\n\n`;

  if (analysis.products.updates.length > 0) {
    report += '## PRODUCTOS A ACTUALIZAR\n\n';
    analysis.products.updates.forEach(product => {
      report += `### ${product.codificacion} - ${product.productName}\n`;
      report += `Impacto: ${product.impactLevel.toUpperCase()}\n`;
      if (product.warnings.length > 0) {
        report += `Advertencias: ${product.warnings.join(', ')}\n`;
      }
      report += 'Cambios:\n';
      product.changes.forEach(change => {
        if (change.willChange) {
          report += `  - ${change.fieldLabel}: "${change.currentValue}" → "${change.newValue}"\n`;
        }
      });
      report += '\n';
    });
  }

  return report;
}
