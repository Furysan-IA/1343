import { useState, useEffect, Fragment } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Database } from '../lib/supabase';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { StatusBadge } from '../components/Common/StatusBadge';
import { Dialog, Transition } from '@headlessui/react';
import { 
  RefreshCw, 
  Search, 
  Users,
  AlertCircle,
  Edit2,
  Save,
  X,
  Package,
  Phone,
  Mail,
  MapPin,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Eye,
  Filter,
  Calendar,
  FileText,
  Clock,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Client {
  cuit: number;
  razon_social: string;
  direccion: string;
  email: string;
  created_at: string;
  updated_at: string;
  estado?: 'completo' | 'incompleto';
  camposFaltantes?: string[];
  errores?: string[];
  product_count?: number;
}

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

interface SyncResult {
  total: number;
  nuevos: number;
  actualizados: number;
  conErrores: number;
  sinCambios: number;
}

export function ClientManagement() {
  const { t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'completos' | 'incompletos' | 'con_errores'>('todos');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [clientProducts, setClientProducts] = useState<Record<number, Product[]>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<number, Partial<Client>>>({});
  const [showSyncAlert, setShowSyncAlert] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (Object.keys(pendingChanges).length > 0) {
      setHasUnsavedChanges(true);
      setShowSyncAlert(true);
    } else {
      setHasUnsavedChanges(false);
      setShowSyncAlert(false);
    }
  }, [pendingChanges]);

  const validateClient = (client: Client): { 
    estado: 'completo' | 'incompleto',
    camposFaltantes: string[],
    errores: string[]
  } => {
    const camposFaltantes: string[] = [];
    
    // Verificar campos faltantes
    if (!client.razon_social || client.razon_social.trim() === '') {
      camposFaltantes.push('Razón Social');
    }
    
    if (!client.direccion || client.direccion.trim() === '') {
      camposFaltantes.push('Dirección');
    }
    
    if (!client.email || client.email.trim() === '') {
      camposFaltantes.push('Email');
    }
    
    const estado: 'completo' | 'incompleto' = camposFaltantes.length === 0 ? 'completo' : 'incompleto';
    
    return { estado, camposFaltantes, errores: [] };
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Cargar clientes
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('razon_social', { ascending: true });

      if (error) throw error;
      
      // Cargar productos para contar por cliente
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('cuit')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Contar productos por CUIT
      const productCounts: Record<number, number> = {};
      (productsData || []).forEach(product => {
        productCounts[product.cuit] = (productCounts[product.cuit] || 0) + 1;
      });
      
      // Agregar validación a cada cliente
      const clientsWithValidation = (data || []).map(client => {
        const validation = validateClient(client);
        return {
          ...client,
          estado: validation.estado,
          camposFaltantes: validation.camposFaltantes,
          errores: validation.errores,
          product_count: productCounts[client.cuit] || 0
        };
      });
      
      setClients(clientsWithValidation);
    } catch (error: any) {
      toast.error(`Error al cargar clientes: ${error.message}`);
      
      // Log error
      try {
        await supabase.rpc('log_error', {
          error_msg: `Failed to fetch clients: ${error.message}`,
          error_context: { section: 'Client Management', action: 'Fetch Clients' }
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchClientProducts = async (cuit: number) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('cuit', cuit)
        .order('producto', { ascending: true });

      if (error) throw error;
      
      setClientProducts(prev => ({
        ...prev,
        [cuit]: data || []
      }));
    } catch (error: any) {
      toast.error(`Error al cargar productos: ${error.message}`);
    }
  };

  const handleSync = async () => {
    if (hasUnsavedChanges) {
      const confirmSync = window.confirm(
        '¿Desea sincronizar con la base de datos? Se aplicarán todos los cambios pendientes.'
      );
      
      if (!confirmSync) return;
    }

    setSyncing(true);
    
    try {
      // Aplicar cambios pendientes
      for (const [cuit, changes] of Object.entries(pendingChanges)) {
        const { error } = await supabase
          .from('clients')
          .update({
            razon_social: changes.razon_social,
            direccion: changes.direccion,
            email: changes.email,
            telefono: changes.telefono,
            updated_at: new Date().toISOString()
          })
          .eq('cuit', Number(cuit));

        if (error) {
          toast.error(`Error al actualizar cliente ${cuit}: ${error.message}`);
          console.error('Error updating client:', error);
        }
      }
      
      // Limpiar cambios pendientes
      setPendingChanges({});
      setHasUnsavedChanges(false);
      setShowSyncAlert(false);
      
      // Recargar datos desde la base de datos
      await fetchClients();
      
      toast.success('Sincronización completada exitosamente');
    } catch (error: any) {
      toast.error(`Error al sincronizar: ${error.message}`);
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleClientClick = async (client: Client) => {
    setSelectedClient(client);
    if (!clientProducts[client.cuit]) {
      await fetchClientProducts(client.cuit);
    }
    setShowClientModal(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client.cuit);
    setEditForm({
      razon_social: client.razon_social,
      direccion: client.direccion,
      email: client.email,
      telefono: client.telefono || ''
    });
  };

  const handleSaveLocal = (cuit: number) => {
    // Buscar el cliente actual
    const currentClient = clients.find(c => c.cuit === cuit);
    if (!currentClient) return;
    
    // Crear cliente actualizado con los cambios del formulario
    const updatedClientData = {
      ...currentClient,
      ...editForm
    };
    
    // Validar el cliente actualizado
    const validation = validateClient(updatedClientData);
    
    // Guardar cambios pendientes
    setPendingChanges(prev => ({
      ...prev,
      [cuit]: editForm
    }));
    
    // Actualizar vista local con el cliente completo actualizado
    setClients(prev => prev.map(client => {
      if (client.cuit === cuit) {
        return {
          ...updatedClientData,
          estado: validation.estado,
          camposFaltantes: validation.camposFaltantes,
          errores: validation.errores
        };
      }
      return client;
    }));
    
    // Si estaba viendo el detalle del cliente, actualizar también
    if (selectedClient && selectedClient.cuit === cuit) {
      setSelectedClient({
        ...updatedClientData,
        estado: validation.estado,
        camposFaltantes: validation.camposFaltantes,
        errores: validation.errores
      });
    }
    
    setEditingClient(null);
    setEditForm({});
    toast.info('Cambios guardados localmente. Sincroniza para aplicar en la base de datos.');
  };

  const handleCancel = () => {
    setEditingClient(null);
    setEditForm({});
  };

  const filteredClients = clients.filter(client => {
    // Filtro por tipo
    if (filterType !== 'todos') {
      if (filterType === 'completos' && client.estado !== 'completo') return false;
      if (filterType === 'incompletos' && client.estado !== 'incompleto') return false;
      if (filterType === 'con_errores' && client.estado !== 'con_errores') return false;
    }
    
    // Filtro por búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        client.razon_social.toLowerCase().includes(searchLower) ||
        String(client.cuit).includes(searchTerm) ||
        client.email.toLowerCase().includes(searchLower) ||
        client.direccion.toLowerCase().includes(searchLower) ||
        (client.telefono && client.telefono.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  // Estadísticas
  const stats = {
    total: clients.length,
    completos: clients.filter(c => c.estado === 'completo').length,
    incompletos: clients.filter(c => c.estado === 'incompleto').length
  };

  const getCircularProgress = (value: number, total: number, color: string) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative">
        <svg className="transform -rotate-90 w-24 h-24">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-gray-500">{Math.round(percentage)}%</div>
          </div>
        </div>
      </div>
    );
  };

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
            {t('clientManagement')}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Base de datos de clientes y sus productos asociados
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 items-center space-x-4">
          {showSyncAlert && (
            <div className="flex items-center text-amber-600 text-sm">
              <AlertCircle className="h-4 w-4 mr-1" />
              Cambios pendientes
            </div>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              hasUnsavedChanges 
                ? 'bg-amber-600 hover:bg-amber-700 animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {hasUnsavedChanges ? 'Sincronizar Cambios' : 'Sincronizar con Base'}
          </button>
        </div>
      </div>

      {/* Sync Alert Banner */}
      {showSyncAlert && hasUnsavedChanges && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                Tienes cambios pendientes de sincronizar. Los datos modificados solo se guardarán en la base de datos cuando presiones "Sincronizar Cambios".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats with Circular Progress */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Clientes</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <Users className="h-10 w-10 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completos</p>
              {getCircularProgress(stats.completos, stats.total, '#10b981')}
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Incompletos</p>
              {getCircularProgress(stats.incompletos, stats.total, '#f59e0b')}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Cliente
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Buscar por cualquier campo..."
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Estado
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilterType('todos')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filterType === 'todos'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('completos')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filterType === 'completos'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Completos
              </button>
              <button
                onClick={() => setFilterType('incompletos')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filterType === 'incompletos'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Incompletos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredClients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
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
                {filteredClients.map((client) => (
                  <tr 
                    key={client.cuit} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleClientClick(client)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {client.razon_social}
                        </div>
                        <div className="text-sm text-gray-500">
                          CUIT: {client.cuit}
                        </div>
                        {client.product_count && client.product_count > 0 && (
                          <div className="text-xs text-purple-600 mt-1">
                            {client.product_count} productos asociados
                          </div>
                        )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{client.email}</div>
                      <div className="text-sm text-gray-500">
                        {client.telefono || 'Sin teléfono'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {client.estado === 'completo' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Completado
                        </span>
                      )}
                      {client.estado === 'incompleto' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Incompleto
                        </span>
                      )}
                      {pendingChanges[client.cuit] && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Modificado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(client);
                        }}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No se encontraron clientes
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterType !== 'todos' 
                ? 'Intenta cambiar los filtros aplicados' 
                : 'Los clientes aparecerán aquí después de ser procesados'}
            </p>
          </div>
        )}
      </div>

      {/* Client Detail Modal */}
      <Transition appear show={showClientModal} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setShowClientModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
                  {selectedClient && (
                    <>
                      <div className="bg-gray-50 px-6 py-4 border-b">
                        <div className="flex items-center justify-between">
                          <Dialog.Title className="text-lg font-medium text-gray-900">
                            Detalle del Cliente
                          </Dialog.Title>
                          <button
                            onClick={() => setShowClientModal(false)}
                            className="text-gray-400 hover:text-gray-500"
                          >
                            <X className="h-6 w-6" />
                          </button>
                        </div>
                      </div>

                      <div className="px-6 py-4">
                        {/* Client Info */}
                        <div className="bg-white rounded-lg border p-6 mb-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900">
                                {selectedClient.razon_social}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">
                                CUIT: {selectedClient.cuit}
                              </p>
                            </div>
                            {selectedClient.estado === 'completo' && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Completado
                              </span>
                            )}
                            {selectedClient.estado === 'incompleto' && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                Incompleto
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="flex items-center text-sm text-gray-600 mb-2">
                                <Mail className="h-4 w-4 mr-2" />
                                {selectedClient.email}
                              </div>
                              <div className="flex items-center text-sm text-gray-600 mb-2">
                                <Phone className="h-4 w-4 mr-2" />
                                {selectedClient.telefono || 'Sin teléfono'}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-start text-sm text-gray-600 mb-2">
                                <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                                {selectedClient.direccion}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="h-4 w-4 mr-2" />
                                Creado: {format(new Date(selectedClient.created_at), 'dd/MM/yyyy')}
                              </div>
                            </div>
                          </div>

                          {/* Validation Details */}
                          {selectedClient.camposFaltantes?.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">
                                  Información faltante:
                                </h4>
                                <ul className="list-disc list-inside text-sm text-yellow-600">
                                  {selectedClient.camposFaltantes.map((campo, index) => (
                                    <li key={index}>{campo}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Products Section */}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                            <Package className="h-5 w-5 mr-2" />
                            Productos Asociados
                          </h3>
                          
                          {clientProducts[selectedClient.cuit]?.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {clientProducts[selectedClient.cuit].map((product) => (
                                <div key={product.codificacion} className="bg-gray-50 rounded-lg p-4 border">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-900">
                                        {product.producto || product.codificacion}
                                      </h4>
                                      {product.caracteristicas_tecnicas && (
                                        <p className="text-sm text-gray-600 mt-1">
                                          {product.caracteristicas_tecnicas}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500 mt-2">
                                        Código: {product.codificacion}
                                      </p>
                                    </div>
                                    <StatusBadge status={product.djc_status} type="djc" />
                                  </div>
                                  <div className="mt-3 text-xs text-gray-500">
                                    Creado: {format(new Date(product.created_at), 'dd/MM/yyyy')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-lg">
                              <Package className="mx-auto h-12 w-12 text-gray-400" />
                              <p className="mt-2 text-sm text-gray-500">
                                No hay productos asociados a este cliente
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Edit Form Inline */}
      {editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Editar Cliente
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón Social
                </label>
                <input
                  type="text"
                  value={editForm.razon_social || ''}
                  onChange={(e) => setEditForm({ ...editForm, razon_social: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={editForm.direccion || ''}
                  onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={editForm.telefono || ''}
                  onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Agregar teléfono"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveLocal(editingClient)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}