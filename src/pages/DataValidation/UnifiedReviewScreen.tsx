import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Users, Package, RefreshCw } from 'lucide-react';
import { UnifiedRecord, processUnifiedData } from '../../services/unifiedDataLoad.service';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/Common/LoadingSpinner';

interface UnifiedReviewScreenProps {
  records: UnifiedRecord[];
  batchId: string;
  onComplete: () => void;
}

interface AnalysisResult {
  clients: {
    new: Set<number>;
    existing: Set<number>;
  };
  products: {
    new: Set<string>;
    existing: Set<string>;
  };
}

export const UnifiedReviewScreen: React.FC<UnifiedReviewScreenProps> = ({
  records,
  batchId,
  onComplete
}) => {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult>({
    clients: { new: new Set(), existing: new Set() },
    products: { new: new Set(), existing: new Set() }
  });

  useEffect(() => {
    analyzeRecords();
  }, []);

  const analyzeRecords = async () => {
    setLoading(true);
    try {
      const newClients = new Set<number>();
      const existingClients = new Set<number>();
      const newProducts = new Set<string>();
      const existingProducts = new Set<string>();

      const uniqueClients = new Map<number, boolean>();
      records.forEach(r => uniqueClients.set(r.client.cuit, false));

      for (const cuit of uniqueClients.keys()) {
        const { data } = await supabase
          .from('clients')
          .select('cuit')
          .eq('cuit', cuit)
          .maybeSingle();

        if (data) {
          existingClients.add(cuit);
        } else {
          newClients.add(cuit);
        }
      }

      for (const record of records) {
        const { data } = await supabase
          .from('products')
          .select('codificacion')
          .eq('codificacion', record.product.codificacion)
          .maybeSingle();

        if (data) {
          existingProducts.add(record.product.codificacion);
        } else {
          newProducts.add(record.product.codificacion);
        }
      }

      setAnalysis({
        clients: { new: newClients, existing: existingClients },
        products: { new: newProducts, existing: existingProducts }
      });

      console.log('Analysis complete:', {
        clientsNew: newClients.size,
        clientsExisting: existingClients.size,
        productsNew: newProducts.size,
        productsExisting: existingProducts.size
      });
    } catch (error: any) {
      console.error('Error analyzing records:', error);
      toast.error('Error al analizar registros: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    setProcessing(true);

    try {
      console.log('Starting unified processing...');
      const result = await processUnifiedData(records, batchId);

      console.log('Processing result:', result);

      if (result.success) {
        const totalProcessed =
          result.clientsProcessed.inserted +
          result.clientsProcessed.updated +
          result.productsProcessed.inserted +
          result.productsProcessed.updated;

        toast.success(
          `✅ ${totalProcessed} registros procesados:\n` +
          `Clientes: ${result.clientsProcessed.inserted} nuevos, ${result.clientsProcessed.updated} actualizados\n` +
          `Productos: ${result.productsProcessed.inserted} nuevos, ${result.productsProcessed.updated} actualizados`
        );

        onComplete();
      } else {
        toast.error(`Procesamiento completado con ${result.errors.length} errores`);
        console.error('Processing errors:', result.errors);
      }
    } catch (error: any) {
      console.error('Error processing:', error);
      toast.error('Error al procesar: ' + error.message);
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

  const stats = {
    totalRecords: records.length,
    clientsNew: analysis.clients.new.size,
    clientsExisting: analysis.clients.existing.size,
    productsNew: analysis.products.new.size,
    productsExisting: analysis.products.existing.size
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">
            Revisar Datos Unificados
          </h1>
          <p className="text-slate-600 mb-6">
            El sistema procesará automáticamente clientes y productos
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-800">{stats.totalRecords}</div>
              <div className="text-sm text-slate-600">Total Registros</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-green-600" />
                <div className="text-xs font-medium text-green-700">Clientes</div>
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.clientsNew}</div>
              <div className="text-sm text-green-700">Nuevos</div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-yellow-600" />
                <div className="text-xs font-medium text-yellow-700">Clientes</div>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{stats.clientsExisting}</div>
              <div className="text-sm text-yellow-700">Actualizar</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-blue-600" />
                <div className="text-xs font-medium text-blue-700">Productos</div>
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.productsNew}</div>
              <div className="text-sm text-blue-700">Nuevos</div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-orange-600" />
                <div className="text-xs font-medium text-orange-700">Productos</div>
              </div>
              <div className="text-2xl font-bold text-orange-600">{stats.productsExisting}</div>
              <div className="text-sm text-orange-700">Actualizar</div>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Clients Info */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-8 h-8 text-green-600" />
              <div>
                <h2 className="text-xl font-bold text-slate-800">Clientes</h2>
                <p className="text-sm text-slate-600">
                  {stats.clientsNew + stats.clientsExisting} clientes únicos
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">Nuevos</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{stats.clientsNew}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Actualizar</span>
                </div>
                <span className="text-2xl font-bold text-yellow-600">{stats.clientsExisting}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              Los clientes existentes se actualizarán con la nueva información
            </p>
          </div>

          {/* Products Info */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-slate-800">Productos</h2>
                <p className="text-sm text-slate-600">
                  {stats.totalRecords} productos totales
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Nuevos</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">{stats.productsNew}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <span className="font-medium text-orange-900">Actualizar</span>
                </div>
                <span className="text-2xl font-bold text-orange-600">{stats.productsExisting}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              Productos existentes: solo se actualizan datos del certificado (QR/paths protegidos)
            </p>
          </div>
        </div>

        {/* Warning */}
        {stats.productsExisting > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg mb-6">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-orange-400 mr-3" />
              <div>
                <p className="text-sm text-orange-700">
                  <strong>{stats.productsExisting} productos ya existen</strong> en la base de datos.
                  Sus QR, certificados y configuraciones se mantendrán intactos.
                  Solo se actualizarán los datos del certificado (marca, modelo, fechas, etc.).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">¿Procesar estos datos?</h3>
              <p className="text-sm text-slate-600">
                Se procesarán automáticamente {stats.clientsNew + stats.clientsExisting} clientes
                y {stats.totalRecords} productos
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
                disabled={processing}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Procesar Todo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
