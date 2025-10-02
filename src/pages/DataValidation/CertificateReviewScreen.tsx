import React, { useState, useEffect } from 'react';
import { CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, UserPlus, Package, ChevronRight, Database, History, FileText } from 'lucide-react';
import { ParsedCertificates, categorizeExtractions } from '../../services/certificateProcessing.service';
import { analyzeCertificateForUpdate, processAllCertificates, updateBatchStats, DualMatchResult } from '../../services/dualTableUpdate.service';
import { BackupHistory } from '../../components/BackupHistory';
import { CertificateSkipReport } from '../../components/CertificateSkipReport';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface CertificateReviewScreenProps {
  parsedData: ParsedCertificates;
  batchId: string;
  referenceDate: Date;
  onComplete: () => void;
}

export const CertificateReviewScreen: React.FC<CertificateReviewScreenProps> = ({
  parsedData,
  batchId,
  referenceDate,
  onComplete
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analyses, setAnalyses] = useState<DualMatchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNewClients, setShowNewClients] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBackupHistory, setShowBackupHistory] = useState(false);
  const [showSkipReport, setShowSkipReport] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createBackup, setCreateBackup] = useState(true);

  const itemsPerPage = 10;

  useEffect(() => {
    analyzeAllCertificates();
  }, []);

  const analyzeAllCertificates = async () => {
    setIsAnalyzing(true);
    try {
      if (!parsedData || !parsedData.extractions || parsedData.extractions.length === 0) {
        throw new Error('No hay certificados para analizar');
      }

      const results: DualMatchResult[] = [];

      for (const extraction of parsedData.extractions) {
        try {
          const analysis = await analyzeCertificateForUpdate(extraction);
          results.push(analysis);
        } catch (err: any) {
          console.error('Error analyzing extraction:', err);
        }
      }

      if (results.length === 0) {
        throw new Error('No se pudo analizar ningún certificado');
      }

      setAnalyses(results);
      toast.success(`Análisis completado: ${results.length} certificados`);
    } catch (error: any) {
      console.error('Error in analyzeAllCertificates:', error);
      toast.error(error.message || 'Error al analizar certificados');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShowConfirmation = () => {
    setShowConfirmation(true);
  };

  const handleCancelProcessing = () => {
    setShowConfirmation(false);
  };

  const handleProcessAll = async () => {
    setIsProcessing(true);

    try {
      const autoProcessable = analyses.filter(a =>
        a.action !== 'needs_completion' && a.action !== 'skip'
      );

      const stats = await processAllCertificates(
        autoProcessable,
        batchId,
        parsedData.metadata.filename,
        createBackup
      );
      await updateBatchStats(batchId, stats);

      toast.success(
        `Procesamiento completo: ${stats.clientsInserted + stats.clientsUpdated} clientes, ${stats.productsInserted + stats.productsUpdated} productos`
      );

      onComplete();
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar certificados');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Analizando certificados...</p>
          <p className="text-slate-500 text-sm mt-2">Verificando en tablas de clientes y productos</p>
        </div>
      </div>
    );
  }

  const stats = {
    insertBoth: analyses.filter(a => a.action === 'insert_both').length,
    updateBoth: analyses.filter(a => a.action === 'update_both').length,
    insertClientUpdateProduct: analyses.filter(a => a.action === 'insert_client_update_product').length,
    updateClientInsertProduct: analyses.filter(a => a.action === 'update_client_insert_product').length,
    needsCompletion: analyses.filter(a => a.action === 'needs_completion').length,
    skip: analyses.filter(a => a.action === 'skip').length
  };

  const newClients = analyses.filter(a => a.isNewClient);
  const totalPages = Math.ceil(newClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPageClients = newClients.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                Revisión de Certificados
              </h1>
              <p className="text-slate-600">
                Análisis completo de {parsedData.extractions.length} certificados
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSkipReport(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Ver Reporte Detallado
              </button>
              <button
                onClick={() => setShowBackupHistory(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                Ver Backups
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Database className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold text-green-900">Insertar Ambos</h3>
              </div>
              <p className="text-3xl font-bold text-green-700">{stats.insertBoth}</p>
              <p className="text-sm text-green-600 mt-1">Nuevos clientes y productos</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Actualizar Ambos</h3>
              </div>
              <p className="text-3xl font-bold text-blue-700">{stats.updateBoth}</p>
              <p className="text-sm text-blue-600 mt-1">Más recientes que los existentes</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <UserPlus className="w-6 h-6 text-purple-600" />
                <h3 className="font-semibold text-purple-900">Mixtos</h3>
              </div>
              <p className="text-3xl font-bold text-purple-700">
                {stats.insertClientUpdateProduct + stats.updateClientInsertProduct}
              </p>
              <p className="text-sm text-purple-600 mt-1">Insertar uno, actualizar otro</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <h3 className="font-semibold text-amber-900">Necesitan Completar</h3>
              </div>
              <p className="text-3xl font-bold text-amber-700">{stats.needsCompletion}</p>
              <p className="text-sm text-amber-600 mt-1">Clientes nuevos incompletos</p>
            </div>

            <button
              onClick={() => setShowSkipReport(true)}
              className="bg-slate-50 border border-slate-200 rounded-lg p-6 hover:bg-slate-100 transition-colors text-left w-full"
            >
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-6 h-6 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Omitir</h3>
              </div>
              <p className="text-3xl font-bold text-slate-700">{stats.skip}</p>
              <p className="text-sm text-slate-600 mt-1">Certificados más antiguos</p>
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Click para ver detalles
              </p>
            </button>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg p-6">
              <h3 className="font-semibold mb-2">Total a Procesar</h3>
              <p className="text-4xl font-bold">
                {stats.insertBoth + stats.updateBoth + stats.insertClientUpdateProduct + stats.updateClientInsertProduct}
              </p>
              <p className="text-sm text-blue-100 mt-1">Certificados válidos</p>
            </div>
          </div>

          {newClients.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-amber-600" />
                  <div>
                    <h3 className="font-semibold text-amber-900">
                      Clientes Nuevos Detectados ({newClients.length})
                    </h3>
                    <p className="text-sm text-amber-700">
                      Estos clientes no existen en la base de datos. Algunos pueden necesitar completar información.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewClients(!showNewClients)}
                  className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                >
                  {showNewClients ? 'Ocultar' : 'Ver'} Lista
                </button>
              </div>

              {showNewClients && (
                <>
                  <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
                    <table className="w-full">
                      <thead className="bg-amber-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-amber-900">
                            CUIT
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-amber-900">
                            Razón Social
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-amber-900">
                            Estado
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-amber-900">
                            Campos Faltantes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {currentPageClients.map((analysis, index) => (
                          <tr key={index} className="hover:bg-amber-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-900">
                              {analysis.extraction.clientData?.cuit || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900">
                              {analysis.extraction.clientData?.razon_social || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {analysis.action === 'needs_completion' ? (
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                  Necesita completar
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                  Completo
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {analysis.missingClientData.length > 0
                                ? analysis.missingClientData.join(', ')
                                : 'Ninguno'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-amber-700">
                        Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, newClients.length)} de {newClients.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 border border-amber-300 rounded hover:bg-amber-100 disabled:opacity-50 text-sm"
                        >
                          Anterior
                        </button>
                        <span className="text-sm text-amber-700">
                          Página {currentPage} de {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 border border-amber-300 rounded hover:bg-amber-100 disabled:opacity-50 text-sm"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3">¿Qué va a suceder?</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>{stats.insertBoth}</strong> certificados insertarán nuevos clientes y productos
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>{stats.updateBoth}</strong> certificados actualizarán clientes y productos existentes
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>{stats.insertClientUpdateProduct + stats.updateClientInsertProduct}</strong> certificados tendrán operaciones mixtas
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                <span>
                  <strong>{stats.needsCompletion}</strong> clientes nuevos necesitarán que completes su información manualmente después
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Package className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-600" />
                <span>
                  <strong>{stats.skip}</strong> certificados se omitirán (fecha de emisión más antigua)
                </span>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-6 border-t">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={createBackup}
                onChange={(e) => setCreateBackup(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-slate-700 font-medium">
                  Crear backup antes de procesar
                </span>
                <p className="text-sm text-slate-500">
                  Podrás restaurar los datos si algo sale mal
                </p>
              </div>
            </label>

            <button
              onClick={handleShowConfirmation}
              disabled={isProcessing}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:bg-slate-400"
            >
              Revisar y Confirmar
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <BackupHistory
        isOpen={showBackupHistory}
        onClose={() => setShowBackupHistory(false)}
      />

      <CertificateSkipReport
        isOpen={showSkipReport}
        onClose={() => setShowSkipReport(false)}
        batchId={batchId}
        filename={parsedData.metadata.filename}
        totalInFile={parsedData.metadata.totalRecords + parsedData.metadata.totalRejected}
      />

      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <h2 className="text-2xl font-bold mb-2">Confirmar Procesamiento de Certificados</h2>
              <p className="text-blue-100">Revisa cuidadosamente las acciones que se realizarán</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-2">¡Importante! Lee antes de continuar</h3>
                    <p className="text-sm text-amber-800 mb-2">
                      Estás a punto de procesar <strong>{analyses.length}</strong> certificados.
                      Esta acción modificará tu base de datos según el análisis siguiente:
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-900">Registros que se INSERTARÁN</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-green-700">Nuevos clientes y productos:</p>
                      <p className="text-2xl font-bold text-green-900">{stats.insertBoth}</p>
                    </div>
                    <div>
                      <p className="text-green-700">Operaciones mixtas:</p>
                      <p className="text-2xl font-bold text-green-900">
                        {stats.insertClientUpdateProduct + stats.updateClientInsertProduct}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">Registros que se ACTUALIZARÁN</h4>
                  </div>
                  <div className="text-sm">
                    <p className="text-blue-700 mb-1">Clientes y productos existentes:</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.updateBoth}</p>
                    <p className="text-xs text-blue-600 mt-2">
                      Solo se actualizarán si el certificado es más reciente que el registro existente
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border-l-4 border-slate-400 p-4 rounded-r-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="w-5 h-5 text-slate-600" />
                    <h4 className="font-semibold text-slate-900">Certificados que se OMITIRÁN</h4>
                  </div>
                  <div className="text-sm">
                    <p className="text-slate-700 mb-1">Ya existen registros más recientes:</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.skip}</p>
                    <button
                      onClick={() => {
                        setShowConfirmation(false);
                        setShowSkipReport(true);
                      }}
                      className="text-xs text-amber-600 hover:text-amber-700 underline mt-2"
                    >
                      Ver detalles de certificados omitidos
                    </button>
                  </div>
                </div>

                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <h4 className="font-semibold text-amber-900">Clientes que NECESITAN COMPLETAR información</h4>
                  </div>
                  <div className="text-sm">
                    <p className="text-amber-700 mb-1">Se marcarán para completar manualmente después:</p>
                    <p className="text-2xl font-bold text-amber-900">{stats.needsCompletion}</p>
                    <p className="text-xs text-amber-600 mt-2">
                      Estos clientes NO se insertarán automáticamente. Deberás completar su información en Gestión de Clientes
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Resumen Total</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Se procesarán automáticamente:</span>
                    <span className="font-bold text-blue-900">
                      {stats.insertBoth + stats.updateBoth + stats.insertClientUpdateProduct + stats.updateClientInsertProduct}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Se omitirán:</span>
                    <span className="font-bold text-blue-900">{stats.skip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Necesitan completar:</span>
                    <span className="font-bold text-blue-900">{stats.needsCompletion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Total analizado:</span>
                    <span className="font-bold text-blue-900">{analyses.length}</span>
                  </div>
                </div>
              </div>

              {createBackup && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800">
                      <strong>Backup activado:</strong> Se creará un respaldo antes de procesar. Podrás restaurar si es necesario.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-6 border-t flex items-center justify-between gap-4">
              <button
                onClick={handleCancelProcessing}
                disabled={isProcessing}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={createBackup}
                    onChange={(e) => setCreateBackup(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">Crear backup</span>
                </label>

                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    handleProcessAll();
                  }}
                  disabled={isProcessing}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:bg-slate-400"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      Sí, Procesar Certificados
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
