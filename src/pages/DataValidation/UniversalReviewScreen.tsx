import React, { useState, useEffect } from 'react';
import { CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Users, Package, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import {
  ParsedData,
  detectDuplicates,
  insertClientsAndProducts,
  updateBatchStatus,
  UniversalRecord,
  ClientMatch,
  ProductMatch
} from '../../services/universalDataValidation.service';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/Common/LoadingSpinner';

interface UniversalReviewScreenProps {
  parsedData: ParsedData;
  batchId: string;
  onComplete: () => void;
}

export const UniversalReviewScreen: React.FC<UniversalReviewScreenProps> = ({
  parsedData,
  batchId,
  onComplete
}) => {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [clientMatches, setClientMatches] = useState<ClientMatch[]>([]);
  const [productMatches, setProductMatches] = useState<ProductMatch[]>([]);
  const [newClients, setNewClients] = useState<UniversalRecord[]>([]);
  const [newProducts, setNewProducts] = useState<UniversalRecord[]>([]);

  const [insertNewClients, setInsertNewClients] = useState(true);
  const [updateExistingClients, setUpdateExistingClients] = useState(true);
  const [insertNewProducts, setInsertNewProducts] = useState(true);

  const [expandedClientChanges, setExpandedClientChanges] = useState(false);
  const [expandedProductChanges, setExpandedProductChanges] = useState(false);

  useEffect(() => {
    analyzeData();
  }, []);

  const analyzeData = async () => {
    try {
      console.log('Analyzing data for duplicates...');

      const result = await detectDuplicates(parsedData.rows);

      console.log('Analysis complete:', {
        clientMatches: result.clientMatches.length,
        productMatches: result.productMatches.length,
        newClients: result.newClients.length,
        newProducts: result.newProducts.length
      });

      setClientMatches(result.clientMatches);
      setProductMatches(result.productMatches);
      setNewClients(result.newClients);
      setNewProducts(result.newProducts);
      setLoading(false);
    } catch (error: any) {
      console.error('Error analyzing data:', error);
      toast.error('Error al analizar datos: ' + error.message);
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!insertNewClients && !updateExistingClients && !insertNewProducts) {
      toast.error('Debes seleccionar al menos una acción para procesar');
      return;
    }

    setProcessing(true);

    try {
      const clientsToProcess = insertNewClients ? newClients : [];
      const productsToProcess = insertNewProducts ? newProducts : [];

      console.log('Processing data...', {
        newClients: clientsToProcess.length,
        newProducts: productsToProcess.length,
        updateExisting: updateExistingClients
      });

      if (clientsToProcess.length === 0 && productsToProcess.length === 0 && !updateExistingClients) {
        toast.error('No hay datos para procesar con las opciones seleccionadas');
        setProcessing(false);
        return;
      }

      const result = await insertClientsAndProducts(
        clientsToProcess,
        productsToProcess,
        batchId,
        updateExistingClients
      );

      console.log('Processing result:', result);

      await updateBatchStatus(batchId, {
        status: result.success ? 'completed' : 'failed',
        processed_records: result.clientsInserted + result.clientsUpdated + result.productsInserted,
        new_records: result.clientsInserted + result.productsInserted,
        updated_records: result.clientsUpdated,
        error_count: result.errors.length
      });

      if (result.success) {
        const messages = [];
        if (result.clientsInserted > 0) messages.push(`${result.clientsInserted} clientes nuevos`);
        if (result.clientsUpdated > 0) messages.push(`${result.clientsUpdated} clientes actualizados`);
        if (result.productsInserted > 0) messages.push(`${result.productsInserted} productos nuevos`);

        toast.success(`Procesado: ${messages.join(', ')}`);
        onComplete();
      } else {
        toast.error(`Procesamiento completado con ${result.errors.length} errores`);
        console.error('Processing errors:', result.errors);
      }
    } catch (error: any) {
      console.error('Error processing records:', error);
      toast.error('Error al procesar: ' + error.message);

      await updateBatchStatus(batchId, {
        status: 'failed',
        error_count: 1
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-slate-600">Analizando datos...</p>
        </div>
      </div>
    );
  }

  const clientsWithChanges = clientMatches.filter(m => m.hasChanges);
  const clientsWithoutChanges = clientMatches.filter(m => !m.hasChanges);
  const productsWithChanges = productMatches.filter(m => m.hasChanges);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-4">
            Revisar Datos Antes de Procesar
          </h1>
          <p className="text-slate-600 mb-6">
            {parsedData.metadata.filename} - {parsedData.rows.length} registros totales
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Clientes Nuevos</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">{newClients.length}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Productos Nuevos</span>
              </div>
              <div className="text-2xl font-bold text-green-900">{newProducts.length}</div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">Clientes Existentes</span>
              </div>
              <div className="text-2xl font-bold text-yellow-900">{clientMatches.length}</div>
              {clientsWithChanges.length > 0 && (
                <p className="text-xs text-yellow-600 mt-1">{clientsWithChanges.length} con cambios</p>
              )}
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Productos Existentes</span>
              </div>
              <div className="text-2xl font-bold text-orange-900">{productMatches.length}</div>
              <p className="text-xs text-orange-600 mt-1">Se omitirán</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-6 border-2 border-slate-200 mb-6">
            <h3 className="font-semibold text-slate-800 mb-4 text-lg">
              Selecciona qué deseas procesar:
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={insertNewClients}
                  onChange={(e) => setInsertNewClients(e.target.checked)}
                  disabled={newClients.length === 0}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <span className="font-medium text-slate-800">
                    Insertar {newClients.length} clientes nuevos
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={updateExistingClients}
                  onChange={(e) => setUpdateExistingClients(e.target.checked)}
                  disabled={clientMatches.length === 0}
                  className="w-5 h-5 text-yellow-600 rounded"
                />
                <div className="flex-1">
                  <span className="font-medium text-slate-800">
                    Actualizar {clientMatches.length} clientes existentes
                  </span>
                  {clientsWithChanges.length > 0 && (
                    <span className="text-sm text-yellow-600 ml-2">
                      ({clientsWithChanges.length} con cambios)
                    </span>
                  )}
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={insertNewProducts}
                  onChange={(e) => setInsertNewProducts(e.target.checked)}
                  disabled={newProducts.length === 0}
                  className="w-5 h-5 text-green-600 rounded"
                />
                <div className="flex-1">
                  <span className="font-medium text-slate-800">
                    Insertar {newProducts.length} productos nuevos
                  </span>
                </div>
              </label>

              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-slate-800">
                      Productos existentes ({productMatches.length}) se omiten
                    </span>
                    <p className="text-sm text-orange-700 mt-1">
                      Para preservar QR y enlaces
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {clientsWithChanges.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setExpandedClientChanges(!expandedClientChanges)}
                className="w-full flex items-center justify-between p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg hover:bg-yellow-100"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div className="text-left">
                    <h3 className="font-semibold text-yellow-900">
                      {clientsWithChanges.length} Clientes con Cambios Detectados
                    </h3>
                    <p className="text-sm text-yellow-700">
                      Click para ver detalles
                    </p>
                  </div>
                </div>
                {expandedClientChanges ? (
                  <ChevronUp className="w-5 h-5 text-yellow-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-yellow-600" />
                )}
              </button>

              {expandedClientChanges && (
                <div className="mt-2 bg-yellow-50 rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                  {clientsWithChanges.map((match, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-4">
                      <div className="font-medium text-slate-800 mb-3">
                        CUIT: {match.cuit} - {match.existing.razon_social}
                      </div>
                      <div className="space-y-2">
                        {match.changes.map((change, cIdx) => (
                          <div key={cIdx} className="text-sm">
                            <span className="font-medium text-slate-600">{change.field}:</span>
                            <div className="line-through text-red-600">
                              {String(change.oldValue || '(vacío)')}
                            </div>
                            <div className="text-green-600 font-medium">
                              → {String(change.newValue)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {productsWithChanges.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setExpandedProductChanges(!expandedProductChanges)}
                className="w-full flex items-center justify-between p-4 bg-orange-50 border-2 border-orange-300 rounded-lg hover:bg-orange-100"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <div className="text-left">
                    <h3 className="font-semibold text-orange-900">
                      {productsWithChanges.length} Productos con Diferencias
                    </h3>
                    <p className="text-sm text-orange-700">
                      NO se actualizarán
                    </p>
                  </div>
                </div>
                {expandedProductChanges ? (
                  <ChevronUp className="w-5 h-5 text-orange-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-orange-600" />
                )}
              </button>

              {expandedProductChanges && (
                <div className="mt-2 bg-orange-50 rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                  {productsWithChanges.slice(0, 10).map((match, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-4">
                      <div className="font-medium text-slate-800 mb-3">
                        {match.codificacion} - {match.existing.producto}
                      </div>
                      <div className="space-y-2">
                        {match.changes.map((change, cIdx) => (
                          <div key={cIdx} className="text-sm">
                            <span className="font-medium text-slate-600">{change.field}:</span>
                            <div className="text-slate-600">
                              BD: {String(change.oldValue || '(vacío)')}
                            </div>
                            <div className="text-slate-500">
                              Archivo: {String(change.newValue)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={() => window.location.reload()}
              disabled={processing}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleProcess}
              disabled={processing || (!insertNewClients && !updateExistingClients && !insertNewProducts)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirmar y Procesar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
