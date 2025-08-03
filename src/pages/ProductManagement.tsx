import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { parseExcelFile, parseProductData, validateProductHeaders } from '../utils/excelParser';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { StatusBadge } from '../components/Common/StatusBadge';
import { 
  Upload, 
  RefreshCw, 
  Search, 
  Download,
  Filter,
  Plus,
  Package,
  AlertCircle,
  Calendar,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface Product {
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

export function ProductManagement() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error(`Error al cargar productos: ${error.message}`);
      
      // Log error
      try {
        await supabase.rpc('log_error', {
          error_msg: `Failed to fetch products: ${error.message}`,
          error_context: { section: 'Product Management', action: 'Fetch Products' }
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      // Parse Excel file
      const data = await parseExcelFile(file);
      
      if (data.length < 2) {
        throw new Error('El archivo debe contener al menos una fila de encabezados y una fila de datos');
      }

      const headers = data[0] as string[];
      
      // Validate headers
      if (!validateProductHeaders(headers)) {
        throw new Error('El archivo debe contener las columnas requeridas: CODIFICACION, CUIT');
      }

      // Parse product data
      const parsedProducts = parseProductData(data);
      
      if (parsedProducts.length === 0) {
        throw new Error('No se encontraron productos válidos en el archivo');
      }

      // Insert products (ignore duplicates)
      for (const product of parsedProducts) {
        try {
          const { error } = await supabase
            .from('products')
            .upsert([product], { 
              onConflict: 'codificacion',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error(`Error inserting product ${product.codificacion}:`, error);
            
            // Log individual product error
            await supabase.rpc('log_error', {
              error_msg: `Failed to insert product ${product.codificacion}: ${error.message}`,
              error_context: { 
                section: 'Product Management', 
                action: 'Excel Upload',
                product_codificacion: product.codificacion 
              }
            });
          }
        } catch (insertError: any) {
          console.error(`Failed to insert product ${product.codificacion}:`, insertError);
        }
      }

      // Save backup of Excel file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `products_${timestamp}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('excels')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Failed to backup Excel file:', uploadError);
      }

      toast.success(`Se procesaron ${parsedProducts.length} productos exitosamente`);
      fetchProducts(); // Refresh the list

    } catch (error: any) {
      toast.error(`Error al procesar archivo: ${error.message}`);
      
      // Log error
      try {
        await supabase.rpc('log_error', {
          error_msg: `Excel upload failed: ${error.message}`,
          error_context: { section: 'Product Management', action: 'Excel Upload' }
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
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
    if (statusFilter === 'expired') return product.dias_para_vencer !== null && product.dias_para_vencer < 0;
    if (statusFilter === 'expiring') return product.dias_para_vencer !== null && product.dias_para_vencer >= 0 && product.dias_para_vencer <= 30;
    if (statusFilter === 'pending_djc') return product.djc_status === 'No Generada';
    if (statusFilter === 'pending_cert') return product.certificado_status === 'Pendiente Subida';

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
            {t('productManagement')}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona productos y certificados en el sistema
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
          <label className="relative inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? t('loading') : 'Subir Excel'}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="sr-only"
            />
          </label>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              {t('filter')}
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los productos</option>
              <option value="expired">Vencidos</option>
              <option value="expiring">Próximos a vencer (30 días)</option>
              <option value="pending_djc">DJC pendiente</option>
              <option value="pending_cert">Certificado pendiente</option>
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
                Productos ({filteredProducts.length})
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
                    {t('client')}
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.codificacion} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.codificacion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.cuit}
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
              Comienza subiendo un archivo Excel con los datos de productos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}