import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Upload, Calendar, CircleCheck as CheckCircle2, Circle as XCircle, TriangleAlert as AlertTriangle, FileText, Download, RefreshCw, ListFilter as Filter, Users, ChartBar as BarChart3, Clock, Undo2, ChevronRight, ChevronLeft, Eye, CreditCard as Edit2, Check, X as XIcon, Plus, Minus, Info, ArrowRight } from 'lucide-react';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  validateFile,
  parseFile,
  filterByDate,
  exportErrorReport,
  ParsedData,
  ClientRecord,
  ValidationError,
} from '../services/fileValidation.service';
import {
  matchClients,
  categorizeMatches,
  MatchResult,
} from '../services/clientMatching.service';
import {
  createBatch,
  updateBatchStatus,
  insertClient,
  updateClient,
  skipClient,
  generateReport,
  savePotentialDuplicate,
  addToUndoStack,
  getUndoStack,
  undoAction,
  ProcessingReport,
} from '../services/clientUpdate.service';
import { formatCuit } from '../utils/formatters';

type WorkflowStep = 'upload' | 'filter' | 'match' | 'confirm' | 'results';

interface SelectedAction {
  matchIndex: number;
  action: 'add' | 'update' | 'skip';
}

export function ClientDataValidation() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [loading, setLoading] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [filteredRecords, setFilteredRecords] = useState<ClientRecord[]>([]);
  const [referenceDate, setReferenceDate] = useState<Date>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [categorizedMatches, setCategorizedMatches] = useState<any>(null);
  const [selectedActions, setSelectedActions] = useState<SelectedAction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const [batchId, setBatchId] = useState<string | null>(null);
  const [processingReport, setProcessingReport] = useState<ProcessingReport | null>(null);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random()}`);

  const [isDragging, setIsDragging] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  useEffect(() => {
    if (currentStep === 'confirm' && batchId) {
      loadUndoStack();
    }
  }, [currentStep, batchId]);

  const loadUndoStack = async () => {
    const stack = await getUndoStack(sessionId);
    setUndoStack(stack);
  };

  const handleFileSelect = (file: File) => {
    const errors = validateFile(file);

    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error.message));
      return;
    }

    setSelectedFile(file);
  };

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
      handleFileSelect(file);
    }
  };

  const handleParseFile = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const data = await parseFile(selectedFile);
      setParsedData(data);

      if (data.errors.length > 0) {
        toast.error(`Se encontraron ${data.errors.length} errores en el archivo`);
      }

      if (data.records.length > 0) {
        toast.success(`${data.records.length} registros válidos encontrados`);
        setCurrentStep('filter');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    if (!parsedData) return;

    const filtered = filterByDate(parsedData.records, referenceDate);
    setFilteredRecords(filtered);

    if (filtered.length === 0) {
      toast.error('Ningún registro cumple con el filtro de fecha');
      return;
    }

    toast.success(`${filtered.length} registros cumplen con el filtro`);
    setCurrentStep('match');
    handleMatchClients(filtered);
  };

  const handleMatchClients = async (records: ClientRecord[]) => {
    setLoading(true);
    try {
      const matchResults = await matchClients(records);
      setMatches(matchResults);

      const categorized = categorizeMatches(matchResults);
      setCategorizedMatches(categorized);

      const batch = await createBatch(
        {
          filename: selectedFile?.name || 'unknown',
          fileSize: selectedFile?.size || 0,
          totalRecords: records.length,
          referenceDate,
        },
        user?.id || ''
      );

      setBatchId(batch);

      for (const match of matchResults) {
        if (match.type === 'potential') {
          await savePotentialDuplicate(batch, match);
        }
      }

      toast.success('Análisis de coincidencias completado');
      setCurrentStep('confirm');
    } catch (error: any) {
      toast.error(`Error al analizar coincidencias: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleActionSelect = (matchIndex: number, action: 'add' | 'update' | 'skip') => {
    setSelectedActions((prev) => {
      const existing = prev.find((a) => a.matchIndex === matchIndex);
      if (existing) {
        return prev.map((a) =>
          a.matchIndex === matchIndex ? { ...a, action } : a
        );
      }
      return [...prev, { matchIndex, action }];
    });
  };

  const handleProcessSelected = async () => {
    if (!batchId || selectedActions.length === 0) {
      toast.error('No hay acciones seleccionadas');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      let errors = 0;

      for (const selected of selectedActions) {
        const match = matches[selected.matchIndex];

        try {
          if (selected.action === 'add') {
            const result = await insertClient(match.uploadedClient, batchId, user?.id || '');
            if (result.success) {
              inserted++;
              await addToUndoStack(
                sessionId,
                batchId,
                'add_client',
                match.uploadedClient,
                user?.id || ''
              );
            } else {
              errors++;
            }
          } else if (selected.action === 'update' && match.existingClient) {
            const result = await updateClient(
              match.existingClient.cuit,
              match.uploadedClient,
              batchId,
              user?.id || ''
            );
            if (result.success) {
              updated++;
            } else {
              errors++;
            }
          } else {
            await skipClient(
              match.uploadedClient,
              batchId,
              user?.id || '',
              'Usuario omitió'
            );
            skipped++;
          }
        } catch (error: any) {
          console.error('Error procesando registro:', error);
          errors++;
        }
      }

      const processingTime = Date.now() - startTime;

      await updateBatchStatus(batchId, 'completed', {
        processed: selectedActions.length,
        new_records: inserted,
        updated_records: updated,
        skipped_records: skipped,
        error_records: errors,
        processing_time_ms: processingTime,
      });

      const report = await generateReport(batchId);
      setProcessingReport(report);

      setSelectedActions([]);
      await loadUndoStack();

      toast.success(
        `Procesamiento completado: ${inserted} insertados, ${updated} actualizados, ${skipped} omitidos`
      );

      setCurrentStep('results');
    } catch (error: any) {
      toast.error(`Error al procesar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async (actionId: string) => {
    const success = await undoAction(actionId, user?.id || '');
    if (success) {
      toast.success('Acción deshecha');
      await loadUndoStack();
    } else {
      toast.error('No se pudo deshacer la acción');
    }
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setParsedData(null);
    setFilteredRecords([]);
    setMatches([]);
    setCategorizedMatches(null);
    setSelectedActions([]);
    setBatchId(null);
    setProcessingReport(null);
    setUndoStack([]);
    setCurrentPage(1);
    setExpandedRow(null);
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="text-center mb-6">
          <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Cargar Archivo de Clientes
          </h3>
          <p className="text-gray-600">
            Soporta archivos Excel (.xlsx, .xls) y CSV hasta 50MB
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <FileText className="w-12 h-12 text-green-600 mx-auto" />
              <div>
                <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleParseFile}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      Validar Archivo
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                Arrastra un archivo aquí o haz clic para seleccionar
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-block"
              >
                Seleccionar Archivo
              </label>
            </div>
          )}
        </div>

        {parsedData && parsedData.errors.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <h4 className="font-semibold text-red-900">
                  Errores Encontrados ({parsedData.errors.length})
                </h4>
              </div>
              <button
                onClick={() =>
                  exportErrorReport(parsedData.errors, selectedFile?.name || 'archivo')
                }
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar Errores
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {parsedData.errors.slice(0, 5).map((error, idx) => (
                <p key={idx} className="text-sm text-red-700">
                  {error.row ? `Fila ${error.row}: ` : ''}
                  {error.message}
                </p>
              ))}
              {parsedData.errors.length > 5 && (
                <p className="text-sm text-red-600 mt-2">
                  ... y {parsedData.errors.length - 5} errores más
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderFilterStep = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center gap-4 mb-6">
          <Calendar className="w-8 h-8 text-blue-600" />
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Filtrar por Fecha</h3>
            <p className="text-gray-600">
              Selecciona la fecha de referencia para filtrar registros
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Referencia
            </label>
            <input
              type="date"
              value={referenceDate.toISOString().split('T')[0]}
              onChange={(e) => setReferenceDate(new Date(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se incluirán registros modificados después de esta fecha
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Acceso Rápido
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  setReferenceDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
                }
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Últimos 7 días
              </button>
              <button
                onClick={() =>
                  setReferenceDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
                }
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Últimos 30 días
              </button>
              <button
                onClick={() =>
                  setReferenceDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
                }
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Últimos 90 días
              </button>
              <button
                onClick={() => setReferenceDate(new Date(0))}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Todos
              </button>
            </div>
          </div>
        </div>

        {parsedData && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Vista Previa</h4>
            </div>
            <p className="text-sm text-blue-700">
              Total de registros válidos: {parsedData.records.length}
            </p>
            <p className="text-sm text-blue-700">
              Registros que cumplen el filtro:{' '}
              {filterByDate(parsedData.records, referenceDate).length}
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setCurrentStep('upload')}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Atrás
          </button>
          <button
            onClick={handleApplyFilter}
            disabled={!parsedData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            Aplicar Filtro
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderConfirmStep = () => {
    if (!categorizedMatches) return null;

    const startIdx = (currentPage - 1) * recordsPerPage;
    const endIdx = startIdx + recordsPerPage;
    const displayMatches = matches.slice(startIdx, endIdx);
    const totalPages = Math.ceil(matches.length / recordsPerPage);

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Confirmar Acciones
                </h3>
                <p className="text-gray-600">
                  Revisa y confirma las acciones a realizar
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Seleccionadas: {selectedActions.length} de {matches.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Nuevos</p>
              <p className="text-2xl font-bold text-green-900">
                {categorizedMatches.summary.newClient}
              </p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Actualizaciones</p>
              <p className="text-2xl font-bold text-blue-900">
                {categorizedMatches.summary.exactMatchWithChanges}
              </p>
            </div>
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-600 font-medium">Duplicados Potenciales</p>
              <p className="text-2xl font-bold text-orange-900">
                {categorizedMatches.summary.potentialDuplicate}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    CUIT
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Confianza
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Detalles
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayMatches.map((match, idx) => {
                  const globalIdx = startIdx + idx;
                  const selected = selectedActions.find(
                    (a) => a.matchIndex === globalIdx
                  );
                  const isExpanded = expandedRow === globalIdx;

                  return (
                    <>
                      <tr key={globalIdx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {match.type === 'new' && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                              Nuevo
                            </span>
                          )}
                          {match.type === 'exact' && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              Actualización
                            </span>
                          )}
                          {match.type === 'potential' && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                              Duplicado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {match.uploadedClient.razon_social}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                          {formatCuit(parseInt(match.uploadedClient.cuit))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {match.confidence > 0 && (
                            <span className="text-sm font-medium text-gray-900">
                              {match.confidence}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() =>
                                handleActionSelect(
                                  globalIdx,
                                  match.type === 'new' ? 'add' : 'update'
                                )
                              }
                              className={`px-3 py-1 rounded text-xs ${
                                selected?.action === 'add' ||
                                selected?.action === 'update'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleActionSelect(globalIdx, 'skip')}
                              className={`px-3 py-1 rounded text-xs ${
                                selected?.action === 'skip'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <XIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() =>
                              setExpandedRow(isExpanded ? null : globalIdx)
                            }
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-4 py-4 bg-gray-50">
                            <div className="grid md:grid-cols-2 gap-4">
                              {match.existingClient && (
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-2">
                                    Cliente Existente
                                  </h4>
                                  <div className="text-sm space-y-1">
                                    <p>
                                      <span className="text-gray-600">CUIT:</span>{' '}
                                      {formatCuit(match.existingClient.cuit)}
                                    </p>
                                    <p>
                                      <span className="text-gray-600">Email:</span>{' '}
                                      {match.existingClient.email}
                                    </p>
                                    <p>
                                      <span className="text-gray-600">Teléfono:</span>{' '}
                                      {match.existingClient.telefono || '-'}
                                    </p>
                                  </div>
                                </div>
                              )}
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">
                                  Datos del Archivo
                                </h4>
                                <div className="text-sm space-y-1">
                                  <p>
                                    <span className="text-gray-600">CUIT:</span>{' '}
                                    {formatCuit(parseInt(match.uploadedClient.cuit))}
                                  </p>
                                  <p>
                                    <span className="text-gray-600">Email:</span>{' '}
                                    {match.uploadedClient.email}
                                  </p>
                                  <p>
                                    <span className="text-gray-600">Teléfono:</span>{' '}
                                    {match.uploadedClient.telefono || '-'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {match.differences && match.differences.length > 0 && (
                              <div className="mt-4">
                                <h4 className="font-semibold text-gray-900 mb-2">
                                  Diferencias Detectadas
                                </h4>
                                <div className="space-y-1">
                                  {match.differences.map((diff, i) => (
                                    <p key={i} className="text-sm text-orange-700">
                                      <span className="font-medium">{diff.field}:</span>{' '}
                                      {diff.existingValue || '(vacío)'} →{' '}
                                      {diff.newValue || '(vacío)'}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleProcessSelected}
              disabled={selectedActions.length === 0 || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Procesar Seleccionados ({selectedActions.length})
                </>
              )}
            </button>
          </div>
        </div>

        {undoStack.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h4 className="font-semibold text-gray-900 mb-4">
              Acciones Recientes (Deshacer)
            </h4>
            <div className="space-y-2">
              {undoStack.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm text-gray-700">
                    {action.action_type === 'add_client'
                      ? `Cliente agregado: ${action.action_data.razon_social}`
                      : action.action_type}
                  </span>
                  <button
                    onClick={() => handleUndo(action.id)}
                    className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 flex items-center gap-2"
                  >
                    <Undo2 className="w-4 h-4" />
                    Deshacer
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderResultsStep = () => {
    if (!processingReport) return null;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="flex items-center gap-4 mb-6">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Resultados del Procesamiento
              </h3>
              <p className="text-gray-600">Resumen de operaciones completadas</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Procesados</p>
              <p className="text-2xl font-bold text-blue-900">
                {processingReport.summary.processed}
              </p>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Insertados</p>
              <p className="text-2xl font-bold text-green-900">
                {processingReport.summary.inserted}
              </p>
            </div>
            <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
              <p className="text-sm text-cyan-600 font-medium">Actualizados</p>
              <p className="text-2xl font-bold text-cyan-900">
                {processingReport.summary.updated}
              </p>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600 font-medium">Omitidos</p>
              <p className="text-2xl font-bold text-gray-900">
                {processingReport.summary.skipped}
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <h4 className="font-semibold text-gray-900">Tiempo de Procesamiento</h4>
            </div>
            <p className="text-sm text-gray-700">
              {processingReport.processingTimeMs / 1000} segundos
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Procesamiento
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-700 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Validación y Actualización de Clientes
            </h2>
            <p className="opacity-90">
              Carga, valida y actualiza la información de clientes desde hojas de cálculo
            </p>
          </div>
          <FileText className="w-12 h-12 opacity-80" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          {(['upload', 'filter', 'match', 'confirm', 'results'] as WorkflowStep[]).map(
            (step, idx) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    currentStep === step
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <span className="font-semibold">{idx + 1}</span>
                  <span className="hidden md:inline">
                    {step === 'upload' && 'Cargar'}
                    {step === 'filter' && 'Filtrar'}
                    {step === 'match' && 'Analizar'}
                    {step === 'confirm' && 'Confirmar'}
                    {step === 'results' && 'Resultados'}
                  </span>
                </div>
                {idx < 4 && (
                  <ChevronRight className="w-5 h-5 text-gray-400 mx-2" />
                )}
              </div>
            )
          )}
        </div>
      </div>

      {currentStep === 'upload' && renderUploadStep()}
      {currentStep === 'filter' && renderFilterStep()}
      {currentStep === 'match' && loading && (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {currentStep === 'confirm' && renderConfirmStep()}
      {currentStep === 'results' && renderResultsStep()}
    </div>
  );
}
