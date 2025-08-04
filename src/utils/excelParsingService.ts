import * as XLSX from 'xlsx';

export interface ValidationIssue {
  type: 'missing_field' | 'invalid_format' | 'duplicate' | 'reference_error';
  row: number;
  field: string;
  column: string;
  message: string;
  severity: 'error' | 'warning';
  suggestedAction: string;
}

export interface HeaderValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export interface ParsedData {
  headers: string[];
  data: any[];
  issues: ValidationIssue[];
}

export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          reject(new Error('El archivo Excel está vacío'));
          return;
        }
        
        resolve(jsonData);
      } catch (error) {
        reject(new Error(`Error al procesar el archivo Excel: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export function parseProductData(row: any): any {
  // Esta función mapea los datos del Excel a la estructura de la base de datos
  return {
    codificacion: row.codificacion || row.codigo || '',
    cuit: parseCuit(row.cuit || row.cuil),
    titular: row.titular || '',
    tipo_certificacion: row.tipo_certificacion || row.tipo || '',
    estado: row.estado || 'activo',
    en_proceso_renovacion: row.en_proceso_renovacion || '',
    direccion_legal_empresa: row.direccion_legal_empresa || row.direccion_legal || '',
    fabricante: row.fabricante || '',
    planta_fabricacion: row.planta_fabricacion || row.planta || '',
    origen: row.origen || '',
    producto: row.producto || row.nombre_producto || '',
    marca: row.marca || '',
    modelo: row.modelo || '',
    caracteristicas_tecnicas: row.caracteristicas_tecnicas || row.caracteristicas || '',
    normas_aplicacion: row.normas_aplicacion || row.normas || '',
    informe_ensayo_nro: row.informe_ensayo_nro || row.informe_verificacion || '',
    laboratorio: row.laboratorio || '',
    ocp_extranjero: row.ocp_extranjero || '',
    n_certificado_extranjero: row.n_certificado_extranjero || '',
    fecha_emision_certificado_extranjero: parseDate(row.fecha_emision_certificado_extranjero),
    disposicion_convenio: row.disposicion_convenio || '',
    cod_rubro: parseNumber(row.cod_rubro),
    cod_subrubro: parseNumber(row.cod_subrubro),
    nombre_subrubro: row.nombre_subrubro || '',
    fecha_emision: parseDate(row.fecha_emision || row.fecha_informe),
    vencimiento: parseDate(row.vencimiento),
    fecha_cancelacion: parseDate(row.fecha_cancelacion),
    motivo_cancelacion: row.motivo_cancelacion || '',
    djc_status: 'No Generada',
    certificado_status: 'Pendiente Subida',
    enviado_cliente: 'Pendiente',
    certificado_path: null,
    djc_path: null,
    qr_path: null,
    qr_link: null,
    qr_status: 'No generado'
  };
}

export function validateProductData(product: any): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!product.codificacion) {
    issues.push('Codificación es requerida');
  }
  
  if (!product.producto) {
    issues.push('Nombre del producto es requerido');
  }
  
  if (!product.marca) {
    issues.push('Marca es requerida');
  }
  
  if (!product.titular) {
    issues.push('Titular es requerido');
  }
  
  if (!product.cuit) {
    issues.push('CUIT es requerido');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

export function parseClientData(row: any): any {
  return {
    razon_social: row.razon_social || row['razon social'] || row.empresa || '',
    cuit: parseCuit(row.cuit || row.cuil),
    direccion: row.direccion || row.dirección || row.address || '',
    email: row.email || row.correo || row.mail || '',
    telefono: row.telefono || row.tel || '',
    contacto: row.contacto || row.contact || ''
  };
}

function parseDate(value: any): string | null {
  if (!value) return null;
  
  try {
    // Try to parse as Excel date number
    if (typeof value === 'number') {
      const excelDate = XLSX.SSF.parse_date_code(value);
      if (excelDate) {
        return `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
      }
    }
    
    // Try to parse as regular date string
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    // Ignore parsing errors
  }
  
  return null;
}

function parseCuit(value: any): number | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[-\s]/g, '');
  const parsed = parseInt(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function parseNumber(value: any): number | null {
  if (!value) return null;
  const parsed = parseInt(String(value));
  return isNaN(parsed) ? null : parsed;
}

export function validateProductHeaders(headers: string[]): HeaderValidationResult {
  const requiredHeaders = ['codificacion', 'producto', 'marca'];
  const normalizedHeaders = headers.map(h => String(h || '').toLowerCase().trim());
  
  const issues: ValidationIssue[] = [];
  
  requiredHeaders.forEach(header => {
    const found = normalizedHeaders.some(h => 
      h.includes(header) || 
      h.includes(header.replace('_', ' ')) ||
      (header === 'codificacion' && h.includes('codigo'))
    );
    
    if (!found) {
      issues.push({
        type: 'missing_field',
        row: 1,
        field: header,
        column: 'Header',
        message: `Falta la columna requerida: ${header}`,
        severity: 'error',
        suggestedAction: `Agregar columna ${header} al archivo Excel`
      });
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

export function validateClientHeaders(headers: string[]): HeaderValidationResult {
  const requiredHeaders = ['razon_social', 'cuit'];
  const normalizedHeaders = headers.map(h => String(h || '').toLowerCase().trim());
  
  const issues: ValidationIssue[] = [];
  
  requiredHeaders.forEach(header => {
    const found = normalizedHeaders.some(h => 
      h.includes(header.replace('_', ' ')) || 
      h.includes(header) ||
      (header === 'razon_social' && (h.includes('empresa') || h.includes('razon social')))
    );
    
    if (!found) {
      issues.push({
        type: 'missing_field',
        row: 1,
        field: header,
        column: 'Header',
        message: `Falta la columna requerida: ${header}`,
        severity: 'error',
        suggestedAction: `Agregar columna ${header} al archivo Excel`
      });
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

// Función para crear un mapa de headers normalizados
function createHeaderMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    if (header) {
      map.set(header.toLowerCase().trim(), index);
    }
  });
  return map;
}

// Función para obtener valor de celda usando múltiples posibles headers
function getCellValue(row: any[], headerMap: Map<string, number>, possibleHeaders: string[]): string | null {
  for (const header of possibleHeaders) {
    const index = headerMap.get(header.toLowerCase());
    if (index !== undefined && row[index] !== undefined && row[index] !== null && row[index] !== '') {
      return String(row[index]).trim();
    }
  }
  return null;
}