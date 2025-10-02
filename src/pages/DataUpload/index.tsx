import React, { useState, useEffect } from 'react';
import { Upload, CircleCheck as CheckCircle, Circle as XCircle, TriangleAlert as AlertTriangle, Clock, Database, FileText, Package, Users, ChevronDown, ChevronUp, Check, X, Play, RotateCcw } from 'lucide-react';
import { useUploadOrchestrator } from '@/hooks/useUploadOrchestrator';
import { supabase } from '@/lib/supabase';
import { ApprovalState } from '@/types/upload.types';
import toast from 'react-hot-toast';

export default function DataUploadPage() {
  const [userId, setUserId] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'validation' | 'approval' | 'processing' | 'completed'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [approvalState, setApprovalState] = useState<ApprovalState>({
    newClients: {},
    updatedClients: {},
    newProducts: {},
    updatedProducts: {}
  });
  const [expandedSections, setExpandedSections] = useState({
    issues: true,
    newClients: true,
    updatedClients: true,
    newProducts: true,
    updatedProducts: true
  });

  const { progress, result, validatedData, validateFile, processFile } = useUploadOrchestrator(userId);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || 'anonymous');
    };
    getUser();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleValidate = async () => {
    if (!file) return;

    setStep('validation');

    try {
      await validateFile(file);
      setStep('approval');
    } catch (error: any) {
      toast.error(`Error al validar: ${error.message}`);
      setStep('upload');
    }
  };

  const handleApprove = async () => {
    if (!file) return;

    const approvedChanges = {
      newClients: Object.keys(approvalState.newClients)
        .filter(k => approvalState.newClients[Number(k)])
        .map(Number),
      updatedClients: Object.keys(approvalState.updatedClients)
        .filter(k => approvalState.updatedClients[Number(k)])
        .map(Number),
      newProducts: Object.keys(approvalState.newProducts)
        .filter(k => approvalState.newProducts[k]),
      updatedProducts: Object.keys(approvalState.updatedProducts)
        .filter(k => approvalState.updatedProducts[k])
    };

    setStep('processing');

    try {
      await processFile(file, approvedChanges);
      setStep('completed');
    } catch (error: any) {
      toast.error(`Error al procesar: ${error.message}`);
      setStep('approval');
    }
  };

  const toggleApproval = (category: keyof ApprovalState, id: number | string) => {
    setApprovalState(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [id]: !prev[category][id]
      }
    }));
  };

  const approveAll = (category: keyof ApprovalState, items: any[]) => {
    const updates: Record<string | number, boolean> = {};
    items.forEach(item => {
      const id = category.includes('Client')
        ? item.cuit || item.existing?.cuit
        : item.codificacion || item.existing?.codificacion;
      updates[id] = true;
    });
    setApprovalState(prev => ({
      ...prev,
      [category]: updates
    }));
  };

  const rejectAll = (category: keyof ApprovalState) => {
    setApprovalState(prev => ({
      ...prev,
      [category]: {}
    }));
  };

  const getApprovedCount = (category: keyof ApprovalState): number => {
    return Object.values(approvalState[category]).filter(Boolean).length;
  };

  const getTotalApproved = (): number => {
    return Object.values(approvalState).reduce((total, category) => {
      return total + Object.values(category).filter(Boolean).length;
    }, 0);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const resetProcess = () => {
    setStep('upload');
    setFile(null);
    setApprovalState({
      newClients: {},
      updatedClients: {},
      newProducts: {},
      updatedProducts: {}
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Sistema de Carga de Certificados
              </h1>
              <p className="text-gray-600">
                Validación, aprobación y carga masiva con trazabilidad completa
              </p>
            </div>
            <Database className="w-16 h-16 text-blue-600" />
          </div>

          <div className="flex items-center justify-between mt-6 relative">
            <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 -z-10" />
            <div
              className="absolute top-5 left-0 h-1 bg-blue-600 -z-10 transition-all duration-500"
              style={{ width: step === 'upload' ? '0%' : step === 'validation' ? '25%' : step === 'approval' ? '50%' : step === 'processing' ? '75%' : '100%' }}
            />

            {['upload', 'validation', 'approval', 'processing', 'completed'].map((s, idx) => (
              <div key={s} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step === s ? 'bg-blue-600 text-white ring-4 ring-blue-200' :
                  ['upload', 'validation', 'approval', 'processing', 'completed'].indexOf(step) > idx ? 'bg-green-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {['upload', 'validation', 'approval', 'processing', 'completed'].indexOf(step) > idx ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className="text-xs mt-2 font-medium text-gray-700 capitalize">
                  {s === 'upload' ? 'Subir' : s === 'validation' ? 'Validar' : s === 'approval' ? 'Aprobar' : s === 'processing' ? 'Procesar' : 'Completado'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {step === 'upload' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Paso 1: Subir Archivo</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="text-lg text-blue-600 hover:text-blue-700 font-medium">
                  Seleccionar archivo Excel
                </span>
              </label>
              <p className="text-gray-500 mt-2">Formatos aceptados: .xlsx, .xls, .csv</p>

              {file && (
                <div className="mt-6 flex items-center justify-center gap-3 bg-green-50 p-4 rounded-lg border border-green-200">
                  <FileText className="w-6 h-6 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-800">{file.name}</div>
                    <div className="text-sm text-gray-600">{(file.size / 1024).toFixed(2)} KB</div>
                  </div>
                </div>
              )}
            </div>

            {file && (
              <button
                onClick={handleValidate}
                className="mt-6 w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Analizar y Validar Datos
              </button>
            )}
          </div>
        )}

        {step === 'validation' && progress && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Paso 2: Validación en Progreso</h2>
            <div className="flex items-center gap-4 mb-4">
              <Clock className="w-8 h-8 text-blue-600 animate-spin" />
              <div className="flex-1">
                <div className="text-lg font-medium text-gray-800">{progress.message}</div>
                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">{progress.progress}%</span>
            </div>
          </div>
        )}

        {step === 'approval' && validatedData && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
                <div className="text-green-700 font-semibold text-sm">Nuevos Clientes</div>
                <div className="text-3xl font-bold text-gray-800">{validatedData.newClients.length}</div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
                <div className="text-blue-700 font-semibold text-sm">Clientes a Actualizar</div>
                <div className="text-3xl font-bold text-gray-800">{validatedData.updatedClients.length}</div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500">
                <div className="text-purple-700 font-semibold text-sm">Nuevos Productos</div>
                <div className="text-3xl font-bold text-gray-800">{validatedData.newProducts.length}</div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-orange-500">
                <div className="text-orange-700 font-semibold text-sm">Productos a Actualizar</div>
                <div className="text-3xl font-bold text-gray-800">{validatedData.updatedProducts.length}</div>
              </div>
            </div>

            {validatedData.issues.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 border-b"
                  onClick={() => toggleSection('issues')}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Información y Advertencias</h3>
                    <span className="px-3 py-1 bg-blue-100 rounded-full text-sm font-medium text-blue-700">
                      {validatedData.issues.length}
                    </span>
                  </div>
                  {expandedSections.issues ? <ChevronUp className="text-gray-600" /> : <ChevronDown className="text-gray-600" />}
                </div>
                {expandedSections.issues && (
                  <div className="p-4">
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>ℹ️ Estas son advertencias informativas.</strong> Los registros se pueden procesar normalmente.
                        Revisa la información y aprúeba los cambios en las secciones de abajo.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {validatedData.issues.map((issue, idx) => {
                        const isError = issue.severity === 'error';
                        const isWarning = issue.severity === 'warning';
                        const bgColor = isError ? 'bg-red-50 border-red-200' : isWarning ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200';
                        const iconColor = isError ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-blue-600';
                        const textColor = isError ? 'text-red-700' : 'text-gray-700';

                        return (
                          <div key={idx} className={`flex items-start gap-2 p-3 rounded-lg border ${bgColor}`}>
                            {isError ? (
                              <XCircle className={`w-5 h-5 ${iconColor} mt-0.5 flex-shrink-0`} />
                            ) : (
                              <AlertTriangle className={`w-5 h-5 ${iconColor} mt-0.5 flex-shrink-0`} />
                            )}
                            <div className="flex-1">
                              <span className={`text-sm ${textColor}`}>{issue.message}</span>
                              {isError && (
                                <div className="text-xs text-red-600 mt-1 font-medium">❌ Este error bloquea el procesamiento</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {validatedData.newClients.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 border-b text-green-700"
                  onClick={() => toggleSection('newClients')}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6" />
                    <h3 className="text-lg font-semibold">Nuevos Clientes</h3>
                    <span className="px-3 py-1 bg-green-100 rounded-full text-sm font-medium">
                      {validatedData.newClients.length}
                    </span>
                  </div>
                  {expandedSections.newClients ? <ChevronUp /> : <ChevronDown />}
                </div>
                {expandedSections.newClients && (
                  <div className="p-4">
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => approveAll('newClients', validatedData.newClients)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                      >
                        Aprobar Todos
                      </button>
                      <button
                        onClick={() => rejectAll('newClients')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                      >
                        Rechazar Todos
                      </button>
                      <span className="ml-auto text-sm text-gray-600 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {getApprovedCount('newClients')} de {validatedData.newClients.length} aprobados
                      </span>
                    </div>

                    <div className="space-y-3">
                      {validatedData.newClients.map((client) => (
                        <div
                          key={client.cuit}
                          className={`border rounded-lg p-4 transition-all ${
                            approvalState.newClients[client.cuit]
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800">{client.razon_social}</div>
                              <div className="text-sm text-gray-600 mt-1">CUIT: {client.cuit}</div>
                              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Email:</span>{' '}
                                  <span className={client.email === 'No encontrado' ? 'text-red-600 font-medium' : ''}>
                                    {client.email}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Teléfono:</span> {client.telefono || 'N/A'}
                                </div>
                                <div className="col-span-2">
                                  <span className="text-gray-500">Dirección:</span>{' '}
                                  <span className={client.direccion === 'No encontrado' ? 'text-red-600 font-medium' : ''}>
                                    {client.direccion}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleApproval('newClients', client.cuit)}
                              className={`ml-4 p-2 rounded-lg transition-colors ${
                                approvalState.newClients[client.cuit]
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              {approvalState.newClients[client.cuit] ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {validatedData.newProducts.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 border-b text-purple-700"
                  onClick={() => toggleSection('newProducts')}
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6" />
                    <h3 className="text-lg font-semibold">Nuevos Productos</h3>
                    <span className="px-3 py-1 bg-purple-100 rounded-full text-sm font-medium">
                      {validatedData.newProducts.length}
                    </span>
                  </div>
                  {expandedSections.newProducts ? <ChevronUp /> : <ChevronDown />}
                </div>
                {expandedSections.newProducts && (
                  <div className="p-4">
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => approveAll('newProducts', validatedData.newProducts)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                      >
                        Aprobar Todos
                      </button>
                      <button
                        onClick={() => rejectAll('newProducts')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                      >
                        Rechazar Todos
                      </button>
                      <span className="ml-auto text-sm text-gray-600 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {getApprovedCount('newProducts')} de {validatedData.newProducts.length} aprobados
                      </span>
                    </div>

                    <div className="space-y-3">
                      {validatedData.newProducts.map((product) => (
                        <div
                          key={product.codificacion}
                          className={`border rounded-lg p-4 transition-all ${
                            approvalState.newProducts[product.codificacion]
                              ? 'border-purple-300 bg-purple-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800">{product.producto}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {product.marca} - {product.modelo} | {product.codificacion}
                              </div>
                              <div className="flex gap-4 mt-2 text-sm">
                                <span className="text-gray-500">Estado: <span className="font-medium">{product.estado}</span></span>
                                <span className="text-gray-500">CUIT: {product.cuit}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleApproval('newProducts', product.codificacion)}
                              className={`ml-4 p-2 rounded-lg transition-colors ${
                                approvalState.newProducts[product.codificacion]
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              {approvalState.newProducts[product.codificacion] ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Resumen Final</h3>
                  <p className="text-gray-600">
                    <span className="font-bold text-blue-600">{getTotalApproved()}</span> cambios aprobados para aplicar
                  </p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={resetProcess}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={getTotalApproved() === 0}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Aplicar Cambios ({getTotalApproved()})
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 'processing' && progress && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Paso 4: Aplicando Cambios</h2>
            <div className="flex items-center gap-4 mb-6">
              <Clock className="w-10 h-10 text-blue-600 animate-spin" />
              <div className="flex-1">
                <div className="text-xl font-medium text-gray-800 mb-2">{progress.message}</div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
              <span className="text-3xl font-bold text-blue-600">{progress.progress}%</span>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Database className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <div className="font-semibold mb-1">Proceso de seguridad activo</div>
                  <div>✓ Backup automático creado antes de aplicar cambios</div>
                  <div>✓ Todas las operaciones se registran en audit log</div>
                  <div>✓ Sistema de rollback disponible</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'completed' && result && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Proceso Completado</h2>
              <p className="text-gray-600 mb-8 text-lg">
                Todos los cambios han sido aplicados exitosamente a la base de datos
              </p>

              <div className="grid grid-cols-3 gap-6 mb-8 max-w-3xl mx-auto">
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {result.stats.newClients + result.stats.newProducts}
                  </div>
                  <div className="text-sm text-gray-600">Nuevos Registros</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {result.stats.updatedClients + result.stats.updatedProducts}
                  </div>
                  <div className="text-sm text-gray-600">Actualizados</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                  <div className="text-4xl font-bold text-purple-600 mb-2">1</div>
                  <div className="text-sm text-gray-600">Backup Creado</div>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={resetProcess}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Procesar Otro Archivo
                </button>
              </div>

              <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200 max-w-2xl mx-auto">
                <div className="text-sm text-gray-700 text-left space-y-1">
                  <div className="font-semibold text-gray-800 mb-2">Detalles del proceso:</div>
                  <div>• Batch ID: {result.batchId}</div>
                  {result.backupSnapshotId && <div>• Backup ID: {result.backupSnapshotId}</div>}
                  <div>• Tiempo de procesamiento: {(result.processingTimeMs / 1000).toFixed(2)} segundos</div>
                  <div>• Todas las operaciones registradas en audit log</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
