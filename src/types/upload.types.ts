export interface Client {
  cuit: number;
  razon_social: string;
  direccion: string;
  email: string;
  telefono?: string;
  contacto?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Product {
  uuid?: string;
  codificacion: string;
  cuit: number;
  titular?: string;
  tipo_certificacion?: string;
  estado?: string;
  en_proceso_renovacion?: string;
  direccion_legal_empresa?: string;
  fabricante?: string;
  planta_fabricacion?: string;
  origen?: string;
  producto?: string;
  marca?: string;
  modelo?: string;
  caracteristicas_tecnicas?: string;
  normas_aplicacion?: string;
  informe_ensayo_nro?: string;
  laboratorio?: string;
  ocp_extranjero?: string;
  n_certificado_extranjero?: string;
  fecha_emision_certificado_extranjero?: Date;
  disposicion_convenio?: string;
  cod_rubro?: number;
  cod_subrubro?: number;
  nombre_subrubro?: string;
  fecha_emision?: Date;
  vencimiento?: Date;
  fecha_cancelacion?: Date;
  motivo_cancelacion?: string;
  dias_para_vencer?: number;
  organismo_certificacion?: string;
  esquema_certificacion?: string;
  fecha_proxima_vigilancia?: Date;
  djc_status?: string;
  certificado_status?: string;
  enviado_cliente?: string;
  certificado_path?: string;
  djc_path?: string;
  qr_path?: string;
  qr_link?: string;
  qr_status?: string;
  qr_generated_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface ValidationIssue {
  type: 'duplicate_client' | 'duplicate_product' | 'missing_data' | 'data_change' | 'invalid_data';
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: any;
}

export interface ChangeDetail {
  existing: any;
  new: any;
  changes: string[];
}

export interface ValidatedData {
  newClients: Client[];
  updatedClients: ChangeDetail[];
  newProducts: Product[];
  updatedProducts: ChangeDetail[];
  issues: ValidationIssue[];
}

export interface UploadProgress {
  stage: 'parsing' | 'mapping' | 'validating' | 'backing_up' | 'applying' | 'completed' | 'error';
  message: string;
  progress: number;
  details?: any;
}

export interface UploadResult {
  success: boolean;
  batchId: string;
  backupSnapshotId?: string;
  stats: {
    totalRecords: number;
    newClients: number;
    updatedClients: number;
    newProducts: number;
    updatedProducts: number;
    errors: number;
    warnings: number;
  };
  errors?: string[];
  processingTimeMs: number;
}

export interface ApprovalState {
  newClients: Record<number, boolean>;
  updatedClients: Record<number, boolean>;
  newProducts: Record<string, boolean>;
  updatedProducts: Record<string, boolean>;
}

export interface UploadBatch {
  id?: string;
  filename: string;
  file_size: number;
  total_records: number;
  processed_records?: number;
  new_records?: number;
  updated_records?: number;
  skipped_records?: number;
  error_records?: number;
  status?: string;
  uploaded_by: string;
  uploaded_at?: Date;
  completed_at?: Date;
  reference_date?: Date;
  processing_time_ms?: number;
  error_summary?: any[];
  metadata?: any;
  entity_type?: string;
  error_count?: number;
}

export interface ParsedExcelData {
  rows: any[];
  headers: string[];
  totalRows: number;
}

export interface MappingResult {
  clients: Client[];
  products: Product[];
  errors: string[];
  warnings: string[];
  unmappedColumns: string[];
}
