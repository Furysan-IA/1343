import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, UserPlus, Package, ChevronRight, Database } from 'lucide-react';
import { ParsedCertificates, categorizeExtractions } from '../../services/certificateProcessing.service';
import { analyzeCertificateForUpdate, processAllCertificates, updateBatchStats, DualMatchResult } from '../../services/dualTableUpdate.service';
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

  const itemsPerPage = 10;

  useEffect(() => {
    analyzeAllCertificates();
  }, []);

  const analyzeAllCertificates = async () => {
    setIsAnalyzing(true);
    try {
      const results: DualMatchResult[] = [];

      for (const extraction of parsedData.extractions) {
        const analysis = await analyzeCertificateForUpdate(extraction);
        results.push(analysis);
      }

      setAnalyses(results);
      toast.success('Análisis completado');
    } catch (error: any) {
      toast.error(error.message || 'Error al analizar certificados');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProcessAll = async () => {
    setIsProcessing(true);

    try {
      const autoProcessable = analyses.filter(a =>
        a.action !== 'needs_completion' && a.action !== 'skip'
      );

      const stats = await processAllCertificates(autoProcessable);
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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Revisión de Certificados
          </h1>
          <p className="text-slate-600 mb-6">
            Análisis completo de {parsedData.extractions.length} certificados
          </p>

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

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-6 h-6 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Omitir</h3>
              </div>
              <p className="text-3xl font-bold text-slate-700">{stats.skip}</p>
              <p className="text-sm text-slate-600 mt-1">Certificados más antiguos</p>
            </div>

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

          <div className="flex justify-end gap-4 pt-6 border-t">
            <button
              onClick={handleProcessAll}
              disabled={isProcessing}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:bg-slate-400"
            >
              {isProcessing ? 'Procesando...' : 'Procesar Certificados'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
