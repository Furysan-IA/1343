import React, { useState } from 'react';
import { CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Package, ChevronRight, Database } from 'lucide-react';
import { DualMatchResult, processAllCertificates, updateBatchStats } from '../../services/dualTableUpdate.service';
import toast from 'react-hot-toast';

interface ConfirmationScreenProps {
  analyses: DualMatchResult[];
  batchId: string;
  filename: string;
  onCancel: () => void;
  onComplete: () => void;
  onViewSkippedReport: () => void;
}

export const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({
  analyses,
  batchId,
  filename,
  onCancel,
  onComplete,
  onViewSkippedReport
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [createBackup, setCreateBackup] = useState(true);

  const stats = {
    insertBoth: analyses.filter(a => a.action === 'insert_both').length,
    updateBoth: analyses.filter(a => a.action === 'update_both').length,
    insertClientUpdateProduct: analyses.filter(a => a.action === 'insert_client_update_product').length,
    updateClientInsertProduct: analyses.filter(a => a.action === 'update_client_insert_product').length,
    skip: analyses.filter(a => a.action === 'skip').length,
    needsCompletion: analyses.filter(a => a.action === 'needs_completion').length
  };

  const handleConfirmProcessing = async () => {
    setIsProcessing(true);

    try {
      const autoProcessable = analyses.filter(a =>
        a.action !== 'needs_completion' && a.action !== 'skip'
      );

      const processStats = await processAllCertificates(
        autoProcessable,
        batchId,
        filename,
        createBackup
      );
      await updateBatchStats(batchId, processStats);

      toast.success(
        `Procesamiento completo: ${processStats.clientsInserted + processStats.clientsUpdated} clientes, ${processStats.productsInserted + processStats.productsUpdated} productos`
      );

      onComplete();
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar certificados');
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Procesando certificados...</p>
          <p className="text-slate-500 text-sm mt-2">Actualizando base de datos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <h2 className="text-2xl font-bold mb-2">Confirmar Procesamiento de Certificados</h2>
          <p className="text-blue-100">Revisa cuidadosamente las acciones que se realizarán</p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
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
                  onClick={onViewSkippedReport}
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
            onClick={onCancel}
            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
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
              onClick={handleConfirmProcessing}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              Sí, Procesar Certificados
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
