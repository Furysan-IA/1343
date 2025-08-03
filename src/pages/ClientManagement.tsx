import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { parseExcelFile, parseClientData, validateClientHeaders } from '../utils/excelParser';
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
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface Client {
  cuit: number;
  razon_social: string;
  direccion: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export function ClientManagement() {
  const { t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
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
      if (!validateClientHeaders(headers)) {
        throw new Error('El archivo debe contener las columnas requeridas: RAZON_SOCIAL, CUIT, DIRECCION, EMAIL');
      }

      // Parse client data
      const parsedClients = parseClientData(data);
      
      if (parsedClients.length === 0) {
        throw new Error('No se encontraron clientes válidos en el archivo');
      }

      // Insert clients (ignore duplicates)
      for (const client of parsedClients) {
        try {
          const { error } = await supabase
            .from('clients')
            .upsert([client], { 
              onConflict: 'cuit',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error(`Error inserting client ${client.cuit}:`, error);
            
            // Log individual client error
            await supabase.rpc('log_error', {
              error_msg: `Failed to insert client ${client.cuit}: ${error.message}`,
              error_context: { 
                section: 'Client Management', 
                action: 'Excel Upload',
                client_cuit: client.cuit 
              }
            });
          }
        } catch (insertError: any) {
          console.error(`Failed to insert client ${client.cuit}:`, insertError);
        }
      }

      // Save backup of Excel file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `clients_${timestamp}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('excels')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Failed to backup Excel file:', uploadError);
      }

      toast.success(`Se procesaron ${parsedClients.length} clientes exitosamente`);
      fetchClients(); // Refresh the list

    } catch (error: any) {
      toast.error(`Error al procesar archivo: ${error.message}`);
      
      // Log error
      try {
        await supabase.rpc('log_error', {
          error_msg: `Excel upload failed: ${error.message}`,
          error_context: { section: 'Client Management', action: 'Excel Upload' }
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
      await fetchClients();
      toast.success('Datos sincronizados correctamente');
    } catch (error: any) {
      toast.error(`Error al sincronizar: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.razon_social.toLowerCase().includes(searchLower) ||
      String(client.cuit).includes(searchTerm) ||
      client.email.toLowerCase().includes(searchLower) ||
      client.direccion.toLowerCase().includes(searchLower)
    );
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
            {t('clientManagement')}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona clientes en el sistema
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

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="max-w-md">
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
              placeholder="Buscar por razón social, CUIT, email o dirección..."
            />
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Clientes ({filteredClients.length})
              </h3>
            </div>
          </div>
        </div>
        
        {filteredClients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('cuit')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('businessName')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('address')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('email')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Creación
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.cuit} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {client.cuit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.razon_social}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.direccion}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(client.created_at), 'dd/MM/yyyy', { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay clientes</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comienza subiendo un archivo Excel con los datos de clientes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}