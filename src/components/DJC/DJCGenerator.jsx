import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Search, 
  FileText, 
  Download, 
  Eye, 
  List,
  CheckCircle,
  XCircle,
  AlertCircle,
  Database,
  Moon,
  Sun,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { djcService } from '../../services/djc.service';
import { formatCuit, generateDJCNumber, RESOLUCIONES } from '../../utils/djc';
import DJCPreview from './DJCPreview';
import toast from 'react-hot-toast';

export default function DJCGenerator() {
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Use auth context
  const { user } = useAuth();
  
  // Data states
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchCuit, setSearchCuit] = useState('');
  const [showCuitList, setShowCuitList] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [djcData, setDjcData] = useState(null);
  const [selectedResolucion, setSelectedResolucion] = useState('');

  useEffect(() => {
    // Load initial data
    loadClients();
  }, []);

  // API calls using djcService
  const loadClients = async () => {
    setLoading(true);
    try {
      const clientsData = await djcService.getClients();
      setClients(clientsData);
      
      // Show info if using demo data
      if (clientsData.length === 2 && clientsData[0].cuit === 30712345678) {
        toast('Usando datos de demostración', { icon: '💡' });
      }
    } catch (err) {
      console.error(err);
      setError('Error al cargar clientes');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (cuit) => {
    setLoading(true);
    try {
      const productsData = await djcService.getProductsByCuit(cuit);
      setProducts(productsData);
    } catch (err) {
      console.error(err);
      setError('Error al cargar productos');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const searchClient = () => {
    if (!searchCuit) {
      setError('Por favor ingrese un CUIT');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const client = clients.find(c => c.cuit.toString() === searchCuit.replace(/\D/g, ''));
    
    if (client) {
      setSelectedClient(client);
      loadProducts(client.cuit);
      setError('');
    } else {
      setError('No se encontró un cliente con ese CUIT');
      setSelectedClient(null);
      setProducts([]);
      setTimeout(() => setError(''), 3000);
    }
  };

  const generateDJC = () => {
    if (!selectedClient || !selectedProduct) {
      setError('Debe seleccionar un cliente y un producto');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!selectedResolucion) {
      setError('Debe seleccionar una resolución aplicable');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const djc = {
      resolucion: selectedResolucion,
      numero_djc: generateDJCNumber(),
      razon_social: selectedClient.razon_social || 'CAMPO NO ENCONTRADO',
      cuit: formatCuit(selectedClient.cuit),
      domicilio_legal: selectedClient.direccion || 'CAMPO NO ENCONTRADO',
      telefono: selectedClient.telefono || 'CAMPO NO ENCONTRADO',
      email: selectedClient.email || 'CAMPO NO ENCONTRADO',
      nombre_comercial: selectedProduct.marca || 'CAMPO NO ENCONTRADO',
      codigo_identificacion: selectedProduct.codificacion || 'CAMPO NO ENCONTRADO',
      fabricante_completo: selectedProduct.fabricante && selectedProduct.planta_fabricacion 
        ? `${selectedProduct.fabricante} - ${selectedProduct.planta_fabricacion}`
        : selectedProduct.fabricante || 'CAMPO NO ENCONTRADO',
      identificacion_producto: [
        selectedProduct.marca,
        selectedProduct.producto,
        selectedProduct.caracteristicas_tecnicas
      ].filter(Boolean).join(' - ') || 'CAMPO NO ENCONTRADO',
      normas_tecnicas: selectedProduct.normas_aplicacion || 'CAMPO NO ENCONTRADO',
      documento_evaluacion: selectedProduct.codificacion || 'CAMPO NO ENCONTRADO',
      enlace_declaracion: selectedProduct.qr_link || 'CAMPO NO ENCONTRADO',
      fecha_lugar: `Morón, ${new Date().toLocaleDateString('es-AR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })}`
    };

    setDjcData(djc);
    setShowPreview(true);
  };

  const theme = darkMode ? {
    bg: 'bg-gray-900',
    bgSecondary: 'bg-gray-800',
    bgHover: 'hover:bg-gray-700',
    text: 'text-gray-100',
    textSecondary: 'text-gray-400',
    border: 'border-gray-700',
    input: 'bg-gray-800 text-gray-100 border-gray-600 focus:border-blue-500',
    card: 'bg-gray-800 border-gray-700'
  } : {
    bg: 'bg-white',
    bgSecondary: 'bg-gray-50',
    bgHover: 'hover:bg-gray-100',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-gray-200',
    input: 'bg-white text-gray-900 border-gray-300 focus:border-blue-500',
    card: 'bg-white border-gray-200'
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      {/* Header */}
      <header className={`${theme.bgSecondary} border-b ${theme.border} sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-semibold ${theme.text}`}>Generador DJC</h1>
                <p className={`text-xs ${theme.textSecondary}`}>Sistema de Declaraciones</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${theme.bgHover} transition-colors`}
              >
                {darkMode ? 
                  <Sun className={`w-5 h-5 ${theme.textSecondary}`} /> : 
                  <Moon className={`w-5 h-5 ${theme.textSecondary}`} />
                }
              </button>

              {user && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className={`text-sm ${theme.text} hidden sm:block`}>{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Alerts */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center">
            <XCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
            <p className="text-sm text-green-500">{success}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Search Section */}
          <div className={`${theme.card} rounded-xl p-6 border ${theme.border}`}>
            <div className="flex items-center mb-6">
              <div className="bg-blue-500/10 p-2 rounded-lg mr-3">
                <Search className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className={`text-lg font-semibold ${theme.text}`}>Buscar Cliente</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Ingrese CUIT (ej: 30712345678)"
                value={searchCuit}
                onChange={(e) => setSearchCuit(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchClient()}
                className={`flex-1 px-4 py-2 rounded-lg ${theme.input} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
              />
              <button
                onClick={searchClient}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Buscar</span>
              </button>
              <button
                onClick={() => setShowCuitList(!showCuitList)}
                className={`px-4 py-2 ${theme.bgHover} ${theme.text} rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 border ${theme.border}`}
              >
                <List className="w-4 h-4" />
                <span>Lista</span>
              </button>
            </div>

            {showCuitList && (
              <div className={`mt-4 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'} rounded-lg p-4 max-h-60 overflow-y-auto`}>
                {clients.length === 0 ? (
                  <p className={`text-center ${theme.textSecondary}`}>No hay clientes disponibles</p>
                ) : (
                  clients.map((client) => (
                    <div
                      key={client.cuit}
                      onClick={() => {
                        setSelectedClient(client);
                        setSearchCuit(client.cuit.toString());
                        loadProducts(client.cuit);
                        setShowCuitList(false);
                      }}
                      className={`p-3 rounded-lg cursor-pointer ${theme.bgHover} transition-colors mb-2 last:mb-0`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`font-mono text-sm ${theme.text}`}>{formatCuit(client.cuit)}</span>
                        <span className={`text-sm ${theme.textSecondary}`}>{client.razon_social}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Client Info */}
          {selectedClient && (
            <div className={`${theme.card} rounded-xl p-6 border ${theme.border}`}>
              <div className="flex items-center mb-4">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                <h3 className={`text-lg font-semibold ${theme.text}`}>Cliente Seleccionado</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className={`text-sm ${theme.textSecondary}`}>Razón Social</p>
                  <p className={`${theme.text} font-medium`}>{selectedClient.razon_social}</p>
                </div>
                <div>
                  <p className={`text-sm ${theme.textSecondary}`}>CUIT</p>
                  <p className={`${theme.text} font-mono`}>{formatCuit(selectedClient.cuit)}</p>
                </div>
                <div>
                  <p className={`text-sm ${theme.textSecondary}`}>Email</p>
                  <p className={`${theme.text}`}>{selectedClient.email}</p>
                </div>
                <div>
                  <p className={`text-sm ${theme.textSecondary}`}>Teléfono</p>
                  <p className={selectedClient.telefono ? theme.text : 'text-red-500 font-semibold'}>
                    {selectedClient.telefono || 'CAMPO NO ENCONTRADO'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Products */}
          {products.length > 0 && (
            <div className={`${theme.card} rounded-xl p-6 border ${theme.border}`}>
              <div className="flex items-center mb-6">
                <div className="bg-indigo-500/10 p-2 rounded-lg mr-3">
                  <Database className="w-5 h-5 text-indigo-500" />
                </div>
                <h3 className={`text-lg font-semibold ${theme.text}`}>Productos Disponibles</h3>
              </div>
              <div className="space-y-3">
                {products.map((product) => (
                  <div
                    key={product.codificacion}
                    onClick={() => setSelectedProduct(product)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedProduct?.codificacion === product.codificacion
                        ? 'border-blue-500 bg-blue-500/10'
                        : `${theme.border} ${theme.bgHover}`
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className={`font-semibold ${theme.text}`}>{product.codificacion}</h4>
                        <p className={`text-sm ${theme.textSecondary} mt-1`}>
                          {product.marca} - {product.producto}
                        </p>
                        <p className={`text-xs ${theme.textSecondary} mt-2`}>
                          {product.caracteristicas_tecnicas}
                        </p>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${theme.textSecondary} flex-shrink-0 ml-4`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolution Selection */}
          {selectedClient && selectedProduct && (
            <div className={`${theme.card} rounded-xl p-6 border ${theme.border}`}>
              <div className="flex items-center mb-6">
                <div className="bg-purple-500/10 p-2 rounded-lg mr-3">
                  <FileText className="w-5 h-5 text-purple-500" />
                </div>
                <h3 className={`text-lg font-semibold ${theme.text}`}>Seleccionar Resolución Aplicable</h3>
              </div>
              <div className="space-y-3">
                {RESOLUCIONES.map((res) => (
                  <div
                    key={res.id}
                    onClick={() => setSelectedResolucion(res.codigo)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedResolucion === res.codigo
                        ? 'border-blue-500 bg-blue-500/10'
                        : `${theme.border} ${theme.bgHover}`
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                        selectedResolucion === res.codigo
                          ? 'border-blue-500 bg-blue-500'
                          : theme.border
                      }`}>
                        {selectedResolucion === res.codigo && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${theme.text}`}>{res.codigo}</p>
                        <p className={`text-sm ${theme.textSecondary}`}>{res.descripcion}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Button */}
          {selectedClient && selectedProduct && (
            <div className="flex justify-center">
              <button
                onClick={generateDJC}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-medium transition-all flex items-center space-x-3 shadow-lg"
              >
                <Eye className="w-5 h-5" />
                <span>Generar Vista Previa DJC</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Preview Modal */}
      {showPreview && djcData && (
        <DJCPreview 
          djcData={djcData} 
          onClose={() => setShowPreview(false)} 
        />
      )}
    </div>
  );
}