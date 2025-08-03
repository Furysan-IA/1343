import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { formatCuit } from '../utils/formatters';
import { Package, Search, Plus, Edit2, Trash2, CheckCircle, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

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
  djc_status: string | null;
  certificado_status: string | null;
  enviado_cliente: string | null;
  certificado_path: string | null;
  djc_path: string | null;
  qr_path: string | null;
  qr_link: string | null;
  created_at: string;
  updated_at: string;
  qr_status: string | null;
  qr_generated_at: string | null;
}

interface Client {
  cuit: number;
  razon_social: string;
  direccion: string;
  email: string;
  telefono: string | null;
  contacto: string | null;
}

export function ProductManagement() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery]);

  const fetchData = async () => {
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('codificacion');

      if (productsError) throw productsError;

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');

      if (clientsError) throw clientsError;

      setProducts(productsData || []);
      setClients(clientsData || []);
      setLastSync(new Date());
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const syncWithSupabase = async () => {
    setSyncing(true);
    try {
      await fetchData();
      toast.success('Sincronización completada');
    } catch (error) {
      toast.error('Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const filterProducts = () => {
    if (!searchQuery) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(product => 
      product.codificacion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.titular?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.producto?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.marca?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatCuit(product.cuit).includes(searchQuery)
    );
    
    setFilteredProducts(filtered);
  };

  const getProductStatus = (product: Product) => {
    const requiredFields = ['titular', 'producto', 'marca', 'modelo', 'fabricante'];
    const missingFields: string[] = [];
    
    requiredFields.forEach(field => {
      const value = product[field as keyof Product];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length === 0) {
      return { 
        status: 'Completado', 
        color: 'text-green-600', 
        bgColor: 'bg-green-50',
        icon: CheckCircle,
        missingFields: []
      };
    } else {
      return { 
        status: `Faltan ${missingFields.length} campos`, 
        color: 'text-orange-600', 
        bgColor: 'bg-orange-50',
        icon: AlertCircle,
        missingFields
      };
    }
  };

  const getClientName = (cuit: number) => {
    const client = clients.find(c => c.cuit === cuit);
    return client ? client.razon_social : formatCuit(cuit);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleDelete = async (codificacion: string) => {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('codificacion', codificacion);

      if (error) throw error;

      toast.success('Producto eliminado correctamente');
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar el producto');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">{t('productManagement.title')}</h2>
            <p className="opacity-90">Total de productos: {products.length}</p>
          </div>
          <Package className="w-12 h-12 opacity-80" />
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por codificación, titular, producto, marca o CUIT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Botones */}
          <button
            onClick={syncWithSupabase}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>

        {/* Indicador de última sincronización */}
        {lastSync && (
          <p className="mt-3 text-sm text-gray-500">
            Última sincronización: {lastSync.toLocaleTimeString('es-AR')}
          </p>
        )}
      </div>

      {/* Tabla de productos */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Codificación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marca/Modelo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimiento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const status = getProductStatus(product);
                const Icon = status.icon;
                
                return (
                  <tr 
                    key={product.codificacion} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleProductClick(product)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {product.codificacion}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.tipo_certificacion || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getClientName(product.cuit)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatCuit(product.cuit)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {product.producto || ''}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.titular || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.marca || ''}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.modelo || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.vencimiento ? new Date(product.vencimiento).toLocaleDateString('es-AR') : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${status.color}`} />
                        <span className={`px-2 py-1 text-xs rounded-full ${status.bgColor} ${status.color}`}>
                          {status.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProductClick(product);
                          }}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(product.codificacion);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron productos</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalle del producto */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">
                Detalle del Producto: {selectedProduct.codificacion}
              </h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Información General</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Codificación:</span> {selectedProduct.codificacion}</div>
                    <div><span className="font-medium">Cliente:</span> {getClientName(selectedProduct.cuit)}</div>
                    <div><span className="font-medium">CUIT:</span> {formatCuit(selectedProduct.cuit)}</div>
                    <div><span className="font-medium">Titular:</span> {selectedProduct.titular || ''}</div>
                    <div><span className="font-medium">Tipo Certificación:</span> {selectedProduct.tipo_certificacion || ''}</div>
                    <div><span className="font-medium">Estado:</span> {selectedProduct.estado || ''}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Producto</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Producto:</span> {selectedProduct.producto || ''}</div>
                    <div><span className="font-medium">Marca:</span> {selectedProduct.marca || ''}</div>
                    <div><span className="font-medium">Modelo:</span> {selectedProduct.modelo || ''}</div>
                    <div><span className="font-medium">Fabricante:</span> {selectedProduct.fabricante || ''}</div>
                    <div><span className="font-medium">Origen:</span> {selectedProduct.origen || ''}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Fechas</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Fecha Emisión:</span> {selectedProduct.fecha_emision ? new Date(selectedProduct.fecha_emision).toLocaleDateString('es-AR') : ''}</div>
                    <div><span className="font-medium">Vencimiento:</span> {selectedProduct.vencimiento ? new Date(selectedProduct.vencimiento).toLocaleDateString('es-AR') : ''}</div>
                    <div><span className="font-medium">Días para vencer:</span> {selectedProduct.dias_para_vencer || ''}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Estados</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">DJC Status:</span> {selectedProduct.djc_status || ''}</div>
                    <div><span className="font-medium">Certificado Status:</span> {selectedProduct.certificado_status || ''}</div>
                    <div><span className="font-medium">Enviado Cliente:</span> {selectedProduct.enviado_cliente || ''}</div>
                    <div><span className="font-medium">QR Status:</span> {selectedProduct.qr_status || ''}</div>
                  </div>
                </div>
              </div>

              {selectedProduct.caracteristicas_tecnicas && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Características Técnicas</h4>
                  <p className="text-sm text-gray-700">{selectedProduct.caracteristicas_tecnicas}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}