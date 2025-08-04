// ProductManagement.tsx - Versión corregida con todas las implementaciones
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { ProductDetailView } from '../components/ProductDetailView';
import { qrConfigService } from '../services/qrConfig.service';
import { QRConfigModal } from '../components/QRConfigModal';
import { 
  Package, AlertCircle, CheckCircle, Search, Calendar, 
  X, Eye, Download, Clock, XCircle, Settings, QrCode,
  RefreshCw, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Product {
  codificacion: string;
  uuid: string;
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
  qr_status: string | null;
  qr_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export function ProductManagement() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    vencidos: 0,
    vigentes: 0,
    pendientes: 0,
    conQR: 0,
    sinQR: 0,
    pendientesRegeneracion: 0,
    sinDJC: 0,
    conDatosFaltantes: 0
  });

  useEffect(() => {
    fetchProducts();

    // Suscribirse a cambios de configuración QR
    const unsubscribe = qrConfigService.subscribe(() => {
      // Actualizar vista si cambia la configuración
      fetchProducts();
    });

    // Configurar auto-sincronización cada 5 minutos
    const syncInterval = setInterval(() => {
      syncWithSupabase();
    }, 5 * 60 * 1000); // 5 minutos

    return () => {
      unsubscribe();
      clearInterval(syncInterval);
    };
  }, []);

  useEffect(() => {
    filterProducts();
    calculateStats();
  }, [products, searchQuery, statusFilter]);

  const fetchProducts = async () => {
    try {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (!count) {
        setProducts([]);
        setLastSync(new Date());
        toast.info('No hay productos en la base de datos');
        return;
      }

      // Obtener todos los productos en lotes de 1000
      const allProducts: Product[] = [];
      const batchSize = 1000;
      const totalBatches = Math.ceil(count / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = start + batchSize - 1;

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .range(start, end);

        if (error) throw error;
        if (data) allProducts.push(...data);
      }

      setProducts(allProducts);
      setLastSync(new Date());

      // Mostrar cuántos productos se cargaron
      toast.success(`${allProducts.length} productos cargados exitosamente`);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const now = new Date();
    const vencidos = products.filter(p => {
      if (!p.vencimiento) return false;
      return new Date(p.vencimiento) < now;
    }).length;

    const vigentes = products.filter(p => {
      if (!p.vencimiento) return false;
      return new Date(p.vencimiento) >= now;
    }).length;

    const pendientes = products.filter(p => !p.vencimiento).length;
    const conQR = products.filter(p => p.qr_path).length;
    const sinQR = products.filter(p => !p.qr_path).length;
    const pendientesRegeneracion = products.filter(p => p.qr_status === 'Pendiente regeneración').length;
    const sinDJC = products.filter(p => !p.djc_path).length;
    const conDatosFaltantes = products.filter(p => !hasAllRequiredData(p)).length;

    setStats({
      total: products.length,
      vencidos,
      vigentes,
      pendientes,
      conQR,
      sinQR,
      pendientesRegeneracion,
      sinDJC,
      conDatosFaltantes
    });
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Filtro por búsqueda
    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.producto?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.marca?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.modelo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.codificacion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.titular?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtro por estado
    const now = new Date();
    switch (statusFilter) {
      case 'vigente':
        filtered = filtered.filter(p => p.vencimiento && new Date(p.vencimiento) >= now);
        break;
      case 'vencido':
        filtered = filtered.filter(p => p.vencimiento && new Date(p.vencimiento) < now);
        break;
      case 'pendiente':
        filtered = filtered.filter(p => !p.vencimiento);
        break;
      case 'datos_faltantes':
        filtered = filtered.filter(p => !hasAllRequiredData(p));
        break;
      case 'qr_pendiente':
        filtered = filtered.filter(p => p.qr_status === 'Pendiente regeneración');
        break;
      case 'sin_djc':
        filtered = filtered.filter(p => !p.djc_path);
        break;
    }

    setFilteredProducts(filtered);
  };

  const hasAllRequiredData = (product: Product): boolean => {
    const requiredFields = [
      'producto', 'marca', 'origen', 'fabricante',
      'normas_aplicacion', 'vencimiento', 'titular', 'informe_ensayo_nro'
    ];

    return requiredFields.every(field => {
      const value = product[field as keyof Product];
      return value !== null && value !== undefined && value !== '';
    });
  };

  const getProductStatus = (product: Product) => {
    if (!product.vencimiento) {
      return { status: 'Pendiente', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    }

    const now = new Date();
    const vencimiento = new Date(product.vencimiento);

    if (vencimiento < now) {
      return { status: 'Vencido', color: 'text-red-600', bgColor: 'bg-red-50' };
    }

    const diasParaVencer = Math.ceil((vencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diasParaVencer <= 30) {
      return { status: `Vence en ${diasParaVencer} días`, color: 'text-orange-600', bgColor: 'bg-orange-50' };
    }

    return { status: 'Vigente', color: 'text-green-600', bgColor: 'bg-green-50' };
  };

  const getQRStatus = (product: Product) => {
    if (!product.qr_path) {
      return { status: 'No generado', color: 'text-gray-600', icon: XCircle };
    }

    if (product.qr_status === 'Pendiente regeneración') {
      return { status: 'Pendiente regeneración', color: 'text-orange-600', icon: AlertCircle };
    }

    return { status: 'Generado', color: 'text-green-600', icon: CheckCircle };
  };

  const syncWithSupabase = async () => {
    setSyncing(true);
    try {
      await fetchProducts();
      toast.success('Sincronización completada exitosamente');
    } catch (error) {
      toast.error('Error al sincronizar con la base de datos');
    } finally {
      setSyncing(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const dataToExport = filteredProducts.map(product => ({
        'Codificación': product.codificacion,
        'CUIT': product.cuit,
        'Titular': product.titular || '',
        'Producto': product.producto || '',
        'Marca': product.marca || '',
        'Modelo': product.modelo || '',
        'Origen': product.origen || '',
        'Fabricante': product.fabricante || '',
        'Planta': product.planta_fabricacion || '',
        'Normas': product.normas_aplicacion || '',
        'N° Informe': product.informe_ensayo_nro || '',
        'Fecha Emisión': product.fecha_emision || '',
        'Vencimiento': product.vencimiento || '',
        'Estado': getProductStatus(product).status,
        'QR': getQRStatus(product).status,
        'DJC': product.djc_path ? 'Sí' : 'No',
        'Certificado': product.certificado_path ? 'Sí' : 'No'
      }));

      // Convertir a CSV
      const headers = Object.keys(dataToExport[0]);
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escapar comas y comillas
            return typeof value === 'string' && value.includes(',') 
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      // Descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `productos_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('Exportación completada');
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar los datos');
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`¿Está seguro de eliminar el producto "${product.producto || product.codificacion}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('codificacion', product.codificacion);

      if (error) throw error;

      toast.success('Producto eliminado correctamente');
      await fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(`Error al eliminar el producto: ${error.message}`);
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
      {/* Header con estadísticas */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">{t('productManagement')}</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-sm opacity-90">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-sm opacity-90">Vigentes</p>
            <p className="text-2xl font-bold">{stats.vigentes}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-sm opacity-90">Vencidos</p>
            <p className="text-2xl font-bold text-red-200">{stats.vencidos}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-sm opacity-90">Con QR</p>
            <p className="text-2xl font-bold">{stats.conQR}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-sm opacity-90">Sin DJC</p>
            <p className="text-2xl font-bold text-orange-200">{stats.sinDJC}</p>
          </div>
        </div>

        {/* Segunda fila de estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-sm opacity-90">Sin QR</p>
            <p className="text-2xl font-bold">{stats.sinQR}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-sm opacity-90">QR Pendiente</p>
            <p className="text-2xl font-bold">{stats.pendientesRegeneracion}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-sm opacity-90">Sin Vencimiento</p>
            <p className="text-2xl font-bold">{stats.pendientes}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-sm opacity-90">Datos Faltantes</p>
            <p className="text-2xl font-bold text-yellow-200">{stats.conDatosFaltantes}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-sm opacity-90">Completos</p>
            <p className="text-2xl font-bold text-green-200">
              {stats.total - stats.conDatosFaltantes}
            </p>
          </div>
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
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Filtros */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todos los estados</option>
            <option value="vigente">Vigentes</option>
            <option value="vencido">Vencidos</option>
            <option value="pendiente">Sin vencimiento</option>
            <option value="datos_faltantes">Datos faltantes</option>
            <option value="qr_pendiente">QR pendiente regeneración</option>
            <option value="sin_djc">Sin DJC</option>
          </select>

          {/* Sincronizar */}
          <button
            onClick={syncWithSupabase}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>

          {/* Configuración QR */}
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Config QR
          </button>

          {/* Exportar */}
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>

        {/* Indicador de última sincronización */}
        {lastSync && (
          <div className="mt-3 text-sm text-gray-500 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Última sincronización: {lastSync.toLocaleTimeString('es-AR')}
          </div>
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
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marca
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimiento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const status = getProductStatus(product);
                const qrStatus = getQRStatus(product);
                const missingData = !hasAllRequiredData(product);

                return (
                  <tr 
                    key={product.codificacion} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.codificacion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        {product.producto || <span className="text-gray-400">Sin nombre</span>}
                        {missingData && (
                          <AlertCircle className="w-4 h-4 text-orange-500" title="Datos faltantes" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.marca || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${status.bgColor} ${status.color}`}>
                        {status.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <qrStatus.icon className={`w-4 h-4 ${qrStatus.color}`} />
                        <span className={`text-sm ${qrStatus.color}`}>
                          {qrStatus.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.vencimiento 
                        ? new Date(product.vencimiento).toLocaleDateString('es-AR')
                        : <span className="text-gray-400">-</span>
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                          }}
                          className="text-purple-600 hover:text-purple-800 p-1"
                          title="Ver ficha del producto"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product);
                          }}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Eliminar producto"
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
              <p className="text-gray-500">
                {searchQuery || statusFilter !== 'all' 
                  ? 'No se encontraron productos con los filtros aplicados'
                  : 'No hay productos para mostrar'
                }
              </p>
              {(searchQuery || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="mt-2 text-purple-600 hover:text-purple-800 text-sm"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalle del producto */}
      {selectedProduct && (
        <ProductDetailView
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdate={fetchProducts}
        />
      )}

      {/* Modal de configuración QR */}
      <QRConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
}