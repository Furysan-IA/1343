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
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCuit } from '../utils/formatters';

interface Client {
  cuit: number;
  razon_social: string;
  direccion: string;
  email: string;
  created_at: string;
  updated_at: string;
  telefono: string | null;
  contacto: string | null;
  estado?: 'completo' | 'incompleto';
  camposFaltantes?: string[];
  errores?: string[];
  product_count?: number;
}

export function ClientManagement() {
  const { t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    razon_social: '',
    cuit: '',
    direccion: '',
    telefono: '',
    email: '',
    contacto: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchQuery]);

  const fetchClients = async () => {
    try {
      // Cargar clientes
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('razon_social');

      if (error) throw error;
      
      // Cargar productos para contar por cliente
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('cuit');

      if (productsError) throw productsError;

      // Contar productos por CUIT
      const productCounts: Record<number, number> = {};
      (products || []).forEach(product => {
        productCounts[product.cuit] = (productCounts[product.cuit] || 0) + 1;
      });
      
      // Agregar contador de productos a cada cliente
      const clientsWithProductCount = (data || []).map(client => {
        return {
          ...client,
          product_count: productCounts[client.cuit] || 0
        };
      });
      
      setClients(clientsWithProductCount);
      setLastSync(new Date());
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  const syncWithSupabase = async () => {
    setSyncing(true);
    try {
      await fetchClients();
      toast.success('Sincronización completada');
    } catch (error) {
      toast.error('Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const filterClients = () => {
    if (!searchQuery) {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter(client => 
      client.razon_social.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(client.cuit).includes(searchQuery) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredClients(filtered);
  };

  const getClientStatus = (client: Client) => {
    const requiredFields = ['razon_social', 'cuit', 'direccion', 'telefono', 'email'];
    const missingFields: string[] = [];
    
    requiredFields.forEach(field => {
      const value = client[field as keyof Client];
      // Verificar que el campo existe y no está vacío
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingClient) {
        // Actualizar cliente existente
        const { error } = await supabase
          .from('clients')
          .update({
            razon_social: formData.razon_social,
            cuit: Number(formData.cuit),
            direccion: formData.direccion,
            telefono: formData.telefono || null,
            email: formData.email,
            contacto: formData.contacto || null,
            updated_at: new Date().toISOString()
          })
          .eq('cuit', editingClient.cuit);

        if (error) throw error;
        toast.success('Cliente actualizado correctamente');
      } else {
        // Crear nuevo cliente
        const { error } = await supabase
          .from('clients')
          .insert({
            razon_social: formData.razon_social,
            cuit: Number(formData.cuit),
            direccion: formData.direccion,
            telefono: formData.telefono || null,
            email: formData.email,
            contacto: formData.contacto || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
        toast.success('Cliente creado correctamente');
      }

      // Cerrar modal y refrescar
      setShowModal(false);
      setEditingClient(null);
      setFormData({
        razon_social: '',
        cuit: '',
        direccion: '',
        telefono: '',
        email: '',
        contacto: ''
      });
      await fetchClients();
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast.error(error.message || 'Error al guardar el cliente');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      razon_social: client.razon_social,
      cuit: String(client.cuit),
      direccion: client.direccion,
      telefono: client.telefono || '',
      email: client.email,
      contacto: client.contacto || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (cuit: number) => {
    if (!confirm('¿Está seguro de eliminar este cliente?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('cuit', cuit);

      if (error) throw error;

      toast.success('Cliente eliminado correctamente');
      await fetchClients();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error('Error al eliminar el cliente');
    }
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
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">{t('clientManagement')}</h2>
            <p className="opacity-90">Total de clientes: {clients.length}</p>
          </div>
          <Users className="w-12 h-12 opacity-80" />
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
                placeholder="Buscar por razón social, CUIT o email..."
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

          <button
            onClick={() => {
              setEditingClient(null);
              setFormData({
                razon_social: '',
                cuit: '',
                direccion: '',
                telefono: '',
                email: '',
                contacto: ''
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        </div>

        {/* Indicador de última sincronización */}
        {lastSync && (
          <p className="mt-3 text-sm text-gray-500">
            Última sincronización: {lastSync.toLocaleTimeString('es-AR')}
          </p>
        )}
      </div>

      {/* Tabla de clientes */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Razón Social
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CUIT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
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
              {filteredClients.map((client) => {
                const status = getClientStatus(client);
                const Icon = status.icon;
                
                return (
                  <tr 
                    key={client.cuit} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEdit(client)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {client.razon_social}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {client.contacto && (
                          <span className="text-sm text-gray-500">{client.contacto}</span>
                        )}
                        {client.product_count && client.product_count > 0 && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            {client.product_count} productos
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCuit(client.cuit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.telefono || ''}
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
                            handleEdit(client);
                          }}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(client.cuit);
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

          {filteredClients.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron clientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingClient(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    value={formData.razon_social}
                    onChange={(e) => setFormData(prev => ({ ...prev, razon_social: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CUIT *
                  </label>
                  <input
                    type="text"
                    value={formData.cuit}
                    onChange={(e) => setFormData(prev => ({ ...prev, cuit: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="20123456789"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contacto
                  </label>
                  <input
                    type="text"
                    value={formData.contacto}
                    onChange={(e) => setFormData(prev => ({ ...prev, contacto: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingClient(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {editingClient ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}