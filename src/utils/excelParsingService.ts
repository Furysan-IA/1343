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

export function parseExcelFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          reject(new Error('El archivo Excel está vacío'));
          return;
        }
        
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);
        
        resolve({
          headers,
          data: dataRows,
          issues: []
        });
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

export function parseClientData(data: any[], headers: string[]): any[] {
  const headerMap = createHeaderMap(headers);
  
  return data.map((row, index) => {
    const client: any = {};
    
    // Map required fields
    client.razon_social = getCellValue(row, headerMap, ['razon_social', 'razon social', 'empresa']);
    client.cuit = parseCuit(getCellValue(row, headerMap, ['cuit', 'cuil']));
    client.direccion = getCellValue(row, headerMap, ['direccion', 'dirección', 'address']);
    client.email = getCellValue(row, headerMap, ['email', 'correo', 'mail']);
    
    return client;
  }).filter(client => client.razon_social || client.cuit); // Filter out empty rows
}

export function parseProductData(data: any[], headers: string[]): any[] {
  const headerMap = createHeaderMap(headers);
  
  return data.map((row, index) => {
    const product: any = {};
    
    // Map required fields
    product.codificacion = getCellValue(row, headerMap, ['codificacion', 'código', 'codigo']);
    product.cuit = parseCuit(getCellValue(row, headerMap, ['cuit', 'cuil']));
    
    // Map optional fields
    product.titular = getCellValue(row, headerMap, ['titular', 'holder']);
    product.tipo_certificacion = getCellValue(row, headerMap, ['tipo_certificacion', 'tipo certificacion', 'certification_type']);
    product.estado = getCellValue(row, headerMap, ['estado', 'status', 'state']);
    product.en_proceso_renovacion = getCellValue(row, headerMap, ['en_proceso_renovacion', 'renovacion', 'renewal']);
    product.direccion_legal_empresa = getCellValue(row, headerMap, ['direccion_legal_empresa', 'direccion legal', 'legal_address']);
    product.fabricante = getCellValue(row, headerMap, ['fabricante', 'manufacturer']);
    product.planta_fabricacion = getCellValue(row, headerMap, ['planta_fabricacion', 'planta', 'plant']);
    product.origen = getCellValue(row, headerMap, ['origen', 'origin']);
    product.producto = getCellValue(row, headerMap, ['producto', 'product']);
    product.marca = getCellValue(row, headerMap, ['marca', 'brand']);
    product.modelo = getCellValue(row, headerMap, ['modelo', 'model']);
    product.caracteristicas_tecnicas = getCellValue(row, headerMap, ['caracteristicas_tecnicas', 'caracteristicas', 'technical_specs']);
    product.normas_aplicacion = getCellValue(row, headerMap, ['normas_aplicacion', 'normas', 'standards']);
    product.informe_ensayo_nro = getCellValue(row, headerMap, ['informe_ensayo_nro', 'informe', 'test_report']);
    product.laboratorio = getCellValue(row, headerMap, ['laboratorio', 'laboratory']);
    product.ocp_extranjero = getCellValue(row, headerMap, ['ocp_extranjero', 'ocp', 'foreign_ocp']);
    product.n_certificado_extranjero = getCellValue(row, headerMap, ['n_certificado_extranjero', 'certificado extranjero', 'foreign_certificate']);
    
    // Parse dates
    product.fecha_emision_certificado_extranjero = parseDate(getCellValue(row, headerMap, ['fecha_emision_certificado_extranjero', 'fecha emision', 'issue_date']));
    product.fecha_emision = parseDate(getCellValue(row, headerMap, ['fecha_emision', 'emision', 'emission_date']));
    product.vencimiento = parseDate(getCellValue(row, headerMap, ['vencimiento', 'expiration', 'expiry']));
    product.fecha_cancelacion = parseDate(getCellValue(row, headerMap, ['fecha_cancelacion', 'cancelacion', 'cancellation_date']));
    
    // Parse numbers
    product.cod_rubro = parseNumber(getCellValue(row, headerMap, ['cod_rubro', 'codigo rubro', 'category_code']));
    product.cod_subrubro = parseNumber(getCellValue(row, headerMap, ['cod_subrubro', 'codigo subrubro', 'subcategory_code']));
    
    product.disposicion_convenio = getCellValue(row, headerMap, ['disposicion_convenio', 'convenio', 'agreement']);
    product.nombre_subrubro = getCellValue(row, headerMap, ['nombre_subrubro', 'subrubro', 'subcategory']);
    product.motivo_cancelacion = getCellValue(row, headerMap, ['motivo_cancelacion', 'motivo', 'cancellation_reason']);
    
    return product;
  }).filter(product => product.codificacion || product.cuit); // Filter out empty rows
}

function createHeaderMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    if (header) {
      map.set(header.toLowerCase().trim(), index);
    }
  });
  return map;
}

function getCellValue(row: any[], headerMap: Map<string, number>, possibleHeaders: string[]): string | null {
  for (const header of possibleHeaders) {
    const index = headerMap.get(header.toLowerCase());
    if (index !== undefined && row[index] !== undefined && row[index] !== null && row[index] !== '') {
      return String(row[index]).trim();
    }
  }
  return null;
}

function parseCuit(value: string | null): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[-\s]/g, '');
  const parsed = parseInt(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function parseDate(value: string | null): string | null {
  if (!value) return null;
  
  try {
    // Try to parse as Excel date number
    if (!isNaN(Number(value))) {
      const excelDate = XLSX.SSF.parse_date_code(Number(value));
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

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = parseInt(String(value));
  return isNaN(parsed) ? null : parsed;
}

export function validateClientHeaders(headers: string[]): HeaderValidationResult {
  const requiredHeaders = ['razon_social', 'cuit', 'direccion', 'email'];
  const normalizedHeaders = headers.map(h => String(h || '').toLowerCase().trim());
  
  const issues: ValidationIssue[] = [];
  
  requiredHeaders.forEach(header => {
    const found = normalizedHeaders.some(h => h.includes(header.replace('_', ' ')) || h.includes(header));
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

export function validateProductHeaders(headers: string[]): HeaderValidationResult {
  const requiredHeaders = ['codificacion', 'cuit'];
  const normalizedHeaders = headers.map(h => String(h || '').toLowerCase().trim());
  
  const issues: ValidationIssue[] = [];
  
  requiredHeaders.forEach(header => {
    const found = normalizedHeaders.some(h => h.includes(header) || h.includes(header.replace('_', ' ')));
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
  
  return {
    isValid: issues.length === 0,
    issues
  };
}