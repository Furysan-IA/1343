export type ChangeType = 'new' | 'update' | 'no_change';
export type ChangeSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FieldType = 'text' | 'number' | 'date' | 'boolean';

export interface FieldChange {
  field: string;
  fieldLabel: string;
  currentValue: any;
  newValue: any;
  fieldType: FieldType;
  severity: ChangeSeverity;
  isProtected: boolean;
  willChange: boolean;
}

export interface ProductComparison {
  codificacion: string;
  productName: string;
  changeType: ChangeType;
  changes: FieldChange[];
  warnings: string[];
  impactLevel: ChangeSeverity;
  hasConflicts: boolean;
}

export interface ClientComparison {
  cuit: number;
  clientName: string;
  changeType: ChangeType;
  changes: FieldChange[];
  warnings: string[];
  impactLevel: ChangeSeverity;
}

export interface DetailedAnalysisResult {
  products: {
    new: ProductComparison[];
    updates: ProductComparison[];
    noChanges: ProductComparison[];
  };
  clients: {
    new: ClientComparison[];
    updates: ClientComparison[];
    noChanges: ClientComparison[];
  };
  summary: {
    totalProducts: number;
    productsNew: number;
    productsUpdate: number;
    productsNoChange: number;
    totalClients: number;
    clientsNew: number;
    clientsUpdate: number;
    clientsNoChange: number;
    totalFieldChanges: number;
    criticalChanges: number;
    warnings: number;
  };
  globalWarnings: string[];
}

export interface ImportLog {
  id?: string;
  user_id: string;
  operation_type: 'preview' | 'import';
  batch_id: string;
  records_affected: number;
  changes_summary: any;
  status: 'success' | 'error' | 'partial';
  error_details?: string;
  created_at?: string;
}
