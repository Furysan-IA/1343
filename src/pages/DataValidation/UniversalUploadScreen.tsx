import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CircleAlert as AlertCircle, CircleCheck as CheckCircle, X, Users, Package, RefreshCw } from 'lucide-react';
import { validateFile, parseFile, validateParsedData, createBatch, checkExistingCertificates, ParsedData, EntityType } from '../../services/universalDataValidation.service';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/Common/LoadingSpinner';

interface UniversalUploadScreenProps {
  onUploadComplete: (batchId: string, parsedData: ParsedData) => void;
}

interface DuplicateCheckStats {
  totalInFile: number;
  withBaja: number;
  activeRecords: number;
  withCodificacion: number;
  duplicatesFound: number;
  newRecordsCount: number;
}

interface DuplicateCheckResult {
  duplicates: Array<{ codificacion: string; existing: any; incoming: any }>;
  newRecords: any[];
  filtered: any[];
  stats: DuplicateCheckStats;
}

export const UniversalUploadScreen: React.FC<UniversalUploadScreenProps> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<DuplicateCheckResult | null>(null);
  const [parsedDataCache, setParsedDataCache] = useState<ParsedData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file: File) => {
    const validation = validateFile(file);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setShowErrorModal(true);
      return;
    }

    setSelectedFile(file);
    setValidationErrors([]);
  };

  const handleContinueAfterDuplicateCheck = async () => {
    if (!selectedFile || !duplicateCheckResult || !parsedDataCache) {
      console.error('Missing required data:', { selectedFile, duplicateCheckResult, parsedDataCache });
      toast.error('Error: Datos faltantes. Por favor vuelve a cargar el archivo.');
      setShowDuplicateModal(false);
      setIsProcessing(false);
      return;
    }

    setShowDuplicateModal(false);
    setIsProcessing(true);

    try {
      // Continuar con el paso 4: Crear batch
      setProcessingStep('Preparando análisis...');
      setProgress(80);
      console.log('Creating batch...');

      const batchId = await createBatch({
        filename: selectedFile.name,
        fileSize: selectedFile.size,
        totalRecords: duplicateCheckResult.stats.activeRecords
      });

      console.log('Batch created:', batchId);

      // Paso 5: Completado
      setProcessingStep('Análisis completado!');
      setProgress(100);

      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success('Archivo validado exitosamente!');
      onUploadComplete(batchId, parsedDataCache);
    } catch (error: any) {
      console.error('❌ Error continuing after duplicate check:', error);
      toast.error(error.message || 'Error al continuar con el proceso');
      setIsProcessing(false);
    }
  };

  const handleCancelDuplicateCheck = () => {
    console.log('❌ User cancelled upload');
    setShowDuplicateModal(false);
    setDuplicateCheckResult(null);
    setParsedDataCache(null);
    setIsProcessing(false);
    setSelectedFile(null);
    setProgress(0);
    setProcessingStep('');
    toast.info('Carga cancelada');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      console.log('Starting file processing...', { fileName: selectedFile.name });

      // Paso 1: Leer archivo
      setProcessingStep('Leyendo archivo...');
      setProgress(20);

      console.log('About to parse file...');
      const parsedData = await parseFile(selectedFile);
      console.log('File parsed successfully:', {
        rowCount: parsedData.rows.length,
        headers: parsedData.headers,
        sampleRow: parsedData.rows[0]
      });

      // Paso 2: Validar estructura
      setProcessingStep('Validando estructura...');
      setProgress(40);
      const dataValidation = validateParsedData(parsedData);

      if (!dataValidation.isValid) {
        console.error('Validation failed:', dataValidation.errors);
        setValidationErrors([...dataValidation.errors, ...dataValidation.warnings]);
        setShowErrorModal(true);
        setIsProcessing(false);
        setSelectedFile(null);
        setProgress(0);
        return;
      }

      // Paso 3: Verificar certificados duplicados
      setProcessingStep('Verificando certificados existentes...');
      setProgress(60);
      console.log('Checking for existing certificates...');

      const duplicateCheck = await checkExistingCertificates(parsedData.rows);

      console.log('Duplicate check result:', duplicateCheck.stats);

      // Guardar datos parseados y resultado del check
      setParsedDataCache(parsedData);
      setDuplicateCheckResult(duplicateCheck);

      // Cambiar el mensaje del spinner mientras preparamos el modal
      setProcessingStep('Preparando resumen...');
      setProgress(70);

      // Pequeño delay para asegurar que el estado se actualice
      await new Promise(resolve => setTimeout(resolve, 100));

      // Ahora sí, cerrar el spinner y mostrar el modal
      setIsProcessing(false);
      setProgress(0);
      setProcessingStep('');
      setShowDuplicateModal(true);

      // Esperar respuesta del usuario (el flujo continúa en handleContinueAfterDuplicateCheck)
      return;

      // Paso 4: Crear batch
      setProcessingStep('Preparando análisis...');
      setProgress(80);
      console.log('Creating batch...');
      const batchId = await createBatch({
        filename: selectedFile.name,
        fileSize: selectedFile.size,
        totalRecords: parsedData.rows.length
      });

      console.log('Batch created:', batchId);

      // Paso 5: Completado
      setProcessingStep('Análisis completado!');
      setProgress(100);

      // Pequeño delay para que el usuario vea el 100%
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success('Archivo validado exitosamente!');
      onUploadComplete(batchId, parsedData);
    } catch (error: any) {
      console.error('❌ Error processing file:', error);
      console.error('Error stack:', error?.stack);
      console.error('Error details:', {
        message: error?.message,
        name: error?.name,
        cause: error?.cause
      });

      const errorMessage = error?.message || 'Error desconocido al procesar archivo';
      toast.error(errorMessage);

      setValidationErrors([{
        message: errorMessage,
        code: error?.code || 'UNKNOWN_ERROR'
      }]);
      setShowErrorModal(true);
      setIsProcessing(false);
      setSelectedFile(null);
      setProgress(0);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 relative">
      {/* Modal de Progreso */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 text-center max-w-md">
            <RefreshCw className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">🔍 Validando Archivo</h2>
            <p className="text-slate-600 mb-2">{processingStep || 'Iniciando...'}</p>
            <p className="text-sm text-slate-500 mb-4">Sin modificar la base de datos</p>
            <div className="mt-4 w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-slate-700 font-medium mt-2">{progress}%</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Carga de Datos
            </h1>
            <p className="text-slate-600">
              Sube tu archivo Excel con clientes y/o productos
            </p>
            <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 text-left">
              <p className="text-sm text-blue-900">
                El sistema detectará automáticamente qué hay en tu archivo (clientes, productos o ambos) y procesará todo de forma inteligente.
              </p>
            </div>
          </div>

          <div
            className={`border-3 border-dashed rounded-xl p-12 text-center transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 bg-slate-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!selectedFile ? (
              <>
                <Upload className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  Arrastra tu archivo aquí
                </h3>
                <p className="text-slate-500 mb-4">
                  o haz clic para seleccionar
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Seleccionar Archivo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <p className="text-sm text-slate-400 mt-4">
                  Formatos soportados: .xlsx, .xls, .csv (Máx 50MB, 10,000 registros)
                </p>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  {selectedFile.name}
                </h3>
                <p className="text-slate-500 mb-4">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleUpload}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-slate-400 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Analizando...' : '🔍 Validar Datos'}
                  </button>
                  <button
                    onClick={() => setSelectedFile(null)}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="mt-8 bg-slate-50 rounded-lg p-6 border-2 border-slate-200">
            <h4 className="font-semibold text-slate-800 mb-3">
              📋 Columnas que puede contener tu archivo
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-blue-700 mb-2">Para Clientes:</p>
                <ul className="space-y-1 text-slate-600">
                  <li>• CUIT (requerido)</li>
                  <li>• Razón Social</li>
                  <li>• Dirección</li>
                  <li>• Email</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-green-700 mb-2">Para Productos:</p>
                <ul className="space-y-1 text-slate-600">
                  <li>• Codificación (requerido)</li>
                  <li>• CUIT</li>
                  <li>• Producto</li>
                  <li>• Marca / Modelo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-red-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6" />
                <h2 className="text-xl font-bold">Errores de Validación</h2>
              </div>
              <button
                onClick={() => setShowErrorModal(false)}
                className="hover:bg-red-700 rounded-lg p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              <p className="text-slate-600 mb-4">
                Se encontraron {validationErrors.length} error(es). Por favor corrige estos problemas e intenta nuevamente.
              </p>

              <div className="space-y-3">
                {validationErrors.map((error, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-red-900">
                          {error.message}
                        </p>
                        {error.row && (
                          <p className="text-sm text-red-700 mt-1">
                            Fila: {error.row}
                            {error.field && ` | Campo: ${error.field}`}
                            {error.code && ` | Código: ${error.code}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Análisis de Certificados */}
      {showDuplicateModal && duplicateCheckResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className={`p-6 ${duplicateCheckResult.stats.duplicatesFound > 0 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-600'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {duplicateCheckResult.stats.duplicatesFound > 0 ? (
                    <AlertCircle className="w-8 h-8 text-white" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-white" />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {duplicateCheckResult.stats.duplicatesFound > 0
                        ? 'Certificados Duplicados Detectados'
                        : 'Análisis Completado'}
                    </h2>
                    <p className="text-white/90 text-sm mt-1">
                      Revisión de certificados en base de datos
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Resumen General */}
              <div className="bg-slate-50 rounded-xl p-5 mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-slate-600" />
                  Resumen del Archivo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600">Total de filas</p>
                    <p className="text-2xl font-bold text-slate-900">{duplicateCheckResult.stats.totalInFile.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600">Registros con "baja"</p>
                    <p className="text-2xl font-bold text-red-600">{duplicateCheckResult.stats.withBaja.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">Ignorados automáticamente</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600">Registros activos</p>
                    <p className="text-2xl font-bold text-blue-600">{duplicateCheckResult.stats.activeRecords.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600">Con codificación</p>
                    <p className="text-2xl font-bold text-purple-600">{duplicateCheckResult.stats.withCodificacion.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Análisis de Duplicados */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-slate-600" />
                  Análisis de Certificados
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg border-2 ${duplicateCheckResult.stats.duplicatesFound > 0 ? 'bg-orange-50 border-orange-300' : 'bg-white border-slate-200'}`}>
                    <p className="text-sm text-slate-600">Ya existen en BD</p>
                    <p className={`text-3xl font-bold ${duplicateCheckResult.stats.duplicatesFound > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                      {duplicateCheckResult.stats.duplicatesFound.toLocaleString()}
                    </p>
                    {duplicateCheckResult.stats.duplicatesFound > 0 && (
                      <p className="text-xs text-orange-700 mt-1 font-medium">Duplicados detectados</p>
                    )}
                  </div>
                  <div className="bg-green-50 border-2 border-green-300 p-4 rounded-lg">
                    <p className="text-sm text-slate-600">Nuevos certificados</p>
                    <p className="text-3xl font-bold text-green-600">{duplicateCheckResult.stats.newRecordsCount.toLocaleString()}</p>
                    <p className="text-xs text-green-700 mt-1 font-medium">Listos para cargar</p>
                  </div>
                </div>
              </div>

              {/* Lista de Duplicados */}
              {duplicateCheckResult.duplicates.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-orange-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Ejemplos de Certificados Duplicados
                  </h3>
                  <p className="text-sm text-orange-800 mb-4">
                    Los siguientes certificados ya existen en la base de datos. Podrás revisarlos en la siguiente pantalla.
                  </p>
                  <div className="bg-white rounded-lg border border-orange-200 overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      {duplicateCheckResult.duplicates.slice(0, 10).map((dup, idx) => (
                        <div
                          key={idx}
                          className="p-3 border-b border-orange-100 last:border-0 hover:bg-orange-50 transition-colors"
                        >
                          <p className="font-mono text-sm font-semibold text-orange-900">
                            {dup.codificacion}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {dup.incoming.titular || 'Sin titular'}
                          </p>
                        </div>
                      ))}
                    </div>
                    {duplicateCheckResult.duplicates.length > 10 && (
                      <div className="p-3 bg-orange-100 text-center text-sm text-orange-800 font-medium">
                        ... y {duplicateCheckResult.duplicates.length - 10} certificados más
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mensaje Informativo */}
              <div className={`mt-6 p-4 rounded-lg border-l-4 ${duplicateCheckResult.stats.duplicatesFound > 0 ? 'bg-orange-50 border-orange-500' : 'bg-green-50 border-green-500'}`}>
                <p className={`text-sm ${duplicateCheckResult.stats.duplicatesFound > 0 ? 'text-orange-800' : 'text-green-800'}`}>
                  {duplicateCheckResult.stats.duplicatesFound > 0
                    ? '⚠️ Los certificados duplicados aparecerán en la pantalla de revisión donde podrás decidir qué hacer con cada uno.'
                    : '✅ Todos los certificados son nuevos y están listos para ser cargados en el sistema.'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-6 flex gap-3 justify-end border-t border-slate-200">
              <button
                onClick={handleCancelDuplicateCheck}
                className="px-6 py-2.5 bg-white border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleContinueAfterDuplicateCheck}
                className={`px-6 py-2.5 text-white rounded-lg transition-colors font-medium ${
                  duplicateCheckResult.stats.duplicatesFound > 0
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
