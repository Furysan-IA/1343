import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { 
  parseExcelFile, 
  validateClientHeaders, 
  validateProductHeaders,
  ValidationIssue 
} from '../utils/excelParsingService';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  FileText,
  Download,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ValidationResult {
  fileName: string;
  fileType: 'clients' | 'products' | 'unknown';
  isValid: boolean;
  issues: ValidationIssue[];
  rowCount: number;
  validRowCount: number;
}

export function InformationValidation() {
  const { t } = useLanguage();
  const [validating, setValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);

  const detectFileType = (headers: string[]): 'clients' | 'products' | 'unknown' => {
    const normalizedHeaders = headers.map(h => String(h || '').toLowerCase().trim());
    
    // Check for client headers
    const clientHeaders = ['razon_social', 'razon social', 'cuit', 'direccion', 'email'];
    const hasClientHeaders = clientHeaders.some(header => 
      normalizedHeaders.some(h => h.includes(header.replace('_', ' ')) || h.includes(header))
    );
    
    // Check for product headers
    const productHeaders = ['codificacion', 'codigo', 'producto', 'marca', 'modelo'];
    const hasProductHeaders = productHeaders.some(header => 
      normalizedHeaders.some(h => h.includes(header.replace('_', ' ')) || h.includes(header))
    );
    
    if (hasClientHeaders && !hasProductHeaders) return 'clients';
    if (hasProductHeaders && !hasClientHeaders) return 'products';
    if (hasProductHeaders && hasClientHeaders) return 'products'; // Assume products if both
    
    return 'unknown';
  };

  const validateFile = async (file: File): Promise<ValidationResult> => {
    try {
      // Parse Excel file
      const { headers, data } = await parseExcelFile(file);
      
      if (headers.length === 0) {
        throw new Error('El archivo no contiene encabezados válidos');
      }

      // Detect file type
      const fileType = detectFileType(headers);
      
      if (fileType === 'unknown') {
        return {
          fileName: file.name,
          fileType: 'unknown',
          isValid: false,
          issues: [{
            type: 'missing_field',
            row: 1,
            field: 'headers',
            column: 'All',
            message: 'No se pudo determinar el tipo de archivo. Debe contener columnas de clientes o productos.',
            severity: 'error',
            suggestedAction: 'Verificar que el archivo contenga las columnas correctas'
          }],
          rowCount: data.length,
          validRowCount: 0
        };
      }

      // Validate headers based on file type
      let headerValidation;
      if (fileType === 'clients') {
        headerValidation = validateClientHeaders(headers);
      } else {
        headerValidation = validateProductHeaders(headers);
      }

      // Count valid rows (non-empty rows)
      const validRowCount = data.filter(row => 
        row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
      ).length;

      return {
        fileName: file.name,
        fileType,
        isValid: headerValidation.isValid && validRowCount > 0,
        issues: headerValidation.issues,
        rowCount: data.length,
        validRowCount
      };

    } catch (error: any) {
      return {
        fileName: file.name,
        fileType: 'unknown',
        isValid: false,
        issues: [{
          type: 'invalid_format',
          row: 0,
          field: 'file',
          column: 'All',
          message: `Error al procesar archivo: ${error.message}`,
          severity: 'error',
          suggestedAction: 'Verificar que el archivo sea un Excel válido (.xlsx o .xls)'
        }],
        rowCount: 0,
        validRowCount: 0
      };
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setValidating(true);
    
    try {
      const results: ValidationResult[] = [];
      
      for (const file of Array.from(files)) {
        const result = await validateFile(file);
        results.push(result);
      }
      
      setValidationResults(results);
      
      const validFiles = results.filter(r => r.isValid).length;
      const totalFiles = results.length;
      
      if (validFiles === totalFiles) {
        toast.success(`Todos los archivos (${totalFiles}) son válidos`);
      } else if (validFiles > 0) {
        toast.warning(`${validFiles} de ${totalFiles} archivos son válidos`);
      } else {
        toast.error(`Ningún archivo es válido. Revisa los errores.`);
      }

      // Log validation activity
      try {
        await supabase.rpc('log_error', {
          error_msg: `File validation completed: ${validFiles}/${totalFiles} valid files`,
          error_context: { 
            section: 'Information Validation', 
            action: 'File Validation',
            results: results.map(r => ({ fileName: r.fileName, isValid: r.isValid, fileType: r.fileType }))
          }
        });
      } catch (logError) {
        console.error('Failed to log validation activity:', logError);
      }

    } catch (error: any) {
      toast.error(`Error durante la validación: ${error.message}`);
    } finally {
      setValidating(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const clearResults = () => {
    setValidationResults([]);
  };

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'clients': return 'Clientes';
      case 'products': return 'Productos';
      default: return 'Desconocido';
    }
  };

  const getSeverityIcon = (severity: 'error' | 'warning') => {
    return severity === 'error' ? 
      <XCircle className="h-4 w-4 text-red-500" /> : 
      <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {t('informationValidation')}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Valida archivos Excel antes de cargarlos al sistema
          </p>
        </div>
        {validationResults.length > 0 && (
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={clearResults}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Limpiar Resultados
            </button>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Subir archivos para validación
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Selecciona uno o más archivos Excel (.xlsx, .xls) para validar su estructura y contenido
          </p>
          <div className="mt-6">
            <label className="relative inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {validating ? 'Validando...' : 'Seleccionar Archivos'}
              <input
                type="file"
                accept=".xlsx,.xls"
                multiple
                onChange={handleFileUpload}
                disabled={validating}
                className="sr-only"
              />
            </label>
          </div>
          {validating && (
            <div className="mt-4 flex justify-center">
              <LoadingSpinner size="md" />
            </div>
          )}
        </div>
      </div>

      {/* Validation Results */}
      {validationResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            {t('validationResults')}
          </h3>
          
          {validationResults.map((result, index) => (
            <div key={index} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <h4 className="text-lg font-medium text-gray-900">
                      {result.fileName}
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      result.fileType === 'clients' ? 'bg-blue-100 text-blue-800' :
                      result.fileType === 'products' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getFileTypeLabel(result.fileType)}
                    </span>
                    {result.isValid ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Válido
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inválido
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total de filas</dt>
                    <dd className="text-sm text-gray-900">{result.rowCount}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Filas válidas</dt>
                    <dd className="text-sm text-gray-900">{result.validRowCount}</dd>
                  </div>
                </div>

                {result.issues.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">
                      Problemas encontrados ({result.issues.length})
                    </h5>
                    <div className="space-y-2">
                      {result.issues.map((issue, issueIndex) => (
                        <div key={issueIndex} className={`p-3 rounded-md border-l-4 ${
                          issue.severity === 'error' ? 'bg-red-50 border-red-400' : 'bg-yellow-50 border-yellow-400'
                        }`}>
                          <div className="flex">
                            <div className="flex-shrink-0">
                              {getSeverityIcon(issue.severity)}
                            </div>
                            <div className="ml-3">
                              <p className={`text-sm ${
                                issue.severity === 'error' ? 'text-red-800' : 'text-yellow-800'
                              }`}>
                                <strong>Fila {issue.row}, Campo {issue.field}:</strong> {issue.message}
                              </p>
                              <p className={`text-xs mt-1 ${
                                issue.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                              }`}>
                                Acción sugerida: {issue.suggestedAction}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}