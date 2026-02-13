import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CircleAlert as AlertCircle, X, Award, Calendar } from 'lucide-react';
import { validateFile, parseCertificateFile, filterByEmissionDate, categorizeExtractions, ParsedCertificates } from '../../services/certificateProcessing.service';
import { createBatchRecord } from '../../services/dualTableUpdate.service';
import { logRejectedRecord } from '../../services/certificateDiagnostics.service';
import { subDays } from 'date-fns';
import toast from 'react-hot-toast';

interface CertificateUploadScreenProps {
  onUploadComplete: (batchId: string, parsedData: ParsedCertificates, referenceDate: Date) => void;
}

export const CertificateUploadScreen: React.FC<CertificateUploadScreenProps> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [referenceDate, setReferenceDate] = useState<Date>(subDays(new Date(), 30));
  const [parsedData, setParsedData] = useState<ParsedCertificates | null>(null);
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
      const data = await parseCertificateFile(selectedFile);

      if (!data || !data.records || data.records.length === 0) {
        throw new Error('No se encontraron certificados válidos en el archivo');
      }

      setParsedData(data);
      toast.success(`Archivo parseado: ${data.records.length} certificados encontrados`);
      setShowDateFilter(true);
    } catch (error: any) {
      console.error('Error in handleUpload:', error);
      toast.error(error.message || 'Error al procesar archivo');
      setSelectedFile(null);
      setParsedData(null);
      setShowDateFilter(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDate = async () => {
    if (!parsedData) {
      toast.error('No hay datos para procesar');
      return;
    }

    setIsProcessing(true);

    try {
      const filtered = filterByEmissionDate(parsedData.extractions, referenceDate);

      if (!filtered || filtered.length === 0) {
        toast.error('No hay certificados después de la fecha seleccionada');
        setIsProcessing(false);
        return;
      }

      const batchId = await createBatchRecord(selectedFile!.name, filtered.length);

      if (!batchId) {
        throw new Error('No se pudo crear el registro del lote');
      }

      if (parsedData.rejectedRecords && parsedData.rejectedRecords.length > 0) {
        for (const rejected of parsedData.rejectedRecords) {
          await logRejectedRecord(batchId, rejected);
        }
      }

      const updatedData: ParsedCertificates = {
        ...parsedData,
        extractions: filtered,
        metadata: {
          ...parsedData.metadata,
          totalRecords: filtered.length
        }
      };

      toast.success(`${filtered.length} certificados seleccionados`);
      onUploadComplete(batchId, updatedData, referenceDate);
    } catch (error: any) {
      console.error('Error in handleConfirmDate:', error);
      toast.error(error.message || 'Error al crear lote');
    } finally {
      setIsProcessing(false);
    }
  };

  const categories = parsedData ? categorizeExtractions(
    filterByEmissionDate(parsedData.extractions, referenceDate)
  ) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Award className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Carga de Certificados
            </h1>
            <p className="text-slate-600">
              Carga el archivo de certificados del organismo certificador
            </p>
          </div>

          {!showDateFilter ? (
            <>
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Sobre este proceso</h3>
                    <p className="text-sm text-blue-700">
                      El sistema extraerá automáticamente los datos de clientes y productos de cada certificado.
                      Los registros se actualizarán en ambas tablas según la fecha de emisión del certificado.
                    </p>
                  </div>
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
                      Arrastra tu archivo de certificados
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
                      Excel (.xlsx, .xls) o CSV - Máx. 50MB, 10,000 registros
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
                        {isProcessing ? 'Procesando...' : 'Procesar Certificados'}
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

              <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-2">Campo requerido:</h4>
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <Calendar className="w-4 h-4" />
                  <span>fecha_emision (obligatorio)</span>
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  Esta fecha se usará para determinar si los registros deben actualizarse
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-3 text-lg">
                  Archivo procesado exitosamente
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-green-700">Total de certificados:</p>
                    <p className="text-2xl font-bold text-green-900">{parsedData?.records.length}</p>
                  </div>
                  {parsedData && parsedData.metadata.totalRejected > 0 && (
                    <div>
                      <p className="text-red-700">Registros rechazados:</p>
                      <p className="text-2xl font-bold text-red-900">{parsedData.metadata.totalRejected}</p>
                      <p className="text-xs text-red-600 mt-1">Filas vacías o sin fecha_emision</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-700">Columnas detectadas:</p>
                    <p className="text-2xl font-bold text-slate-900">{parsedData?.metadata.columnCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Filtrar por Fecha de Emisión
                </h3>

                <p className="text-sm text-slate-600 mb-4">
                  Solo se procesarán certificados emitidos después de esta fecha
                </p>

                <input
                  type="date"
                  value={referenceDate.toISOString().split('T')[0]}
                  onChange={(e) => setReferenceDate(new Date(e.target.value))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                />

                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setReferenceDate(subDays(new Date(), 7))}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    Últimos 7 días
                  </button>
                  <button
                    onClick={() => setReferenceDate(subDays(new Date(), 30))}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    Últimos 30 días
                  </button>
                  <button
                    onClick={() => setReferenceDate(subDays(new Date(), 90))}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    Últimos 90 días
                  </button>
                  <button
                    onClick={() => setReferenceDate(new Date(0))}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                  >
                    Todos
                  </button>
                </div>

                {categories && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-blue-900 mb-3">Vista Previa:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-blue-700">Certificados a procesar:</p>
                        <p className="text-xl font-bold text-blue-900">
                          {filterByEmissionDate(parsedData!.extractions, referenceDate).length}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-700">Registros completos:</p>
                        <p className="text-xl font-bold text-blue-900">{categories.totalComplete}</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Clientes nuevos:</p>
                        <p className="text-xl font-bold text-amber-900">{categories.incompleteClients.length}</p>
                      </div>
                      <div>
                        <p className="text-blue-700">Necesitan completar datos:</p>
                        <p className="text-xl font-bold text-amber-900">{categories.totalIncomplete}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowDateFilter(false);
                    setSelectedFile(null);
                    setParsedData(null);
                  }}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDate}
                  disabled={isProcessing || !categories || filterByEmissionDate(parsedData!.extractions, referenceDate).length === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-slate-400"
                >
                  {isProcessing ? 'Procesando...' : 'Continuar'}
                </button>
              </div>
            </div>
          )}
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
              <div className="space-y-3">
                {validationErrors.map((error, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-red-900">{error.message}</p>
                        {error.code && (
                          <p className="text-sm text-red-700 mt-1">Código: {error.code}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-6 flex justify-end">
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
