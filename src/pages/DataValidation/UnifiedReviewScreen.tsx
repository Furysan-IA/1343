import React, { useState, useEffect } from 'react';
import {
  CircleCheck as CheckCircle,
  TriangleAlert as AlertTriangle,
  Users,
  Package,
  RefreshCw,
  Download,
  ShieldCheck
} from 'lucide-react';
import { UnifiedRecord, processUnifiedData } from '../../services/unifiedDataLoad.service';
import { analyzeDetailedChanges, exportChangesReport } from '../../services/detailedChangeAnalysis.service';
import { logPreview, logImportSuccess, logImportError } from '../../services/importAudit.service';
import { DetailedAnalysisResult } from '../../types/changeAnalysis.types';
import { ChangesPreviewPanel } from '../../components/ChangesPreviewPanel';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/Common/LoadingSpinner';

interface UnifiedReviewScreenProps {
  records: UnifiedRecord[];
  batchId: string;
  onComplete: () => void;
}

export const UnifiedReviewScreen: React.FC<UnifiedReviewScreenProps> = ({
  records,
  batchId,
  onComplete
}) => {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<DetailedAnalysisResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const [confirmations, setConfirmations] = useState({
    reviewedNew: false,
    reviewedUpdates: false,
    understoodProtected: false,
    acknowledgedWarnings: false
  });

  useEffect(() => {
    analyzeRecords();
  }, []);

  const analyzeRecords = async () => {
    setLoading(true);
    try {
      console.log('Starting detailed analysis...');
      const result = await analyzeDetailedChanges(records);
      setAnalysis(result);
      console.log('Detailed analysis complete:', result.summary);

      await logPreview(batchId, result);
    } catch (error: any) {
      console.error('Error analyzing records:', error);
      toast.error('Error al analizar registros: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!analysis) return;

    const report = exportChangesReport(analysis);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-cambios-${batchId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Reporte descargado');
  };

  const handleProcess = async () => {
    if (!allConfirmationsChecked()) {
      toast.error('Por favor confirma todas las casillas antes de continuar');
      return;
    }

    setProcessing(true);

    try {
      console.log('Starting unified processing...');
      const result = await processUnifiedData(records, batchId);

      console.log('Processing result:', result);

      if (result.success) {
        await logImportSuccess(batchId, result.productsProcessed, result.clientsProcessed);

        const totalProcessed =
          result.clientsProcessed.inserted +
          result.clientsProcessed.updated +
          result.productsProcessed.inserted +
          result.productsProcessed.updated;

        toast.success(
          `Procesamiento exitoso:\n` +
          `Clientes: ${result.clientsProcessed.inserted} nuevos, ${result.clientsProcessed.updated} actualizados\n` +
          `Productos: ${result.productsProcessed.inserted} nuevos, ${result.productsProcessed.updated} actualizados`,
          { duration: 5000 }
        );

        onComplete();
      } else {
        await logImportError(
          batchId,
          `${result.errors.length} errores durante el procesamiento`,
          { errors: result.errors, partial: result }
        );
        toast.error(`Procesamiento completado con ${result.errors.length} errores`);
        console.error('Processing errors:', result.errors);
      }
    } catch (error: any) {
      console.error('Error processing:', error);
      await logImportError(batchId, error.message);
      toast.error('Error al procesar: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const allConfirmationsChecked = () => {
    if (!analysis) return false;

    const needsNewConfirmation = analysis.summary.productsNew > 0 || analysis.summary.clientsNew > 0;
    const needsUpdateConfirmation = analysis.summary.productsUpdate > 0 || analysis.summary.clientsUpdate > 0;
    const needsWarningConfirmation = analysis.summary.warnings > 0 || analysis.summary.criticalChanges > 0;

    if (needsNewConfirmation && !confirmations.reviewedNew) return false;
    if (needsUpdateConfirmation && !confirmations.reviewedUpdates) return false;
    if (needsUpdateConfirmation && !confirmations.understoodProtected) return false;
    if (needsWarningConfirmation && !confirmations.acknowledgedWarnings) return false;

    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-slate-600">Analizando cambios detallados...</p>
          <p className="mt-2 text-sm text-slate-500">Esto puede tomar un momento</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-slate-700 font-medium">Error al analizar los datos</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { summary } = analysis;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Pre-visualización de Cambios
              </h1>
              <p className="text-slate-600 mt-1">
                Revisa detalladamente qué se modificará antes de aplicar los cambios
              </p>
            </div>
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar Reporte
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
            <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
              <div className="text-2xl font-bold text-slate-800">{records.length}</div>
              <div className="text-xs text-slate-600 mt-1">Total Registros</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <div className="flex items-center gap-1 mb-1">
                <Package className="w-3 h-3 text-green-600" />
                <div className="text-xs font-medium text-green-700">Productos</div>
              </div>
              <div className="text-2xl font-bold text-green-600">{summary.productsNew}</div>
              <div className="text-xs text-green-700">Nuevos</div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
              <div className="flex items-center gap-1 mb-1">
                <Package className="w-3 h-3 text-yellow-600" />
                <div className="text-xs font-medium text-yellow-700">Productos</div>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{summary.productsUpdate}</div>
              <div className="text-xs text-yellow-700">Actualizar</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <div className="flex items-center gap-1 mb-1">
                <Users className="w-3 h-3 text-blue-600" />
                <div className="text-xs font-medium text-blue-700">Clientes</div>
              </div>
              <div className="text-2xl font-bold text-blue-600">{summary.clientsNew}</div>
              <div className="text-xs text-blue-700">Nuevos</div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
              <div className="flex items-center gap-1 mb-1">
                <Users className="w-3 h-3 text-orange-600" />
                <div className="text-xs font-medium text-orange-700">Clientes</div>
              </div>
              <div className="text-2xl font-bold text-orange-600">{summary.clientsUpdate}</div>
              <div className="text-xs text-orange-700">Actualizar</div>
            </div>

            <div className={`rounded-lg p-4 border-2 ${
              summary.criticalChanges > 0
                ? 'bg-red-50 border-red-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle className={`w-3 h-3 ${summary.criticalChanges > 0 ? 'text-red-600' : 'text-slate-600'}`} />
                <div className={`text-xs font-medium ${summary.criticalChanges > 0 ? 'text-red-700' : 'text-slate-600'}`}>
                  Críticos
                </div>
              </div>
              <div className={`text-2xl font-bold ${summary.criticalChanges > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                {summary.criticalChanges}
              </div>
              <div className={`text-xs ${summary.criticalChanges > 0 ? 'text-red-700' : 'text-slate-600'}`}>
                Cambios
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Campos Protegidos</p>
                <p>Los campos protegidos (ID, QR, fechas de creación) nunca se modificarán, incluso si están en el archivo de carga.</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="mt-4 w-full py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            {showDetails ? 'Ocultar Detalles' : 'Ver Cambios Detallados'}
          </button>
        </div>

        {showDetails && (
          <div className="mb-6">
            <ChangesPreviewPanel analysis={analysis} />
          </div>
        )}

        {analysis.globalWarnings.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 mb-2">Advertencias Globales:</p>
                <ul className="text-sm text-red-700 space-y-1">
                  {analysis.globalWarnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Confirmaciones Requeridas</h2>

          <div className="space-y-3">
            {(summary.productsNew > 0 || summary.clientsNew > 0) && (
              <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={confirmations.reviewedNew}
                  onChange={(e) => setConfirmations({ ...confirmations, reviewedNew: e.target.checked })}
                  className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-800">
                    He revisado los registros nuevos
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    {summary.productsNew} productos nuevos y {summary.clientsNew} clientes nuevos se insertarán en la base de datos
                  </div>
                </div>
              </label>
            )}

            {(summary.productsUpdate > 0 || summary.clientsUpdate > 0) && (
              <>
                <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={confirmations.reviewedUpdates}
                    onChange={(e) => setConfirmations({ ...confirmations, reviewedUpdates: e.target.checked })}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">
                      Confirmo las actualizaciones de registros existentes
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {summary.productsUpdate} productos y {summary.clientsUpdate} clientes existentes se actualizarán con {summary.totalFieldChanges} campos modificados
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={confirmations.understoodProtected}
                    onChange={(e) => setConfirmations({ ...confirmations, understoodProtected: e.target.checked })}
                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">
                      Entiendo que los campos protegidos no cambiarán
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      Los campos ID, QR, y fechas de creación permanecerán sin modificar
                    </div>
                  </div>
                </label>
              </>
            )}

            {(summary.warnings > 0 || summary.criticalChanges > 0) && (
              <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={confirmations.acknowledgedWarnings}
                  onChange={(e) => setConfirmations({ ...confirmations, acknowledgedWarnings: e.target.checked })}
                  className="mt-1 w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    He revisado las advertencias y cambios críticos
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    Hay {summary.warnings} advertencias y {summary.criticalChanges} cambios críticos que requieren atención
                  </div>
                </div>
              </label>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">¿Aplicar todos estos cambios?</h3>
              <p className="text-sm text-slate-600">
                Esta acción modificará la base de datos según el análisis mostrado
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                disabled={processing}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcess}
                disabled={processing || !allConfirmationsChecked()}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Aplicando Cambios...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Aplicar Cambios
                  </>
                )}
              </button>
            </div>
          </div>

          {!allConfirmationsChecked() && !processing && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                Por favor confirma todas las casillas anteriores para habilitar el botón de aplicar cambios
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
