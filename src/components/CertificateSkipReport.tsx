import React, { useState, useEffect } from 'react';
import { X, Download, TriangleAlert as AlertTriangle, FileX, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { DiagnosticReport, generateDiagnosticReport, exportDiagnosticToExcel } from '../services/certificateDiagnostics.service';
import toast from 'react-hot-toast';

interface CertificateSkipReportProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  filename: string;
  totalInFile: number;
}

export const CertificateSkipReport: React.FC<CertificateSkipReportProps> = ({
  isOpen,
  onClose,
  batchId,
  filename,
  totalInFile
}) => {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set());
  const [showRejected, setShowRejected] = useState(true);
  const [showSkipped, setShowSkipped] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen, batchId]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const diagnosticReport = await generateDiagnosticReport(batchId, filename, totalInFile);
      setReport(diagnosticReport);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar el reporte');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!report) return;
    try {
      exportDiagnosticToExcel(report);
      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      toast.error('Error al exportar reporte');
    }
  };

  const toggleReason = (reason: string) => {
    const newExpanded = new Set(expandedReasons);
    if (newExpanded.has(reason)) {
      newExpanded.delete(reason);
    } else {
      newExpanded.add(reason);
    }
    setExpandedReasons(newExpanded);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Reporte de Certificados No Actualizados</h2>
            <p className="text-amber-100 text-sm mt-1">Análisis detallado de certificados omitidos y rechazados</p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-amber-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Generando reporte...</p>
            </div>
          </div>
        ) : report ? (
          <>
            <div className="p-6 border-b bg-slate-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">Total en Archivo</p>
                  <p className="text-2xl font-bold text-slate-900">{report.totalInFile}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-green-700 mb-1">Procesados</p>
                  <p className="text-2xl font-bold text-green-800">{report.totalProcessed}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <p className="text-sm text-amber-700 mb-1">Omitidos</p>
                  <p className="text-2xl font-bold text-amber-800">{report.totalSkipped}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="text-sm text-red-700 mb-1">Rechazados</p>
                  <p className="text-2xl font-bold text-red-800">{report.totalRejected}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por CUIT, codificación o razón social..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar Excel
                </button>
              </div>

              <div className="flex items-center gap-4 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSkipped}
                    onChange={(e) => setShowSkipped(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-slate-700">Mostrar omitidos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRejected}
                    onChange={(e) => setShowRejected(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-700">Mostrar rechazados</span>
                </label>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {showSkipped && report.skippedByReason.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      Certificados Omitidos ({report.totalSkipped})
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {report.skippedByReason.map((group, index) => {
                      const isExpanded = expandedReasons.has(group.reason);
                      const filteredCerts = searchTerm
                        ? group.certificates.filter(cert =>
                            cert.cuit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            cert.codificacion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            cert.razon_social?.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                        : group.certificates;

                      if (filteredCerts.length === 0 && searchTerm) return null;

                      return (
                        <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleReason(group.reason)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 bg-amber-600 text-white rounded-full text-sm font-medium">
                                {group.count}
                              </span>
                              <span className="text-sm font-medium text-amber-900">{group.reason}</span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-amber-600" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-amber-600" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="border-t border-amber-200 bg-white">
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-amber-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-amber-900">Fila</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-amber-900">CUIT</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-amber-900">Codificación</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-amber-900">Razón Social</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-amber-900">Fecha Certificado</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-amber-900">Fecha Existente</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-amber-100">
                                    {filteredCerts.map((cert, certIndex) => (
                                      <tr key={certIndex} className="hover:bg-amber-50">
                                        <td className="px-4 py-2 text-sm text-slate-900">{cert.row_number || 'N/A'}</td>
                                        <td className="px-4 py-2 text-sm text-slate-900">{cert.cuit || 'N/A'}</td>
                                        <td className="px-4 py-2 text-sm text-slate-900">{cert.codificacion || 'N/A'}</td>
                                        <td className="px-4 py-2 text-sm text-slate-900">{cert.razon_social || 'N/A'}</td>
                                        <td className="px-4 py-2 text-sm text-slate-900">
                                          {cert.certificate_date
                                            ? new Date(cert.certificate_date).toLocaleDateString('es-AR')
                                            : 'N/A'}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-900">
                                          {cert.existing_date
                                            ? new Date(cert.existing_date).toLocaleDateString('es-AR')
                                            : 'N/A'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {showRejected && report.rejectedRecords.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <FileX className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-slate-900">
                      Registros Rechazados ({report.totalRejected})
                    </h3>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-red-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-red-900">Fila</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-red-900">Razón</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-red-900">Campos Faltantes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100 bg-white">
                          {report.rejectedRecords
                            .filter(record =>
                              !searchTerm ||
                              record.reason.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map((record, index) => (
                              <tr key={index} className="hover:bg-red-50">
                                <td className="px-4 py-3 text-sm text-slate-900">{record.rowNumber}</td>
                                <td className="px-4 py-3 text-sm text-slate-900">{record.reason}</td>
                                <td className="px-4 py-3 text-sm text-slate-900">
                                  {record.missingFields?.join(', ') || 'N/A'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {report.totalSkipped === 0 && report.totalRejected === 0 && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <AlertTriangle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    ¡Todo se procesó correctamente!
                  </h3>
                  <p className="text-slate-600">
                    No hay certificados omitidos ni rechazados
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-slate-600">No se pudo cargar el reporte</p>
          </div>
        )}
      </div>
    </div>
  );
};
