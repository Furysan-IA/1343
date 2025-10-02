// Dashboard.tsx - Optimizado para manejar grandes cantidades de datos
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Database } from '../lib/supabase';
import { 
  Package, Users, CheckCircle, AlertCircle, 
  FileText, QrCode, Calendar, TrendingUp,
  Activity, Shield, Award, Clock, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Usar el tipo de la base de datos para consistencia
type Product = Database['public']['Tables']['products']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

interface DashboardStats {
  totalClients: number;
  totalProducts: number;
  activeProducts: number;
  expiredProducts: number;
  expiringProducts: number;
  productsWithQR: number;
  productsWithoutQR: number;
  productsWithDJC: number;
  productsWithoutDJC: number;
  productsByStatus: {
    vigente: number;
    vencido: number;
    pendiente: number;
  };
  recentProducts: Product[];
  expiringProductsList: Product[];
}

export function Dashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalProducts: 0,
    activeProducts: 0,
    expiredProducts: 0,
    expiringProducts: 0,
    productsWithQR: 0,
    productsWithoutQR: 0,
    productsWithDJC: 0,
    productsWithoutDJC: 0,
    productsByStatus: {
      vigente: 0,
      vencido: 0,
      pendiente: 0
    },
    recentProducts: [],
    expiringProductsList: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 Iniciando carga de datos del dashboard...');

      // 1. Obtener conteo total de productos (más eficiente)
      const { count: totalProducts, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('❌ Error al obtener conteo de productos:', countError);
        throw countError;
      }
      console.log('✅ Total de productos:', totalProducts);

      // 2. Obtener conteo de clientes
      const { count: totalClients, error: clientsCountError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      if (clientsCountError) {
        console.error('❌ Error al obtener conteo de clientes:', clientsCountError);
        throw clientsCountError;
      }
      console.log('✅ Total de clientes:', totalClients);

      // 3. Obtener estadísticas usando consultas optimizadas
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Consulta para productos con estadísticas
      console.log('📥 Solicitando productos...');
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('codificacion, producto, marca, vencimiento, qr_path, djc_path, created_at')
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('❌ Error al obtener productos:', productsError);
        throw productsError;
      }

      console.log('✅ Productos cargados:', products?.length);

      // Inicializar estadísticas
      const statsData: DashboardStats = {
        totalClients: totalClients || 0,
        totalProducts: totalProducts || 0,
        activeProducts: 0,
        expiredProducts: 0,
        expiringProducts: 0,
        productsWithQR: 0,
        productsWithoutQR: 0,
        productsWithDJC: 0,
        productsWithoutDJC: 0,
        productsByStatus: {
          vigente: 0,
          vencido: 0,
          pendiente: 0
        },
        recentProducts: [],
        expiringProductsList: []
      };

      // Procesar productos en lotes para mejor rendimiento
      const batchSize = 100;
      const expiringProducts: Product[] = [];

      if (products && products.length > 0) {
        for (let i = 0; i < products.length; i += batchSize) {
          const batch = products.slice(i, i + batchSize);
          
          batch.forEach(product => {
            // QR
            if (product.qr_path) {
              statsData.productsWithQR++;
            } else {
              statsData.productsWithoutQR++;
            }

            // DJC
            if (product.djc_path) {
              statsData.productsWithDJC++;
            } else {
              statsData.productsWithoutDJC++;
            }

            // Estado de vencimiento
            if (!product.vencimiento) {
              statsData.productsByStatus.pendiente++;
            } else {
              const vencimiento = new Date(product.vencimiento);
              if (vencimiento < now) {
                statsData.expiredProducts++;
                statsData.productsByStatus.vencido++;
              } else {
                statsData.activeProducts++;
                statsData.productsByStatus.vigente++;
                
                // Productos próximos a vencer (30 días)
                if (vencimiento <= thirtyDaysFromNow) {
                  statsData.expiringProducts++;
                  if (expiringProducts.length < 10) { // Limitar a 10 para el listado
                    expiringProducts.push(product as Product);
                  }
                }
              }
            }
          });

          // Actualizar UI cada cierto número de lotes procesados
          if (i % (batchSize * 5) === 0) {
            console.log(`Procesados ${i} de ${products.length} productos`);
          }
        }
      }

      // Productos recientes (últimos 5)
      statsData.recentProducts = products?.slice(0, 5) as Product[] || [];

      // Ordenar productos próximos a vencer
      expiringProducts.sort((a, b) => 
        new Date(a.vencimiento!).getTime() - new Date(b.vencimiento!).getTime()
      );
      statsData.expiringProductsList = expiringProducts;

      console.log('Estadísticas finales:', {
        total: statsData.totalProducts,
        conQR: statsData.productsWithQR,
        sinQR: statsData.productsWithoutQR,
        vigentes: statsData.activeProducts,
        vencidos: statsData.expiredProducts
      });

      setStats(statsData);
      toast.success('Dashboard actualizado');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    onClick,
    subtitle,
    loading = false
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    color: string;
    onClick?: () => void;
    subtitle?: string;
    loading?: boolean;
  }) => (
    <div 
      className={`bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          {loading ? (
            <div className="h-9 w-20 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <p className="text-3xl font-bold mt-2">{value.toLocaleString('es-AR')}</p>
          )}
          {subtitle && !loading && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading && !refreshing) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-4">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-700 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">{t('welcome')}</h1>
            <p className="opacity-90">Resumen de tu sistema de gestión</p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clientes"
          value={stats.totalClients}
          icon={Users}
          color="bg-blue-500"
          onClick={() => navigate('/clients')}
          loading={refreshing}
        />
        <StatCard
          title="Total Productos"
          value={stats.totalProducts}
          icon={Package}
          color="bg-emerald-500"
          onClick={() => navigate('/products')}
          loading={refreshing}
        />
        <StatCard
          title="Productos Vigentes"
          value={stats.activeProducts}
          icon={CheckCircle}
          color="bg-green-500"
          onClick={() => navigate('/products')}
          loading={refreshing}
        />
        <StatCard
          title="Productos Vencidos"
          value={stats.expiredProducts}
          icon={AlertCircle}
          color="bg-red-500"
          onClick={() => navigate('/products')}
          loading={refreshing}
        />
      </div>

      {/* Segunda fila de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Productos con QR"
          value={stats.productsWithQR}
          icon={QrCode}
          color="bg-teal-500"
          subtitle={`${stats.productsWithoutQR.toLocaleString('es-AR')} sin QR`}
          loading={refreshing}
        />
        <StatCard
          title="Productos con DJC"
          value={stats.productsWithDJC}
          icon={FileText}
          color="bg-orange-500"
          subtitle={`${stats.productsWithoutDJC.toLocaleString('es-AR')} sin DJC`}
          loading={refreshing}
        />
        <StatCard
          title="Por vencer (30 días)"
          value={stats.expiringProducts}
          icon={Clock}
          color="bg-yellow-500"
          loading={refreshing}
        />
        <StatCard
          title="Sin vencimiento"
          value={stats.productsByStatus.pendiente}
          icon={Calendar}
          color="bg-gray-500"
          loading={refreshing}
        />
      </div>

      {/* Nota informativa para grandes volúmenes */}
      {stats.totalProducts > 1000 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Tienes {stats.totalProducts.toLocaleString('es-AR')} productos en el sistema. 
            Las estadísticas se calculan en tiempo real y pueden tomar unos segundos en actualizarse.
          </p>
        </div>
      )}

      {/* Contenido en dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos próximos a vencer */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Productos Próximos a Vencer
            {stats.expiringProducts > 10 && (
              <span className="text-sm text-gray-500 ml-auto">
                (mostrando 10 de {stats.expiringProducts})
              </span>
            )}
          </h2>
          {refreshing ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : stats.expiringProductsList.length > 0 ? (
            <div className="space-y-3">
              {stats.expiringProductsList.slice(0, 10).map((product) => {
                const daysToExpire = Math.ceil(
                  (new Date(product.vencimiento!).getTime() - new Date().getTime()) / 
                  (1000 * 60 * 60 * 24)
                );
                
                return (
                  <div
                    key={product.codificacion}
                    className="flex items-center justify-between p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100"
                    onClick={() => navigate('/products')}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{product.producto || 'Sin nombre'}</p>
                      <p className="text-sm text-gray-600 truncate">
                        {product.marca} - {product.codificacion}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-medium text-orange-600">
                        {daysToExpire} días
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(product.vencimiento!).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                  </div>
                );
              })}
              {stats.expiringProducts > 10 && (
                <button
                  onClick={() => navigate('/products')}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-800 mt-2"
                >
                  Ver todos ({stats.expiringProducts})
                </button>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No hay productos próximos a vencer
            </p>
          )}
        </div>

        {/* Productos recientes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Productos Agregados Recientemente
          </h2>
          {refreshing ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : stats.recentProducts.length > 0 ? (
            <div className="space-y-3">
              {stats.recentProducts.map((product) => (
                <div
                  key={product.codificacion}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => navigate('/products')}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{product.producto || 'Sin nombre'}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {product.marca} - {product.codificacion}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs text-gray-500">
                      {new Date(product.created_at).toLocaleDateString('es-AR')}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {product.qr_path && (
                        <QrCode className="w-4 h-4 text-green-500" title="Con QR" />
                      )}
                      {product.djc_path && (
                        <FileText className="w-4 h-4 text-blue-500" title="Con DJC" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No hay productos recientes
            </p>
          )}
        </div>
      </div>

      {/* Gráfico de distribución */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Distribución de Productos</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="relative mx-auto w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#10b981"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${stats.totalProducts > 0 ? (stats.productsByStatus.vigente / stats.totalProducts) * 352 : 0} 352`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {stats.productsByStatus.vigente.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Vigentes</p>
            <p className="text-xs text-gray-500">
              {stats.totalProducts > 0 
                ? `${((stats.productsByStatus.vigente / stats.totalProducts) * 100).toFixed(1)}%`
                : '0%'
              }
            </p>
          </div>
          
          <div className="text-center">
            <div className="relative mx-auto w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#ef4444"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${stats.totalProducts > 0 ? (stats.productsByStatus.vencido / stats.totalProducts) * 352 : 0} 352`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {stats.productsByStatus.vencido.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Vencidos</p>
            <p className="text-xs text-gray-500">
              {stats.totalProducts > 0 
                ? `${((stats.productsByStatus.vencido / stats.totalProducts) * 100).toFixed(1)}%`
                : '0%'
              }
            </p>
          </div>
          
          <div className="text-center">
            <div className="relative mx-auto w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#f59e0b"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${stats.totalProducts > 0 ? (stats.productsByStatus.pendiente / stats.totalProducts) * 352 : 0} 352`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {stats.productsByStatus.pendiente.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Sin Vencimiento</p>
            <p className="text-xs text-gray-500">
              {stats.totalProducts > 0 
                ? `${((stats.productsByStatus.pendiente / stats.totalProducts) * 100).toFixed(1)}%`
                : '0%'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}