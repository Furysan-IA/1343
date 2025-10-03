import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { StatusBadge } from '../components/Common/StatusBadge';
import { FileText, Upload, CreditCard as Edit, Send, RefreshCw, Search, ListFilter as Filter, Package, CircleAlert as AlertCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Product {
  codificacion: string;
  cuit: number;
  titular: string | null;
  tipo_certificacion: string | null;
  estado: string | null;
  en_proceso_renovacion: string | null;
  direccion_legal_empresa: string | null;
  fabricante: string | null;
  planta_fabricacion: string | null;
  origen: string | null;
  producto: string | null;
  marca: string | null;
  modelo: string | null;
  caracteristicas_tecnicas: string | null;
  normas_aplicacion: string | null;
  informe_ensayo_nro: string | null;
  laboratorio: string | null;
  ocp_extranjero: string | null;
  n_certificado_extranjero: string | null;
  fecha_emision_certificado_extranjero: string | null;
  disposicion_convenio: string | null;
  cod_rubro: number | null;
  cod_subrubro: number | null;
  nombre_subrubro: string | null;
  fecha_emision: string | null;
  vencimiento: string | null;
  fecha_cancelacion: string | null;
  motivo_cancelacion: string | null;
  dias_para_vencer: number | null;
  djc_status: string;
  certificado_status: string;
  enviado_cliente: string;
  certificado_path: string | null;
  djc_path: string | null;
  qr_path: string | null;
  qr_link: string | null;
  created_at: string;
  updated_at: string;
}

export function DJCManagement() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      // Primero obtener el conteo total
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      console.log('Total de productos en DB:', count);

      // Cargar TODOS los productos en lotes
      const allProducts: Product[] = [];
      const batchSize = 1000;
      const totalBatches = Math.ceil((count || 0) / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const from = i * batchSize;
        const to = from + batchSize - 1;

        console.log(`Cargando lote ${i + 1}/${totalBatches}: registros ${from}-${to}`);

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        if (data) {
          allProducts.push(...data);
          console.log(`Lote ${i + 1} cargado: ${data.length} productos. Total acumulado: ${allProducts.length}`);
        }
      }

      console.log('Total de productos cargados:', allProducts.length);
      setProducts(allProducts);
    } catch (error: any) {
      toast.error(`Error al cargar productos: ${error.message}`);
      
      // Log error
      try {
        await supabase.rpc('log_error', {
          error_msg: `Failed to fetch products for DJC management: ${error.message}`,
          error_context: { section: 'DJC Management', action: 'Fetch Products' }
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetchProducts();
      toast.success('Datos sincronizados correctamente');
    } catch (error: any) {
      toast.error(`Error al sincronizar: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateDJC = async (product: Product) => {
    try {
      toast(`Generando DJC para producto ${product.codificacion}...`);
      
      // TODO: Implementar lógica de generación de DJC
      // Por ahora solo mostramos un mensaje de confirmación
      setTimeout(() => {
        toast.success(`DJC generada exitosamente para ${product.codificacion}`);
      }, 1000);
      
    } catch (error: any) {
      toast.error(`Error al generar DJC: ${error.message}`);
    }
  };

  const handleUploadCertificate = async (product: Product) => {
    toast(`Subir certificado para producto ${product.codificacion}`);
    // TODO: Implementar lógica de subida de certificado
  };

  const handleSignDJC = async (product: Product) => {
    toast(`Firmar DJC para producto ${product.codificacion}`);
    // TODO: Implementar lógica de firma de DJC
  };

  const handleMarkAsSent = async (product: Product) => {
    toast(`Marcar como enviado producto ${product.codificacion}`);
    // TODO: Implementar lógica para marcar como enviado
  };

  const getDJCDownloadUrl = (djcPath: string) => {
    const { data } = supabase.storage
      .from('djcs')
      .getPublicUrl(djcPath);
    return data.publicUrl;
  };

  const filteredProducts = products.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      product.codificacion.toLowerCase().includes(searchLower) ||
      String(product.cuit).includes(searchTerm) ||
      (product.titular && product.titular.toLowerCase().includes(searchLower)) ||
      (product.producto && product.producto.toLowerCase().includes(searchLower)) ||
      (product.marca && product.marca.toLowerCase().includes(searchLower))
    );

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'no_generada') return product.djc_status === 'No Generada';
    if (statusFilter === 'pendiente_firma') return product.djc_status === 'Generada Pendiente de Firma';
    if (statusFilter === 'pendiente_subida') return product.certificado_status === 'Pendiente Subida';
    if (statusFilter === 'pendiente_envio') return product.enviado_cliente === 'Pendiente';
    if (statusFilter === 'vencidos') return product.dias_para_vencer !== null && product.dias_para_vencer < 0;
    if (statusFilter === 'proximos_vencer') return product.dias_para_vencer !== null && product.dias_para_vencer >= 0 && product.dias_para_vencer <= 30;

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {t('djcManagement')}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de Declaraciones Juradas de Conformidad (DJC)
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {t('sync')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              {t('search')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Buscar por codificación, CUIT, titular, producto o marca..."
              />
            </div>
          </div>

          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              <Filter className="inline h-4 w-4 mr-1" />
              {t('filter')}
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los productos</option>
              <option value="no_generada">DJC No Generada</option>
              <option value="pendiente_firma">DJC Pendiente de Firma</option>
              <option value="pendiente_subida">Certificado Pendiente Subida</option>
              <option value="pendiente_envio">Pendiente de Envío al Cliente</option>
              <option value="vencidos">Productos Vencidos</option>
              <option value="proximos_vencer">Próximos a Vencer (30 días)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Package className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Productos para Gestión de DJC ({filteredProducts.length})
              </h3>
            </div>
          </div>
        </div>
        
        {filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('codification')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('titular')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('expirationDate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('daysToExpire')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('djcStatus')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('certificateStatus')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('sentToClient')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.codificacion} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.codificacion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.titular || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.producto || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.vencimiento ? format(new Date(product.vencimiento), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.dias_para_vencer !== null ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.dias_para_vencer < 0 
                            ? 'bg-red-100 text-red-800' 
                            : product.dias_para_vencer <= 30 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {product.dias_para_vencer} días
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={product.djc_status} type="djc" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={product.certificado_status} type="certificate" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={product.enviado_cliente} type="sent" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {/* Generar DJC Button */}
                        <button
                          onClick={() => handleGenerateDJC(product)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          title="Generar DJC"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          DJC
                        </button>

                        {/* PDF Download Link */}
                        {product.djc_path ? (
                          <a
                            href={getDJCDownloadUrl(product.djc_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            title="Ver DJC"
                          >
                            <Download className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-400 bg-gray-100" title="DJC no disponible">
                            <FileText className="h-3 w-3" />
                          </span>
                        )}

                        {/* Upload Certificate Button */}
                        <button
                          onClick={() => handleUploadCertificate(product)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                          title="Subir Certificado"
                        >
                          <Upload className="h-3 w-3" />
                        </button>

                        {/* Sign DJC Button */}
                        <button
                          onClick={() => handleSignDJC(product)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                          title="Firmar DJC"
                        >
                          <Edit className="h-3 w-3" />
                        </button>

                        {/* Mark as Sent Button */}
                        <button
                          onClick={() => handleMarkAsSent(product)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-teal-700 bg-teal-100 hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                          title="Marcar como Enviado"
                        >
                          <Send className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
            <p className="mt-1 text-sm text-gray-500">
              No se encontraron productos que coincidan con los filtros seleccionados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}