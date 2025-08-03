import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { StatusBadge } from '../components/Common/StatusBadge';
import { 
  Upload, 
  RefreshCw, 
  Search, 
  Download,
  Filter,
  Plus,
  Users,
  AlertCircle,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Package,
  Phone,
  Mail,
  MapPin,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface Client {
  cuit: number;
  razon_social: string;
  direccion: string;
  email: string;
  telefono?: string;
  created_at: string;
  updated_at: string;
  estado?: 'completo' | 'incompleto' | 'con_errores';
}

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
  const [expandedClient, setExpandedClient] = useState<number | null>(null);
  const [editingClient, setEditingClient] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [clientProducts, setClientProducts] = useState<Record<number, Product[]>>({});
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [showSyncResult, setShowSyncResult] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const validateClient = (client: Client): 'completo' | 'incompleto' | 'con_errores' => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Verificar si hay errores críticos
    if (!emailRegex.test(client.email)) {
      return 'con_errores';
    }
    
    if (String(client.cuit).length !== 11) {
      return 'con_errores';
    }
    
    // Verificar si está incompleto
    if (!client.telefono || client.telefono.trim() === '') {
      return 'incompleto';
    }
    
    // Si no es una razón social válida
    if (!client.razon_social || client.razon_social.trim().length < 3) {
      return 'con_errores';
    }
    
    return 'completo';
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('razon_social', { ascending: true });

      if (error) throw error;
      
      // Agregar estado a cada cliente basado en validación
      const clientsWithStatus = (data || []).map(client => ({
        ...client,
        estado: validateClient(client)
      }));
      
      setClients(clientsWithStatus);
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
    setSyncing(true);
    setShowSyncResult(false);
    
    try {
      // Simular sincronización con base de datos externa
      // En producción, aquí se llamaría a la API o servicio externo
      
      const result: SyncResult = {
        total: 0,
        nuevos: 0,
        actualizados: 0,
        conErrores: 0,
        sinCambios: 0
      };

      // Aquí iría la lógica real de sincronización
      // Por ahora solo refrescamos los datos
      await fetchClients();
      
      // Simular resultado (en producción vendría del proceso real)
      result.total = clients.length;
      result.sinCambios = clients.filter(c => c.estado === 'completo').length;
      result.conErrores = clients.filter(c => c.estado === 'con_errores').length;
      
      setLastSyncResult(result);
      setShowSyncResult(true);
      
      toast.success('Sincronización completada');
      
      // Ocultar resultado después de 10 segundos
      setTimeout(() => {
        setShowSyncResult(false);
      }, 10000);
      
    } catch (error: any) {
      toast.error(`Error al sincronizar: ${error.message}`);
    } finally {
      setSyncing(false);
    }
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

  const handleSave = async (cuit: number) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          ...editForm,
          updated_at: new Date().toISOString()
        })
        .eq('cuit', cuit);

      if (error) throw error;

      toast.success('Cliente actualizado correctamente');
      setEditingClient(null);
      fetchClients();
    } catch (error: any) {
      toast.error(`Error al actualizar cliente: ${error.message}`);
    }
  };

  const handleCancel = () => {
    setEditingClient(null);
    setEditForm({});
  };

  const toggleClientExpansion = async (cuit: number) => {
    if (expandedClient === cuit) {
      setExpandedClient(null);
    } else {
      setExpandedClient(cuit);
      if (!clientProducts[cuit]) {
        await fetchClientProducts(cuit);
      }
    }
  };

  const getStatusBadge = (estado: 'completo' | 'incompleto' | 'con_errores' | undefined) => {
    switch (estado) {
      case 'completo':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completo
          </span>
        );
      case 'incompleto':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Falta información
          </span>
        );
      case 'con_errores':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Requiere revisión
          </span>
        );
      default:
        return null;
    }
  };

  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.razon_social.toLowerCase().includes(searchLower) ||
      String(client.cuit).includes(searchTerm) ||
      client.email.toLowerCase().includes(searchLower) ||
      client.direccion.toLowerCase().includes(searchLower) ||
      (client.telefono && client.telefono.toLowerCase().includes(searchLower))
    );
  });

  // Estadísticas
  const stats = {
    total: clients.length,
    completos: clients.filter(c => c.estado === 'completo').length,
    incompletos: clients.filter(c => c.estado === 'incompleto').length,
    conErrores: clients.filter(c => c.estado === 'con_errores').length
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
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar con Base
          </button>
        </div>
      </div>

      {/* Sync Result Alert */}
      {showSyncResult && lastSyncResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <Info className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                Resultado de Sincronización
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>• Total procesados: {lastSyncResult.total}</p>
                <p>• Nuevos clientes: {lastSyncResult.nuevos}</p>
                <p>• Actualizados: {lastSyncResult.actualizados}</p>
                <p>• Con errores: {lastSyncResult.conErrores}</p>
                <p>• Sin cambios: {lastSyncResult.sinCambios}</p>
              </div>
            </div>
            <button
              onClick={() => setShowSyncResult(false)}
              className="ml-3 text-blue-400 hover:text-blue-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-gray-400" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Clientes</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">{stats.completos}</p>
              <p className="text-sm text-gray-500">Completos</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-yellow-400" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">{stats.incompletos}</p>
              <p className="text-sm text-gray-500">Incompletos</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">{stats.conErrores}</p>
              <p className="text-sm text-gray-500">Con Errores</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-6">
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
            placeholder="Buscar por razón social, CUIT, email, dirección o teléfono..."
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredClients.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredClients.map((client) => (
              <li key={client.cuit}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <button
                        onClick={() => toggleClientExpansion(client.cuit)}
                        className="p-1 hover:bg-gray-100 rounded-full mr-3 transition-colors"
                      >
                        {expandedClient === client.cuit ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        {editingClient === client.cuit ? (
                          // Edit Mode
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Razón Social
                              </label>
                              <input
                                type="text"
                                value={editForm.razon_social || ''}
                                onChange={(e) => setEditForm({ ...editForm, razon_social: e.target.value })}
                                className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Email
                              </label>
                              <input
                                type="email"
                                value={editForm.email || ''}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Dirección
                              </label>
                              <input
                                type="text"
                                value={editForm.direccion || ''}
                                onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })}
                                className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Teléfono
                              </label>
                              <input
                                type="text"
                                value={editForm.telefono || ''}
                                onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                                className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Agregar teléfono"
                              />
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div>
                            <div className="flex items-center space-x-3">
                              <p className="text-sm font-medium text-gray-900">
                                {client.razon_social}
                              </p>
                              <span className="text-sm text-gray-500">
                                CUIT: {client.cuit}
                              </span>
                              {getStatusBadge(client.estado)}
                            </div>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{client.email}</span>
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{client.direccion}</span>
                              </div>
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" />
                                <span className="truncate">
                                  {client.telefono || (
                                    <span className="text-gray-400 italic">Sin teléfono</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4 flex items-center space-x-2">
                      {editingClient === client.cuit ? (
                        <>
                          <button
                            onClick={() => handleSave(client.cuit)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                            title="Guardar cambios"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEdit(client)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                          title="Editar cliente"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded Content - Products */}
                  {expandedClient === client.cuit && (
                    <div className="mt-4 pl-9">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <Package className="h-4 w-4 mr-2" />
                          Productos Asociados
                        </h4>
                        
                        {clientProducts[client.cuit] && clientProducts[client.cuit].length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {clientProducts[client.cuit].map((product) => (
                              <div key={product.codificacion} className="bg-white p-3 rounded border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {product.producto || product.codificacion}
                                    </p>
                                    {product.caracteristicas_tecnicas && (
                                      <p className="text-xs text-gray-500 mt-1 truncate">
                                        {product.caracteristicas_tecnicas}
                                      </p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                      Código: {product.codificacion}
                                    </p>
                                  </div>
                                  <div className="ml-2 flex-shrink-0">
                                    <StatusBadge status={product.djc_status} type="djc" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            No hay productos asociados a este cliente
                          </p>
                        )}
                      </div>
                      
                      {/* Client Timestamps */}
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <span>
                          Creado: {format(new Date(client.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </span>
                        {client.updated_at !== client.created_at && (
                          <span>
                            Última actualización: {format(new Date(client.updated_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? 'No se encontraron clientes' : 'No hay clientes en la base de datos'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda' 
                : 'Los clientes aparecerán aquí después de ser procesados y validados'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}