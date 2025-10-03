import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { StatusBadge } from '../components/Common/StatusBadge';
import { FileText, Upload, CreditCard as Edit, Send, RefreshCw, Search, ListFilter as Filter, Package, CircleAlert as AlertCircle, Download, X, User, Building2, MapPin, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DJCPdfGenerator } from '../services/djcPdfGenerator.service';
import { formatCuit } from '../utils/formatters';

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
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDJCModal, setShowDJCModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedResolution, setSelectedResolution] = useState('Res. SICyC N° 236/24');
  const [generating, setGenerating] = useState(false);
  const [representante, setRepresentante] = useState({
    nombre: '',
    domicilio: '',
    cuit: ''
  });

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
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('cuit', product.cuit)
        .maybeSingle();

      if (error) throw error;

      if (!client) {
        toast.error('No se encontró el cliente asociado al producto');
        return;
      }

      setSelectedProduct(product);
      setSelectedClient(client);
      setShowDJCModal(true);
    } catch (error) {
      console.error('Error loading client:', error);
      toast.error('Error al cargar información del cliente');
    }
  };

  const generateDJC = async () => {
    if (!selectedProduct || !selectedClient) return;

    setGenerating(true);
    try {
      const domicilio = `${selectedClient.direccion || ''}${selectedClient.ciudad ? ', ' + selectedClient.ciudad : ''}${selectedClient.provincia ? ', ' + selectedClient.provincia : ''}`.trim();
      const domicilioPlanta = selectedClient.direccion_planta || domicilio;

      const djcNumber = `${selectedClient.cuit}-${selectedProduct.codificacion}-${Date.now()}`;

      const fechaProximaVigilancia = selectedProduct.fecha_proxima_vigilancia
        ? new Date(selectedProduct.fecha_proxima_vigilancia).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        : selectedProduct.vencimiento
        ? new Date(selectedProduct.vencimiento).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        : '-';

      const djcData = {
        numero_djc: djcNumber,
        resolucion: selectedResolution,
        razon_social: selectedClient.razon_social,
        cuit: formatCuit(selectedClient.cuit?.toString() || ''),
        marca: selectedProduct.marca || selectedProduct.titular || '',
        domicilio_legal: domicilio,
        domicilio_planta: domicilioPlanta,
        telefono: selectedClient.telefono || '',
        email: selectedClient.email || '',
        representante_nombre: representante.nombre,
        representante_domicilio: representante.domicilio,
        representante_cuit: representante.cuit,
        codigo_producto: selectedProduct.codificacion,
        fabricante: selectedProduct.fabricante || '',
        identificacion_producto: selectedProduct.producto || '',
        producto_marca: selectedProduct.marca || '',
        producto_modelo: selectedProduct.modelo || '',
        caracteristicas_tecnicas: selectedProduct.caracteristicas_tecnicas || '',
        reglamento_alcanzado: selectedResolution,
        normas_tecnicas: selectedProduct.normas_aplicacion || '',
        numero_certificado: selectedProduct.n_certificado_extranjero || '',
        organismo_certificacion: selectedProduct.ocp_extranjero || '',
        esquema_certificacion: selectedProduct.esquema_certificacion || '',
        fecha_emision_certificado: selectedProduct.fecha_emision || '',
        fecha_proxima_vigilancia: fechaProximaVigilancia,
        laboratorio_ensayos: selectedProduct.laboratorio || '',
        informe_ensayos: selectedProduct.informe_ensayo_nro || '',
        enlace_declaracion: selectedProduct.qr_link || '',
        fecha_lugar: `Buenos Aires, ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`
      };

      const pdfBytes = await DJCPdfGenerator.generateDJC(djcData);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const fileName = `DJC_${selectedProduct.codificacion}_${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('djcs')
        .upload(fileName, blob, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('products')
        .update({
          djc_status: 'Generada',
          djc_path: fileName,
          updated_at: new Date().toISOString()
        })
        .eq('codificacion', selectedProduct.codificacion);

      if (updateError) throw updateError;

      toast.success('DJC generada exitosamente');
      setShowDJCModal(false);
      await fetchProducts();
    } catch (error) {
      console.error('Error generating DJC:', error);
      toast.error('Error al generar DJC');
    } finally {
      setGenerating(false);
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('codification')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('titular')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Días
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DJC
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Certificado
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enviado
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.codificacion} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 max-w-xs truncate" title={product.codificacion}>
                      {product.codificacion}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 max-w-xs truncate" title={product.titular || 'N/A'}>
                      {product.titular || 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 max-w-xs truncate" title={product.producto || 'N/A'}>
                      {product.producto || 'N/A'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 text-center">
                      {product.vencimiento ? format(new Date(product.vencimiento), 'dd/MM/yyyy', { locale: es }) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      {product.dias_para_vencer !== null ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.dias_para_vencer < 0
                            ? 'bg-red-100 text-red-800'
                            : product.dias_para_vencer <= 30
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {product.dias_para_vencer}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <StatusBadge status={product.djc_status} type="djc" />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <StatusBadge status={product.certificado_status} type="certificate" />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <StatusBadge status={product.enviado_cliente} type="sent" />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center justify-center space-x-1">
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

      {/* Modal de Generación de DJC */}
      {showDJCModal && selectedProduct && selectedClient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Generar DJC</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Producto: {selectedProduct.codificacion}
                </p>
              </div>
              <button
                onClick={() => setShowDJCModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={generating}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
              {/* Información del Cliente */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Información del Cliente
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Razón Social:</span>
                    <p className="font-medium text-gray-900">{selectedClient.razon_social}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">CUIT:</span>
                    <p className="font-medium text-gray-900">{formatCuit(selectedClient.cuit?.toString())}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Dirección:</span>
                    <p className="font-medium text-gray-900">{selectedClient.direccion}</p>
                  </div>
                </div>
              </div>

              {/* Información del Producto */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  Información del Producto
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="col-span-2">
                    <span className="text-gray-500">Producto:</span>
                    <p className="font-medium text-gray-900">{selectedProduct.producto}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Marca:</span>
                    <p className="font-medium text-gray-900">{selectedProduct.marca || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Modelo:</span>
                    <p className="font-medium text-gray-900">{selectedProduct.modelo || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Configuración de DJC */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Configuración de DJC
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolución
                  </label>
                  <select
                    value={selectedResolution}
                    onChange={(e) => setSelectedResolution(e.target.value)}
                    className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    disabled={generating}
                  >
                    <option value="Res. SICyC N° 236/24">Res. SICyC N° 236/24</option>
                    <option value="Res. SICyC N° 17/2025">Res. SICyC N° 17/2025</option>
                    <option value="Res. SICyC N° 16/2025">Res. SICyC N° 16/2025</option>
                  </select>
                </div>

                {/* Representante (Opcional) */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Representante Autorizado (Opcional)
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      placeholder="Nombre y Apellido / Razón Social"
                      value={representante.nombre}
                      onChange={(e) => setRepresentante({ ...representante, nombre: e.target.value })}
                      className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      disabled={generating}
                    />
                    <input
                      type="text"
                      placeholder="CUIT"
                      value={representante.cuit}
                      onChange={(e) => setRepresentante({ ...representante, cuit: e.target.value })}
                      className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      disabled={generating}
                    />
                    <input
                      type="text"
                      placeholder="Domicilio Legal"
                      value={representante.domicilio}
                      onChange={(e) => setRepresentante({ ...representante, domicilio: e.target.value })}
                      className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      disabled={generating}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowDJCModal(false)}
                disabled={generating}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={generateDJC}
                disabled={generating}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <LoadingSpinner />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Generar DJC
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}