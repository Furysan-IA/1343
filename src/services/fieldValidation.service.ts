export interface FieldValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fieldsMapped: string[];
  fieldsIgnored: string[];
  fieldsProtected: string[];
}

export interface ProductFieldMapping {
  excelColumn: string;
  dbColumn: string;
  value: any;
  isValid: boolean;
  error?: string;
}

const PROTECTED_FIELDS = [
  'qr_path',
  'qr_link',
  'qr_status',
  'qr_generated_at',
  'djc_path',
  'djc_status',
  'certificado_status',
  'enviado_cliente',
  'uuid',
  'created_at',
  'updated_at',
  'dias_para_vencer'
];

const VALID_PRODUCT_FIELDS = [
  'codificacion',
  'cuit',
  'titular',
  'tipo_certificacion',
  'estado',
  'en_proceso_renovacion',
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
  'certificado_path',
  'organismo_certificacion',
  'esquema_certificacion',
  'fecha_proxima_vigilancia'
];

const DATE_FIELDS = [
  'fecha_emision',
  'vencimiento',
  'fecha_vencimiento',
  'fecha_cancelacion',
  'fecha_emision_certificado_extranjero',
  'fecha_proxima_vigilancia'
];

const INTEGER_FIELDS = [
  'cod_rubro',
  'cod_subrubro'
];

const isValidDate = (value: any): boolean => {
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return !isNaN(parsed.getTime());
  }
  return false;
};

const isValidInteger = (value: any): boolean => {
  if (typeof value === 'number') {
    return Number.isInteger(value);
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return !isNaN(parsed) && parsed.toString() === value.trim();
  }
  return false;
};

export const validateProductData = (productData: any): FieldValidationResult => {
  const result: FieldValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fieldsMapped: [],
    fieldsIgnored: [],
    fieldsProtected: []
  };

  if (!productData) {
    result.isValid = false;
    result.errors.push('Product data is null or undefined');
    return result;
  }

  if (!productData.codificacion) {
    result.isValid = false;
    result.errors.push('Missing required field: codificacion');
  }

  Object.keys(productData).forEach(key => {
    const value = productData[key];

    if (value === null || value === undefined || value === '') {
      return;
    }

    if (PROTECTED_FIELDS.includes(key)) {
      result.fieldsProtected.push(key);
      result.warnings.push(`Field '${key}' is protected and will not be updated`);
      return;
    }

    if (!VALID_PRODUCT_FIELDS.includes(key) && key !== 'titular_responsable' && key !== 'fecha_vencimiento') {
      result.fieldsIgnored.push(key);
      result.warnings.push(`Field '${key}' is not a valid product field and will be ignored`);
      return;
    }

    if (DATE_FIELDS.includes(key)) {
      if (!isValidDate(value)) {
        result.errors.push(`Field '${key}' has invalid date value: ${value}`);
        result.isValid = false;
        return;
      }
    }

    if (INTEGER_FIELDS.includes(key)) {
      if (!isValidInteger(value)) {
        result.warnings.push(`Field '${key}' should be an integer, got: ${value}`);
      }
    }

    result.fieldsMapped.push(key);
  });

  return result;
};

export const getFieldMappingSummary = (productData: any): ProductFieldMapping[] => {
  const mappings: ProductFieldMapping[] = [];

  if (!productData) {
    return mappings;
  }

  Object.keys(productData).forEach(key => {
    const value = productData[key];
    let dbColumn = key;
    let isValid = true;
    let error: string | undefined;

    if (key === 'titular_responsable') {
      dbColumn = 'titular';
    } else if (key === 'fecha_vencimiento') {
      dbColumn = 'vencimiento';
    }

    if (PROTECTED_FIELDS.includes(key)) {
      isValid = false;
      error = 'Protected field - will not be updated';
    } else if (!VALID_PRODUCT_FIELDS.includes(key) && key !== 'titular_responsable' && key !== 'fecha_vencimiento') {
      isValid = false;
      error = 'Not a valid product field';
    } else if (DATE_FIELDS.includes(key) && value && !isValidDate(value)) {
      isValid = false;
      error = 'Invalid date format';
    }

    mappings.push({
      excelColumn: key,
      dbColumn,
      value,
      isValid,
      error
    });
  });

  return mappings;
};

export const generateValidationReport = (validationResult: FieldValidationResult): string => {
  let report = 'Product Data Validation Report\n';
  report += '==============================\n\n';

  report += `Overall Status: ${validationResult.isValid ? 'VALID' : 'INVALID'}\n\n`;

  if (validationResult.errors.length > 0) {
    report += 'Errors:\n';
    validationResult.errors.forEach((error, index) => {
      report += `  ${index + 1}. ${error}\n`;
    });
    report += '\n';
  }

  if (validationResult.warnings.length > 0) {
    report += 'Warnings:\n';
    validationResult.warnings.forEach((warning, index) => {
      report += `  ${index + 1}. ${warning}\n`;
    });
    report += '\n';
  }

  report += `Fields Mapped: ${validationResult.fieldsMapped.length}\n`;
  if (validationResult.fieldsMapped.length > 0) {
    report += `  ${validationResult.fieldsMapped.join(', ')}\n\n`;
  }

  report += `Fields Ignored: ${validationResult.fieldsIgnored.length}\n`;
  if (validationResult.fieldsIgnored.length > 0) {
    report += `  ${validationResult.fieldsIgnored.join(', ')}\n\n`;
  }

  report += `Fields Protected: ${validationResult.fieldsProtected.length}\n`;
  if (validationResult.fieldsProtected.length > 0) {
    report += `  ${validationResult.fieldsProtected.join(', ')}\n`;
  }

  return report;
};
