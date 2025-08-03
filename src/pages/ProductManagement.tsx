// ProductManagement.tsx - Versión con mejoras QR aplicadas
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { parseExcelFile, parseProductData, validateProductData } from '../utils/excelParsingService';
import { ProductDetailView } from './ProductDetailView';
import { qrConfigService } from '../services/qrConfig.service';
import { QRConfigModal } from '../components/QRConfigModal';
import { 
  Package, FileSpreadsheet, AlertCircle, CheckCircle, 
  Upload, Search, Filter, Calendar, X, Eye, ChevronDown,
  Download, Plus, Clock, XCircle, Settings, QrCode
} from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    vencidos: 0,
    vigentes: 0,
    pendientes: 0,
    conQR: 0,
    sinQR: 0,
    pendientesRegeneracion: 0
  });

  useEffect(() => {
    fetchProducts();
    
    // Suscribirse a cambios de configuración QR
    const unsubscribe = qrConfigService.subscribe(() => {
      // Actualizar vista si cambia la configuración
      fetchProducts();
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    filterProducts();
    calculateStats();
  }, [products, searchQuery, statusFilter]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducts(data || []);
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

    setStats({
      total: products.length,
      vencidos,
      vigentes,
      pendientes,
      conQR,
      sinQR,
      pendientesRegeneracion
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
        product.codificacion?.toLowerCase().includes(searchQuery.toLowerCase())
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
    }

    setFilteredProducts(filtered);
  };

  const hasAllRequiredData = (product: Product): boolean => {
    const requiredFields = [
      'producto', 'marca', 'origen', 'fabricante', 
      'normas_aplicacion', 'vencimiento', 'titular'
    ];
    
    return requiredFields.every(field => product[field as keyof Product]);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const { data: parsedData } = await parseExcelFile(selectedFile);
      const parsedProducts = parsedData.map(row => parseProductData(row, parsedData[0]));
      const validProducts = parsedProducts.filter(p => {
        const validation = validateProductData(p);
        return validation.isValid;
      });

      if (validProducts.length === 0) {
        throw new Error('No se encontraron productos válidos en el archivo');
      }

      // Insertar productos en la base de datos
      const productsToInsert = validProducts.map(product => ({
        ...product,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        djc_status: 'No Generada',
        certificado_status: 'Pendiente Subida',
        enviado_cliente: 'Pendiente',
        qr_status: 'No generado'
      }));

      const { error } = await supabase
        .from('products')
        .upsert(productsToInsert, { onConflict: 'codificacion' });

      if (error) throw error;

      toast.success(`${validProducts.length} productos importados exitosamente`);
      setSelectedFile(null);
      await fetchProducts();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'Error al procesar el archivo');
    } finally {
      setUploading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const dataToExport = filteredProducts.map(product => ({
        'Codificación': product.codificacion,
        'Producto': product.producto || '',
        'Marca': product.marca || '',
        'Modelo': product.modelo || '',
        'Origen': product.origen || '',
        'Fabricante': product.fabricante || '',
        'Planta': product.planta_fabricacion || '',
        'Normas': product.normas_aplicacion || '',
        'Fecha Informe': product.fecha_emision || '',
        'Vencimiento': product.vencimiento || '',
        'Estado': getProductStatus(product).status,
        'QR': getQRStatus(product).status,
        'Titular': product.titular || ''
      }));

      // Aquí implementarías la exportación real a Excel
      console.log('Exportando:', dataToExport);
      toast.success('Exportación iniciada');
    } catch (error) {
      toast.error('Error al exportar');
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
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
            <p className="text-2xl font-bold">{stats.vencidos}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-sm opacity-90">Con QR</p>
            <p className="text-2xl font-bold">{stats.conQR}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-sm opacity-90">Sin QR</p>
            <p className="text-2xl font-bold">{stats.sinQR}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-sm opacity-90">QR Pendiente</p>
            <p className="text-2xl font-bold">{stats.pendientesRegeneracion}</p>
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
          </select>

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

        {/* Importar archivo */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="flex-1"
            />
            {selectedFile && (
              <button
                onClick={handleFileUpload}
                disabled={uploading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Importar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
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
                  <tr key={product.codificacion} className="hover:bg-gray-50">
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
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Ver Ficha
                        {missingData && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                            !
                          </span>
                        )}
                      </button>
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