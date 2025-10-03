// ClientManagement.tsx - Versión con personalización de columnas
import { useState, useEffect, Fragment } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Database } from '../lib/supabase';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { StatusBadge } from '../components/Common/StatusBadge';
import { Dialog, Transition } from '@headlessui/react';
import { RefreshCw, Search, Users, CircleAlert as AlertCircle, CreditCard as Edit2, Save, X, Package, Phone, Mail, MapPin, Building2, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Info, Eye, ListFilter as Filter, Calendar, FileText, Clock, ExternalLink, Plus, Trash2, CircleCheck as CheckCircle, GripVertical, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCuit } from '../utils/formatters';

interface Client {
  cuit: number;
  razon_social: string;
  direccion: string;
  direccion_planta?: string | null;
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

interface ColumnConfig {
  id: string;
  label: string;
  accessor: (client: Client) => any;
  isVisible: boolean;
  align?: 'left' | 'right' | 'center';
  isDraggable: boolean;
  width?: string;
  render: (client: Client) => React.ReactNode;
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
  
  // Estados para personalización de columnas
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    razon_social: '',
    cuit: '',
    direccion: '',
    direccion_planta: '',
    usarDireccionLegal: true,
    telefono: '',
    email: '',
    contacto: ''
  });

  // Configuración por defecto de columnas
  const defaultColumns: ColumnConfig[] = [
    {
      id: 'razon_social',
      label: 'Razón Social',
      accessor: (client) => client.razon_social,
      isVisible: true,
      align: 'left',
      isDraggable: true,
      width: 'w-64',
      render: (client) => (
        <div className="min-w-0">
          <div 
            className="text-sm font-medium text-gray-900 break-words"
            title={client.razon_social}
          >
            {client.razon_social}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {client.contacto && (
              <span 
                className="text-sm text-gray-500 break-words"
                title={`Contacto: ${client.contacto}`}
              >
                {client.contacto}
              </span>
            )}
            {client.product_count && client.product_count > 0 && (
              <span 
                className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full"
                title={`${client.product_count} productos asociados`}
              >
                {client.product_count} productos
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'cuit',
      label: 'CUIT',
      accessor: (client) => client.cuit,
      isVisible: true,
      align: 'left',
      isDraggable: true,
      width: 'w-32',
      render: (client) => (
        <span 
          className="text-sm text-gray-900 font-mono break-words"
          title={`CUIT: ${formatCuit(client.cuit)}`}
        >
          {formatCuit(client.cuit)}
        </span>
      )
    },
    {
      id: 'email',
      label: 'Email',
      accessor: (client) => client.email,
      isVisible: true,
      align: 'left',
      isDraggable: true,
      width: 'w-48',
      render: (client) => (
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span 
            className="text-sm text-gray-900 break-words"
            title={client.email}
          >
            {client.email}
          </span>
        </div>
      )
    },
    {
      id: 'telefono',
      label: 'Teléfono',
      accessor: (client) => client.telefono,
      isVisible: true,
      align: 'left',
      isDraggable: true,
      width: 'w-32',
      render: (client) => (
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span 
            className="text-sm text-gray-900 break-words"
            title={client.telefono || 'Sin teléfono'}
          >
            {client.telefono || <span className="text-gray-400 italic">-</span>}
          </span>
        </div>
      )
    },
    {
      id: 'direccion',
      label: 'Dirección',
      accessor: (client) => client.direccion,
      isVisible: false,
      align: 'left',
      isDraggable: true,
      width: 'w-64',
      render: (client) => (
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <span 
            className="text-sm text-gray-900 break-words"
            title={client.direccion}
          >
            {client.direccion.length > 50 
              ? `${client.direccion.substring(0, 50)}...`
              : client.direccion
            }
          </span>
        </div>
      )
    },
    {
      id: 'contacto',
      label: 'Contacto',
      accessor: (client) => client.contacto,
      isVisible: false,
      align: 'left',
      isDraggable: true,
      width: 'w-40',
      render: (client) => (
        <span 
          className="text-sm text-gray-900 break-words"
          title={client.contacto || 'Sin contacto especificado'}
        >
          {client.contacto || <span className="text-gray-400 italic">-</span>}
        </span>
      )
    },
    {
      id: 'estado',
      label: 'Estado',
      accessor: (client) => getClientStatus(client).status,
      isVisible: true,
      align: 'center',
      isDraggable: true,
      width: 'w-36',
      render: (client) => {
        const status = getClientStatus(client);
        const Icon = status.icon;
        return (
          <div className="flex items-center justify-center gap-2">
            <Icon className={`w-4 h-4 ${status.color}`} />
            <span 
              className={`px-2 py-1 text-xs rounded-full ${status.bgColor} ${status.color} break-words`}
              title={`Estado: ${status.status}${status.missingFields.length > 0 ? ` - Faltan: ${status.missingFields.join(', ')}` : ''}`}
            >
              {status.status}
            </span>
          </div>
        );
      }
    },
    {
      id: 'productos',
      label: 'Productos',
      accessor: (client) => client.product_count || 0,
      isVisible: true,
      align: 'center',
      isDraggable: true,
      width: 'w-24',
      render: (client) => (
        <div className="flex items-center justify-center gap-2">
          <Package className="w-4 h-4 text-gray-400" />
          <span 
            className="text-sm font-medium text-gray-900"
            title={`${client.product_count || 0} productos asociados`}
          >
            {client.product_count || 0}
          </span>
        </div>
      )
    },
    {
      id: 'fechas',
      label: 'Fechas',
      accessor: (client) => client.created_at,
      isVisible: false,
      align: 'center',
      isDraggable: true,
      width: 'w-32',
      render: (client) => (
        <div className="text-xs text-gray-500">
          <div 
            className="flex items-center gap-1"
            title={`Creado: ${new Date(client.created_at).toLocaleString('es-AR')}`}
          >
            <Calendar className="w-3 h-3" />
            {new Date(client.created_at).toLocaleDateString('es-AR')}
          </div>
          {client.updated_at !== client.created_at && (
            <div 
              className="flex items-center gap-1 mt-1"
              title={`Actualizado: ${new Date(client.updated_at).toLocaleString('es-AR')}`}
            >
              <Clock className="w-3 h-3" />
              {new Date(client.updated_at).toLocaleDateString('es-AR')}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'acciones',
      label: 'Acciones',
      accessor: () => null,
      isVisible: true,
      align: 'center',
      isDraggable: false,
      width: 'w-24',
      render: (client) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(client);
            }}
            className="text-purple-600 hover:text-purple-800 p-1 rounded hover:bg-purple-50 transition-colors"
            title="Editar cliente"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(client.cuit);
            }}
            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
            title="Eliminar cliente"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  // Estado de configuración de columnas
  const [columnOrder, setColumnOrder] = useState<ColumnConfig[]>(() => {
    const savedOrder = localStorage.getItem('clientManagementColumnOrder');
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        // Verificar que la configuración guardada tenga la estructura correcta
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
          // Combinar configuración guardada con configuración por defecto para nuevas columnas
          const mergedColumns = defaultColumns.map(defaultCol => {
            const savedCol = parsed.find((col: any) => col.id === defaultCol.id);
            return savedCol ? { ...defaultCol, ...savedCol, render: defaultCol.render } : defaultCol;
          });
          return mergedColumns;
        }
      } catch (error) {
        console.error('Error parsing saved column order:', error);
      }
    }
    return defaultColumns;
  });

  // Guardar configuración de columnas en localStorage
  useEffect(() => {
    const configToSave = columnOrder.map(col => ({
      id: col.id,
      label: col.label,
      isVisible: col.isVisible,
      align: col.align,
      isDraggable: col.isDraggable,
      width: col.width
    }));
    localStorage.setItem('clientManagementColumnOrder', JSON.stringify(configToSave));
  }, [columnOrder]);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchQuery]);

  // Funciones de drag and drop para columnas
  const onDragStart = (e: React.DragEvent<HTMLTableCellElement>, columnId: string) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);
  };

  const onDragOver = (e: React.DragEvent<HTMLTableCellElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDragEnter = (e: React.DragEvent<HTMLTableCellElement>, columnId: string) => {
    e.preventDefault();
    setDragOverColumnId(columnId);
  };

  const onDragLeave = (e: React.DragEvent<HTMLTableCellElement>) => {
    e.preventDefault();
    setDragOverColumnId(null);
  };

  const onDrop = (e: React.DragEvent<HTMLTableCellElement>, targetColumnId: string) => {
    e.preventDefault();
    
    if (!draggedColumnId || draggedColumnId === targetColumnId) {
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      return;
    }

    const newColumnOrder = [...columnOrder];
    const draggedIndex = newColumnOrder.findIndex(col => col.id === draggedColumnId);
    const targetIndex = newColumnOrder.findIndex(col => col.id === targetColumnId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      return;
    }

    // Mover el elemento arrastrado a la nueva posición
    const [removed] = newColumnOrder.splice(draggedIndex, 1);
    newColumnOrder.splice(targetIndex, 0, removed);

    setColumnOrder(newColumnOrder);
    setDraggedColumnId(null);
    setDragOverColumnId(null);
    
    toast.success('Orden de columnas actualizado');
  };

  const onDragEnd = () => {
    setDraggedColumnId(null);
    setDragOverColumnId(null);
  };

  // Función para alternar visibilidad de columna
  const toggleColumnVisibility = (columnId: string) => {
    setColumnOrder(prev => 
      prev.map(col => 
        col.id === columnId 
          ? { ...col, isVisible: !col.isVisible }
          : col
      )
    );
  };

  // Función para resetear configuración de columnas
  const resetColumnOrder = () => {
    setColumnOrder(defaultColumns);
    toast.success('Configuración de columnas restablecida');
  };

  const fetchClients = async () => {
    try {
      // Cargar clientes
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('razon_social');

      if (error) throw error;
      
      // Cargar productos para contar por cliente - en lotes
      const allProducts: any[] = [];
      const batchSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: batchData, error: productsError } = await supabase
          .from('products')
          .select('cuit')
          .range(from, from + batchSize - 1);

        if (productsError) throw productsError;

        if (batchData && batchData.length > 0) {
          allProducts.push(...batchData);
          hasMore = batchData.length === batchSize;
          from += batchSize;
        } else {
          hasMore = false;
        }
      }

      const products = allProducts;

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
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.contacto && client.contacto.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.telefono && client.telefono.includes(searchQuery))
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
            direccion_planta: formData.usarDireccionLegal ? null : (formData.direccion_planta || null),
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
            direccion_planta: formData.usarDireccionLegal ? null : (formData.direccion_planta || null),
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
        direccion_planta: '',
        usarDireccionLegal: true,
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
      direccion_planta: client.direccion_planta || '',
      usarDireccionLegal: !client.direccion_planta,
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

  const visibleColumns = columnOrder.filter(col => col.isVisible);

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
                placeholder="Buscar por razón social, CUIT, email, contacto o teléfono..."
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
          <p className="mt-3 text-sm text-gray-500 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Última sincronización: {lastSync.toLocaleTimeString('es-AR')}
          </p>
        )}
      </div>

      {/* Configuración de columnas */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Configuración de Columnas</h3>
          <button
            onClick={resetColumnOrder}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Restablecer
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {columnOrder.map((column) => (
            <label
              key={column.id}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={column.isVisible}
                onChange={() => toggleColumnVisibility(column.id)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm text-gray-700">{column.label}</span>
              {column.isDraggable && (
                <GripVertical className="w-4 h-4 text-gray-400" />
              )}
            </label>
          ))}
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Arrastra los encabezados de las columnas para reordenarlas. Usa las casillas para mostrar/ocultar columnas.
        </p>
      </div>

      {/* Tabla de clientes */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {visibleColumns.map((column) => (
                  <th
                    key={column.id}
                    className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-move select-none transition-colors ${
                      column.align === 'center' ? 'text-center' :
                      column.align === 'right' ? 'text-right' : 'text-left'
                    } ${column.width || 'w-auto'} ${
                      draggedColumnId === column.id ? 'opacity-50' : ''
                    } ${
                      dragOverColumnId === column.id ? 'bg-purple-100' : ''
                    }`}
                    draggable={column.isDraggable}
                    onDragStart={(e) => column.isDraggable && onDragStart(e, column.id)}
                    onDragOver={onDragOver}
                    onDragEnter={(e) => onDragEnter(e, column.id)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, column.id)}
                    onDragEnd={onDragEnd}
                    title={column.isDraggable ? `Arrastra para reordenar: ${column.label}` : column.label}
                  >
                    <div className="flex items-center gap-1">
                      {column.isDraggable && (
                        <GripVertical className="w-3 h-3 text-gray-400" />
                      )}
                      {column.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr 
                  key={client.cuit} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleEdit(client)}
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={`${client.cuit}-${column.id}`}
                      className={`px-4 py-4 text-sm ${
                        column.align === 'center' ? 'text-center' :
                        column.align === 'right' ? 'text-right' : 'text-left'
                      } ${column.width || 'w-auto'} max-w-xs`}
                    >
                      {column.render(client)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredClients.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery 
                  ? 'No se encontraron clientes con los filtros aplicados'
                  : 'No hay clientes para mostrar'
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-purple-600 hover:text-purple-800 text-sm"
                >
                  Limpiar filtros
                </button>
              )}
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
                    Dirección Legal *
                  </label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="usarDireccionLegal"
                      checked={formData.usarDireccionLegal}
                      onChange={(e) => setFormData(prev => ({ ...prev, usarDireccionLegal: e.target.checked }))}
                      className="rounded text-purple-600"
                    />
                    <label htmlFor="usarDireccionLegal" className="text-sm text-gray-700">
                      La dirección de planta/depósito es la misma que la dirección legal
                    </label>
                  </div>

                  {!formData.usarDireccionLegal && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dirección de Planta/Depósito
                      </label>
                      <input
                        type="text"
                        value={formData.direccion_planta}
                        onChange={(e) => setFormData(prev => ({ ...prev, direccion_planta: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="Ingrese la dirección de la planta o depósito"
                      />
                    </div>
                  )}
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