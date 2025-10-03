import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCuit } from '../../utils/formatters';
import { CircleAlert as AlertCircle, Download, FileText, Search, User, Package, CircleCheck as CheckCircle, Circle as XCircle, Loader as Loader2, TriangleAlert as AlertTriangle, History, Trash2, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { DJCPreviewModal } from './DJCPreview';
import { DJCPdfGenerator } from '../../services/djcPdfGenerator.service';

interface Client {
  id: string;
  razon_social: string;
  cuit: string;
  direccion?: string;
  direccion_planta?: string;
  ciudad?: string;
  provincia?: string;
  telefono?: string;
  email?: string;
}

interface Product {
  id: string;
  codificacion: string;
  producto: string;
  marca?: string;
  modelo?: string;
  cuit: string;
  djc_status?: string;
  djc_path?: string;
  certificado_status?: string;
  titular?: string;
  origen?: string;
  fabricante?: string;
  planta_fabricacion?: string;
  normas_aplicacion?: string;
  informe_ensayo_nro?: string;
  fecha_emision?: string;
  vencimiento?: string;
  caracteristicas_tecnicas?: string;
  laboratorio?: string;
  direccion_legal_empresa?: string;
  organismo_certificacion?: string;
  esquema_certificacion?: string;
  fecha_proxima_vigilancia?: string;
}

interface DJCHistory {
  id: string;
  created_at: string;
  numero_djc: string;
  resolucion: string;
  status: string;
  conformity_status: string;
}

interface DJCPreviewData {
  numero_djc: string;
  resolucion: string;
  razon_social: string;
  cuit: string;
  marca: string;
  domicilio_legal: string;
  domicilio_planta: string;
  telefono: string;
  email: string;
  representante_nombre: string;
  representante_domicilio: string;
  representante_cuit: string;
  codigo_producto: string;
  fabricante: string;
  identificacion_producto: string;
  producto_marca: string;
  producto_modelo: string;
  caracteristicas_tecnicas: string;
  reglamento_alcanzado: string;
  normas_tecnicas: string;
  numero_certificado: string;
  organismo_certificacion: string;
  esquema_certificacion: string;
  fecha_emision_certificado: string;
  fecha_proxima_vigilancia: string;
  laboratorio_ensayos: string;
  informe_ensayos: string;
  enlace_declaracion: string;
  fecha_lugar: string;
}

const DJCGenerator: React.FC = () => {
  const [searchMode, setSearchMode] = useState<'client' | 'product'>('client');
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedResolution, setSelectedResolution] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showProductsWithoutDJC, setShowProductsWithoutDJC] = useState(false);
  const [djcHistory, setDjcHistory] = useState<DJCHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<DJCPreviewData | null>(null);
  const [representante, setRepresentante] = useState({
    nombre: '',
    domicilio: '',
    cuit: ''
  });
  const [useCustomLink, setUseCustomLink] = useState(false);
  const [customLink, setCustomLink] = useState('');

  const resolutions = [
    { value: 'Res. SICyC N° 236/24', label: 'Res. SICyC N° 236/24' },
    { value: 'Res. SICyC N° 17/2025', label: 'Res. SICyC N° 17/2025' },
    { value: 'Res. SICyC N° 16/2025', label: 'Res. SICyC N° 16/2025' }
  ];

  useEffect(() => {
    fetchClients();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedClient && products.length > 0) {
      const filtered = products.filter(p => {
        const productCuit = p.cuit?.toString();
        const clientCuit = selectedClient.cuit?.toString();
        
        const matchesClient = productCuit === clientCuit;
        const matchesDJCFilter = !showProductsWithoutDJC || 
          p.djc_status === 'No Generada' || 
          !p.djc_status;
        
        return matchesClient && matchesDJCFilter;
      });
      
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [selectedClient, products, showProductsWithoutDJC]);

  useEffect(() => {
    if (selectedProduct) {
      fetchDJCHistory(selectedProduct.codificacion);
    }
  }, [selectedProduct]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('razon_social');
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Error al cargar los clientes');
    }
  };

  const fetchProducts = async () => {
    try {
      // Primero obtener el conteo total
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      console.log('Total de productos en DB:', count);

      // Cargar TODOS los productos en lotes
      const allProducts: Product[] = [];
      const batchSize = 1000;
      const totalBatches = Math.ceil((count || 0) / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const from = i * batchSize;
        const to = from + batchSize - 1;

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('producto')
          .range(from, to);

        if (error) throw error;

        if (data) {
          allProducts.push(...data);
        }
      }

      console.log('Total de productos cargados en DJCGenerator:', allProducts.length);
      setProducts(allProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar los productos');
    }
  };

  const fetchDJCHistory = async (productCode: string) => {
    try {
      const { data, error } = await supabase
        .from('djc')
        .select('id, created_at, numero_djc, resolucion, pdf_url')
        .eq('codigo_producto', productCode)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const mappedData = (data || []).map(djc => ({
        id: djc.id,
        created_at: djc.created_at,
        numero_djc: djc.numero_djc,
        resolucion: djc.resolucion,
        status: djc.pdf_url ? 'Generada' : 'Pendiente',
        conformity_status: 'Conforme'
      }));
      
      setDjcHistory(mappedData);
    } catch (error) {
      console.error('Error fetching DJC history:', error);
      setDjcHistory([]);
    }
  };

  const handleProductSearch = (searchTerm: string) => {
    setProductSearch(searchTerm);
    
    if (searchMode === 'product' && searchTerm) {
      const foundProduct = products.find(p => 
        p.producto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codificacion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.marca?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (foundProduct) {
        setSelectedProduct(foundProduct);
        
        const productClient = clients.find(c => 
          c.cuit?.toString() === foundProduct.cuit?.toString()
        );
        
        if (productClient) {
          setSelectedClient(productClient);
          toast.success(`Cliente "${productClient.razon_social}" seleccionado automáticamente`);
        }
      }
    }
  };

  const generateDJCNumber = (certificateNumber: string): string => {
    return `DJC-${certificateNumber}`;
  };

  const preparePreview = () => {
    if (!selectedClient || !selectedProduct || !selectedResolution) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    const djcNumber = generateDJCNumber(selectedProduct.codificacion);
    const currentDate = new Date().toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const domicilio = selectedClient.direccion || selectedProduct.direccion_legal_empresa || '';
    const domicilioPlanta = selectedClient.direccion_planta || selectedProduct.planta_fabricacion || domicilio;

    // Usar link personalizado o generar el link automático según la opción seleccionada
    const qrLink = useCustomLink
      ? (customLink || '')
      : `https://verificar.argentina.gob.ar/qr/${selectedProduct.codificacion}`;

    // Formatear fecha de emisión del certificado
    const fechaEmisionCertificado = selectedProduct.fecha_emision
      ? new Date(selectedProduct.fecha_emision).toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : '-';

    // Formatear fecha de próxima vigilancia - usar vencimiento si no está disponible
    const fechaProximaVigilancia = selectedProduct.fecha_proxima_vigilancia
      ? new Date(selectedProduct.fecha_proxima_vigilancia).toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : selectedProduct.vencimiento
      ? new Date(selectedProduct.vencimiento).toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : '-';

    const data: DJCPreviewData = {
      numero_djc: djcNumber,
      resolucion: selectedResolution,
      razon_social: selectedClient.razon_social,
      cuit: formatCuit(selectedClient.cuit || ''),
      marca: selectedProduct.marca || selectedProduct.titular || '',
      domicilio_legal: domicilio,
      domicilio_planta: domicilioPlanta,
      telefono: selectedClient.telefono || '',
      email: selectedClient.email || '',
      representante_nombre: representante.nombre,
      representante_domicilio: representante.domicilio,
      representante_cuit: representante.cuit,
      codigo_producto: selectedProduct.codificacion,
      fabricante: selectedProduct.fabricante || '',
      identificacion_producto: selectedProduct.producto || '',
      producto_marca: selectedProduct.marca || '',
      producto_modelo: selectedProduct.modelo || '',
      caracteristicas_tecnicas: selectedProduct.caracteristicas_tecnicas || '',
      reglamento_alcanzado: selectedResolution,
      normas_tecnicas: selectedProduct.normas_aplicacion || '',
      numero_certificado: selectedProduct.codificacion,
      organismo_certificacion: selectedProduct.organismo_certificacion === 'IACSA'
        ? 'Intertek Argentina Certificaciones SA'
        : (selectedProduct.organismo_certificacion || selectedProduct.ocp_extranjero || 'Intertek Argentina Certificaciones SA'),
      esquema_certificacion: selectedProduct.esquema_certificacion || '',
      fecha_emision_certificado: fechaEmisionCertificado,
      fecha_proxima_vigilancia: fechaProximaVigilancia,
      laboratorio_ensayos: selectedProduct.laboratorio || '',
      informe_ensayos: selectedProduct.informe_ensayo_nro || '',
      enlace_declaracion: qrLink,
      fecha_lugar: currentDate
    };

    setPreviewData(data);
    setShowPreview(true);
  };

  const generatePDF = async () => {
    if (!previewData || !selectedClient || !selectedProduct) return;

    setGenerating(true);

    try {
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Debe estar autenticado para generar DJCs');
        setGenerating(false);
        setShowPreview(false);
        return;
      }

      // Generar el PDF usando jsPDF directamente
      const pdfGenerator = new DJCPdfGenerator();
      const pdf = pdfGenerator.generate(previewData);
      const pdfBlob = pdf.output('blob');
      const fileName = `DJC_${previewData.numero_djc}.pdf`;

      // Guardar en bucket 'djcs'
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('djcs')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading PDF:', uploadError);
        throw uploadError;
      }

      // Obtener URL pública del bucket djcs
      const { data: urlData } = supabase.storage
        .from('djcs')
        .getPublicUrl(fileName);

      // Guardar registro en tabla djc con created_by
      const { error: djcError } = await supabase
        .from('djc')
        .insert({
          numero_djc: previewData.numero_djc,
          resolucion: previewData.resolucion,
          razon_social: previewData.razon_social,
          cuit: selectedClient.cuit,
          marca: previewData.marca,
          domicilio_legal: previewData.domicilio_legal,
          domicilio_planta: previewData.domicilio_planta,
          telefono: previewData.telefono,
          email: previewData.email,
          representante_nombre: previewData.representante_nombre || null,
          representante_domicilio: previewData.representante_domicilio || null,
          representante_cuit: previewData.representante_cuit || null,
          codigo_producto: previewData.codigo_producto,
          fabricante: previewData.fabricante,
          identificacion_producto: previewData.identificacion_producto,
          reglamentos: previewData.resolucion,
          normas_tecnicas: previewData.normas_tecnicas,
          documento_evaluacion: previewData.informe_ensayos,
          enlace_declaracion: previewData.enlace_declaracion,
          fecha_lugar: previewData.fecha_lugar,
          pdf_url: urlData.publicUrl,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (djcError) {
        console.error('Error saving DJC:', djcError);

        if (djcError.code === '42501') {
          toast.error('Error de permisos. Verifique las políticas RLS en Supabase');
          throw new Error('Row Level Security error - check database policies');
        }
        throw djcError;
      }

      // Actualizar estado del producto
      const { error: updateError } = await supabase
        .from('products')
        .update({
          djc_status: 'Generada Pendiente de Firma',
          djc_path: urlData.publicUrl
        })
        .eq('codificacion', selectedProduct.codificacion);

      if (updateError) {
        console.error('Error updating product:', updateError);
        throw updateError;
      }

      // Descargar el PDF
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(pdfBlob);
      downloadLink.download = fileName;
      downloadLink.click();
      URL.revokeObjectURL(downloadLink.href);

      toast.success('DJC generada y guardada exitosamente');

      // Limpiar formulario y cerrar preview
      setShowPreview(false);
      handleClear();

    } catch (error) {
      console.error('Error generating DJC:', error);
      toast.error('Error al generar la DJC. Verifique los permisos en la base de datos.');
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = () => {
    setSelectedClient(null);
    setSelectedProduct(null);
    setSelectedResolution('');
    setClientSearch('');
    setProductSearch('');
    setRepresentante({ nombre: '', domicilio: '', cuit: '' });
    setUseCustomLink(false);
    setCustomLink('');
    setDjcHistory([]);
    setShowHistory(false);
    setPreviewData(null);
  };

  const getMissingFields = () => {
    const missing = [];
    if (!selectedClient) missing.push('Cliente');
    if (!selectedProduct) missing.push('Producto');
    if (!selectedResolution) missing.push('Resolución');
    if (selectedClient && !selectedClient.telefono) missing.push('Teléfono del cliente');
    if (selectedProduct && !selectedProduct.normas_aplicacion) missing.push('Normas técnicas');
    if (selectedProduct && !selectedProduct.informe_ensayo_nro) missing.push('Informe de ensayo');
    return missing;
  };

  const missingFields = getMissingFields();
  const canGenerate = selectedClient && selectedProduct && selectedResolution;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Generador de DJC
          </h2>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Limpiar
          </button>
        </div>

        {/* Información del Sistema */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Sistema de Gestión de DJC:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Vista previa antes de generar el PDF final</li>
                <li>Cada DJC es individual por producto</li>
                <li>Las DJC se guardan en el bucket "djcs"</li>
                <li>Puede agregar un representante autorizado si corresponde</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modo de búsqueda */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modo de búsqueda:
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setSearchMode('client')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                searchMode === 'client'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <User className="h-4 w-4" />
              Por Cliente
            </button>
            <button
              onClick={() => setSearchMode('product')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                searchMode === 'product'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <Package className="h-4 w-4" />
              Por Producto
            </button>
          </div>
        </div>

        {/* Selección según modo */}
        {searchMode === 'client' ? (
          <>
            {/* Selección de Cliente */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paso 1: Seleccionar Cliente
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Buscar por razón social..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={selectedClient?.cuit || ''}
                onChange={(e) => {
                  const client = clients.find(c => c.cuit?.toString() === e.target.value);
                  setSelectedClient(client || null);
                  setSelectedProduct(null);
                  setProductSearch('');
                }}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione un cliente...</option>
                {clients
                  .filter(client => 
                    !clientSearch || 
                    client.razon_social.toLowerCase().includes(clientSearch.toLowerCase())
                  )
                  .map(client => (
                    <option key={client.cuit} value={client.cuit}>
                      {client.razon_social} - CUIT: {formatCuit(client.cuit)}
                    </option>
                  ))}
              </select>
            </div>

            {/* Selección de Producto */}
            {selectedClient && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paso 2: Seleccionar Producto del Cliente
                </label>
                
                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                  <p className="text-sm text-gray-600">
                    Cliente <span className="font-semibold">{selectedClient.razon_social}</span> tiene{' '}
                    <span className="font-semibold">{filteredProducts.length}</span> producto(s)
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="showWithoutDJC"
                    checked={showProductsWithoutDJC}
                    onChange={(e) => setShowProductsWithoutDJC(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <label htmlFor="showWithoutDJC" className="text-sm text-gray-600">
                    Mostrar solo productos sin DJC
                  </label>
                </div>
                
                <select
                  value={selectedProduct?.codificacion || ''}
                  onChange={(e) => {
                    const product = filteredProducts.find(p => p.codificacion === e.target.value);
                    setSelectedProduct(product || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={filteredProducts.length === 0}
                >
                  <option value="">
                    {filteredProducts.length === 0 
                      ? 'No hay productos para este cliente' 
                      : 'Seleccione un producto...'}
                  </option>
                  {filteredProducts.map(product => (
                    <option key={product.codificacion} value={product.codificacion}>
                      {product.producto || 'Sin nombre'} - {product.marca || 'Sin marca'} ({product.codificacion})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Búsqueda directa por producto */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paso 1: Buscar Producto
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => handleProductSearch(e.target.value)}
                  placeholder="Buscar por producto, marca, código o N° certificado..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={selectedProduct?.codificacion || ''}
                onChange={(e) => {
                  const product = products.find(p => p.codificacion === e.target.value);
                  if (product) {
                    setSelectedProduct(product);
                    const client = clients.find(c => 
                      c.cuit?.toString() === product.cuit?.toString()
                    );
                    if (client) {
                      setSelectedClient(client);
                      toast.success(`Cliente "${client.razon_social}" seleccionado automáticamente`);
                    }
                  }
                }}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione un producto...</option>
                {products
                  .filter(product =>
                    !productSearch ||
                    product.producto?.toLowerCase().includes(productSearch.toLowerCase()) ||
                    product.marca?.toLowerCase().includes(productSearch.toLowerCase()) ||
                    product.codificacion?.toLowerCase().includes(productSearch.toLowerCase()) ||
                    product.nro_certificado?.toLowerCase().includes(productSearch.toLowerCase())
                  )
                  .map(product => {
                    const client = clients.find(c => 
                      c.cuit?.toString() === product.cuit?.toString()
                    );
                    return (
                      <option key={product.codificacion} value={product.codificacion}>
                        [{product.codificacion}] {product.producto || 'Sin nombre'} - {product.marca || 'Sin marca'}
                        {product.nro_certificado && ` [Cert: ${product.nro_certificado}]`}
                        {client && ` (${client.razon_social})`}
                      </option>
                    );
                  })}
              </select>
            </div>
          </>
        )}

        {/* Información seleccionada */}
        {selectedClient && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Cliente Seleccionado:</h3>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Razón Social:</span> {selectedClient.razon_social}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">CUIT:</span> {formatCuit(selectedClient.cuit)}
            </p>
            {!selectedClient.telefono && (
              <p className="text-sm text-red-600 mt-1">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                Falta teléfono del cliente
              </p>
            )}
          </div>
        )}

        {selectedProduct && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Producto Seleccionado:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Producto:</span> {selectedProduct.producto || 'Sin nombre'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Código:</span> {selectedProduct.codificacion}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Marca:</span> {selectedProduct.marca || 'Sin marca'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Estado DJC:</span>{' '}
                  <span className={`font-medium ${
                    selectedProduct.djc_status === 'Firmada' ? 'text-green-600' :
                    selectedProduct.djc_status === 'Generada Pendiente de Firma' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {selectedProduct.djc_status || 'No Generada'}
                  </span>
                </p>
              </div>
            </div>
            
            {(!selectedProduct.normas_aplicacion || !selectedProduct.informe_ensayo_nro) && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-700 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Faltan datos técnicos del producto
                </p>
              </div>
            )}
          </div>
        )}

        {/* Historial de DJCs */}
        {selectedProduct && djcHistory.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-2"
            >
              <History className="h-4 w-4" />
              {showHistory ? 'Ocultar' : 'Mostrar'} historial de DJCs ({djcHistory.length})
            </button>
            {showHistory && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-800 mb-2">
                  Historial de DJCs para este producto:
                </p>
                {djcHistory.map((djc, index) => (
                  <div key={djc.id} className="text-sm text-blue-700 mb-2 pb-2 border-b border-blue-200 last:border-0">
                    <p className="font-medium">DJC #{index + 1}: {djc.numero_djc}</p>
                    <p className="text-xs">• Fecha: {new Date(djc.created_at).toLocaleDateString('es-AR')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selección de Resolución */}
        {selectedProduct && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paso 3: Seleccionar Resolución Aplicable
            </label>
            <select
              value={selectedResolution}
              onChange={(e) => setSelectedResolution(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccione una resolución...</option>
              {resolutions.map(res => (
                <option key={res.value} value={res.value}>
                  {res.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Representante Autorizado */}
        {selectedProduct && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">
              Representante Autorizado (Opcional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Nombre y Apellido / Razón Social"
                value={representante.nombre}
                onChange={(e) => setRepresentante({...representante, nombre: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Domicilio Legal"
                value={representante.domicilio}
                onChange={(e) => setRepresentante({...representante, domicilio: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="CUIT"
                value={representante.cuit}
                onChange={(e) => setRepresentante({...representante, cuit: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Enlace de Declaración */}
        {selectedProduct && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-gray-700 mb-3">
              Enlace de la Declaración
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="useCustomLink"
                  checked={useCustomLink}
                  onChange={(e) => {
                    setUseCustomLink(e.target.checked);
                    if (!e.target.checked) {
                      setCustomLink('');
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="useCustomLink" className="text-sm text-gray-700">
                  El cliente genera su propio enlace (dejar en blanco o usar enlace personalizado)
                </label>
              </div>

              {!useCustomLink && (
                <div className="p-3 bg-white rounded border border-gray-300">
                  <p className="text-sm text-gray-600 mb-1 font-medium">Enlace automático:</p>
                  <p className="text-sm text-blue-600 break-all">
                    https://verificar.argentina.gob.ar/qr/{selectedProduct.codificacion}
                  </p>
                </div>
              )}

              {useCustomLink && (
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Enlace personalizado (opcional - dejar vacío para que el cliente lo complete después):
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={customLink}
                    onChange={(e) => setCustomLink(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {!customLink && (
                    <p className="text-xs text-gray-500 mt-1">
                      Si se deja vacío, el campo quedará en blanco para que el cliente lo complete después
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resumen de campos faltantes */}
        {missingFields.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-800 mb-1">
                  Campos faltantes:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-700">
                  {missingFields.map((field, index) => (
                    <li key={index}>{field}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Botón de vista previa */}
        <div className="flex justify-end gap-4">
          <button
            onClick={preparePreview}
            disabled={!canGenerate}
            className={`px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
              canGenerate
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Eye className="h-5 w-5" />
            Vista Previa DJC
          </button>
        </div>
      </div>

      {/* Modal de Preview */}
      <DJCPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        djcData={previewData}
        onConfirm={generatePDF}
        isGenerating={generating}
      />
    </div>
  );
};

export default DJCGenerator;