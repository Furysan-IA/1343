// Dashboard.tsx - Actualizado con datos reales y estadísticas mejoradas
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Database } from '../lib/supabase';
import { 
  Package, Users, CheckCircle, AlertCircle, 
  FileText, QrCode, Calendar, TrendingUp,
  Activity, Shield, Award, Clock
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
      // Obtener todos los productos
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*');

      if (productsError) throw productsError;

      // Obtener clientes
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*');

      if (clientsError) throw clientsError;

      // Calcular estadísticas
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const stats: DashboardStats = {
        totalClients: clients?.length || 0,
        totalProducts: products?.length || 0,
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

      // Procesar productos
      products?.forEach(product => {
        // QR
        if (product.qr_path) {
          stats.productsWithQR++;
        } else {
          stats.productsWithoutQR++;
        }

        // DJC
        if (product.djc_path) {
          stats.productsWithDJC++;
        } else {
          stats.productsWithoutDJC++;
        }

        // Estado de vencimiento
        if (!product.vencimiento) {
          stats.productsByStatus.pendiente++;
        } else {
          const vencimiento = new Date(product.vencimiento);
          if (vencimiento < now) {
            stats.expiredProducts++;
            stats.productsByStatus.vencido++;
          } else {
            stats.activeProducts++;
            stats.productsByStatus.vigente++;
            
            // Productos próximos a vencer (30 días)
            if (vencimiento <= thirtyDaysFromNow) {
              stats.expiringProducts++;
              stats.expiringProductsList.push(product);
            }
          }
        }
      });

      // Productos recientes (últimos 5)
      stats.recentProducts = products
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5) || [];

      // Ordenar productos próximos a vencer
      stats.expiringProductsList.sort((a, b) => 
        new Date(a.vencimiento!).getTime() - new Date(b.vencimiento!).getTime()
      );

      setStats(stats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    onClick,
    subtitle 
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    color: string;
    onClick?: () => void;
    subtitle?: string;
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
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

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
        <h1 className="text-2xl font-bold mb-2">{t('welcome')}</h1>
        <p className="opacity-90">Resumen de tu sistema de gestión</p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clientes"
          value={stats.totalClients}
          icon={Users}
          color="bg-blue-500"
          onClick={() => navigate('/clients')}
        />
        <StatCard
          title="Total Productos"
          value={stats.totalProducts}
          icon={Package}
          color="bg-purple-500"
          onClick={() => navigate('/products')}
        />
        <StatCard
          title="Productos Vigentes"
          value={stats.activeProducts}
          icon={CheckCircle}
          color="bg-green-500"
          onClick={() => navigate('/products')}
        />
        <StatCard
          title="Productos Vencidos"
          value={stats.expiredProducts}
          icon={AlertCircle}
          color="bg-red-500"
          onClick={() => navigate('/products')}
        />
      </div>

      {/* Segunda fila de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Productos con QR"
          value={stats.productsWithQR}
          icon={QrCode}
          color="bg-indigo-500"
          subtitle={`${stats.productsWithoutQR} sin QR`}
        />
        <StatCard
          title="Productos con DJC"
          value={stats.productsWithDJC}
          icon={FileText}
          color="bg-orange-500"
          subtitle={`${stats.productsWithoutDJC} sin DJC`}
        />
        <StatCard
          title="Por vencer (30 días)"
          value={stats.expiringProducts}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatCard
          title="Sin vencimiento"
          value={stats.productsByStatus.pendiente}
          icon={Calendar}
          color="bg-gray-500"
        />
      </div>

      {/* Contenido en dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos próximos a vencer */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Productos Próximos a Vencer
          </h2>
          {stats.expiringProductsList.length > 0 ? (
            <div className="space-y-3">
              {stats.expiringProductsList.slice(0, 5).map((product) => {
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
                    <div>
                      <p className="font-medium">{product.producto || 'Sin nombre'}</p>
                      <p className="text-sm text-gray-600">
                        {product.marca} - {product.codificacion}
                      </p>
                    </div>
                    <div className="text-right">
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
              {stats.expiringProductsList.length > 5 && (
                <button
                  onClick={() => navigate('/products')}
                  className="w-full text-center text-sm text-purple-600 hover:text-purple-800 mt-2"
                >
                  Ver todos ({stats.expiringProductsList.length})
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
          {stats.recentProducts.length > 0 ? (
            <div className="space-y-3">
              {stats.recentProducts.map((product) => (
                <div
                  key={product.codificacion}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => navigate('/products')}
                >
                  <div>
                    <p className="font-medium">{product.producto || 'Sin nombre'}</p>
                    <p className="text-sm text-gray-600">
                      {product.marca} - {product.codificacion}
                    </p>
                  </div>
                  <div className="text-right">
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
                <span className="text-2xl font-bold">{stats.productsByStatus.vigente}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Vigentes</p>
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
                <span className="text-2xl font-bold">{stats.productsByStatus.vencido}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Vencidos</p>
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
                <span className="text-2xl font-bold">{stats.productsByStatus.pendiente}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Sin Vencimiento</p>
          </div>
        </div>
      </div>
    </div>
  );
}