import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { 
  BarChart3, 
  Package, 
  Users, 
  FileText,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Activity
} from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  totalClients: number;
  pendingDJCs: number;
  errorLogs: number;
  expiringProducts: number;
  expiredProducts: number;
}

export function Dashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalClients: 0,
    pendingDJCs: 0,
    errorLogs: 0,
    expiringProducts: 0,
    expiredProducts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Get total products
      const { count: productsCount } = await supabase
        .from('products')
        .select('codificacion', { count: 'exact' });

      // Get total clients
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('cuit', { count: 'exact' });

      // Get pending DJCs
      const { count: pendingDJCsCount } = await supabase
        .from('products')
        .select('codificacion', { count: 'exact' })
        .eq('djc_status', 'No Generada');

      // Get error logs from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: errorLogsCount } = await supabase
        .from('logs')
        .select('id', { count: 'exact' })
        .gte('timestamp', sevenDaysAgo.toISOString());

      // Get expiring products (next 30 days)
      const { count: expiringCount } = await supabase
        .from('products')
        .select('codificacion', { count: 'exact' })
        .gte('dias_para_vencer', 0)
        .lte('dias_para_vencer', 30);

      // Get expired products
      const { count: expiredCount } = await supabase
        .from('products')
        .select('codificacion', { count: 'exact' })
        .lt('dias_para_vencer', 0);

      setStats({
        totalProducts: productsCount || 0,
        totalClients: clientsCount || 0,
        pendingDJCs: pendingDJCsCount || 0,
        errorLogs: errorLogsCount || 0,
        expiringProducts: expiringCount || 0,
        expiredProducts: expiredCount || 0,
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      name: t('totalProducts'),
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      name: t('totalClients'),
      value: stats.totalClients,
      icon: Users,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      name: t('pendingDJCs'),
      value: stats.pendingDJCs,
      icon: FileText,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
    },
    {
      name: t('errorLogs'),
      value: stats.errorLogs,
      icon: AlertTriangle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
    },
    {
      name: 'Próximos a Vencer',
      value: stats.expiringProducts,
      icon: Calendar,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      name: 'Productos Vencidos',
      value: stats.expiredProducts,
      icon: TrendingUp,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          {t('dashboard')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Resumen general del sistema de gestión de certificados y DJC
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-md ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center mb-4">
            <Activity className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {t('recentActivity')}
            </h3>
          </div>
          <div className="text-center py-8">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Actividad reciente
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Aquí se mostrará la actividad reciente del sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}