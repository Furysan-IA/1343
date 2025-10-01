import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CircleAlert as AlertCircle, CircleCheck as CheckCircle, X, Users, Package } from 'lucide-react';
import { validateFile, parseFile, validateParsedData, createBatch, ParsedData, EntityType } from '../../services/universalDataValidation.service';
import toast from 'react-hot-toast';

interface UniversalUploadScreenProps {
  onUploadComplete: (batchId: string, parsedData: ParsedData) => void;
}

export const UniversalUploadScreen: React.FC<UniversalUploadScreenProps> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
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

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);

    try {
      console.log('Starting file processing...', { fileName: selectedFile.name });

      const parsedData = await parseFile(selectedFile);
      console.log('File parsed successfully:', { rowCount: parsedData.rows.length });

      const dataValidation = validateParsedData(parsedData, 'mixed');

      if (!dataValidation.isValid) {
        console.error('Validation failed:', dataValidation.errors);
        setValidationErrors([...dataValidation.errors, ...dataValidation.warnings]);
        setShowErrorModal(true);
        setIsProcessing(false);
        setSelectedFile(null);
        return;
      }

      console.log('Creating batch...');
      const batchId = await createBatch(
        {
          filename: selectedFile.name,
          fileSize: selectedFile.size,
          totalRecords: parsedData.rows.length
        },
        'mixed'
      );

      console.log('Batch created:', batchId);
      toast.success('Archivo cargado exitosamente!');
      onUploadComplete(batchId, parsedData);
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast.error(error.message || 'Error al procesar archivo');
      setValidationErrors([{
        message: error.message || 'Error desconocido al procesar archivo',
        code: 'UNKNOWN_ERROR'
      }]);
      setShowErrorModal(true);
      setIsProcessing(false);
      setSelectedFile(null);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
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
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-slate-400"
                  >
                    {isProcessing ? 'Procesando...' : 'Subir y Validar'}
                  </button>
                  <button
                    onClick={() => setSelectedFile(null)}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:bg-slate-100"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>

          <div className={`mt-8 rounded-lg p-6 border-2 ${
            entityType === 'client' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
          }`}>
            <h4 className={`font-semibold mb-3 ${
              entityType === 'client' ? 'text-blue-900' : 'text-green-900'
            }`}>
              Columnas Requeridas para {entityType === 'client' ? 'Clientes' : 'Productos'}:
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {getRequiredColumns().map((col) => (
                <div key={col} className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${
                    entityType === 'client' ? 'text-blue-600' : 'text-green-600'
                  }`} />
                  <span className={`text-sm ${
                    entityType === 'client' ? 'text-blue-800' : 'text-green-800'
                  }`}>
                    {col}
                  </span>
                </div>
              ))}
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
    </div>
  );
};
