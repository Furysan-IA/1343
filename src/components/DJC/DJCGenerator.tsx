import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCuit } from '../../utils/formatters';
import { jsPDF } from 'jspdf';
import { AlertCircle, Download, FileText, Search, User, Package, CheckCircle, XCircle, Loader2, AlertTriangle, History, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Client {
  id: string;
  razon_social: string;
  cuit: string;
  direccion?: string;
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
  fecha_vencimiento?: string;
  caracteristicas_tecnicas?: string;
  laboratorio?: string;
  direccion_legal_empresa?: string;
}

interface DJCHistory {
  id: string;
  created_at: string;
  numero_djc: string;
  resolucion: string;
  status: string;
  conformity_status: string;
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
  const [representante, setRepresentante] = useState({
    nombre: '',
    domicilio: '',
    cuit: ''
  });

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
      const filtered = products.filter(p => 
        p.cuit === selectedClient.cuit.toString() &&
        (!showProductsWithoutDJC || p.djc_status === 'No Generada' || !p.djc_status)
      );
      setFilteredProducts(filtered);
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
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('producto');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar los productos');
    }
  };

  const fetchDJCHistory = async (productCode: string) => {
    try {
      const { data, error } = await supabase
        .from('djc')
        .select('id, created_at, numero_djc, resolucion, status, conformity_status')
        .eq('codigo_producto', productCode)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDjcHistory(data || []);
    } catch (error) {
      console.error('Error fetching DJC history:', error);
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
        // Auto-seleccionar el cliente correcto
        const productClient = clients.find(c => c.cuit.toString() === foundProduct.cuit);
        if (productClient) {
          setSelectedClient(productClient);
          toast.success(`Cliente "${productClient.razon_social}" seleccionado automáticamente`);
        }
      }
    }
  };



  const generateDJCNumber = (): string => {
    const timestamp = Date.now().toString().slice(-6);
    return `DJC-2025-${timestamp}`;
  };

  const generatePDF = async () => {
    if (!selectedClient || !selectedProduct || !selectedResolution) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    setGenerating(true);

    try {
      const djcNumber = generateDJCNumber();
      const currentDate = new Date().toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Crear el PDF con el formato exacto del modelo
      const pdf = new jsPDF();
      
      // Configurar fuente
      pdf.setFont('helvetica');
      
      // Título principal
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DECLARACIÓN JURADA DE CONFORMIDAD (DJC)', 105, 20, { align: 'center' });
      
      // Resolución
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedResolution, 105, 30, { align: 'center' });
      
      // Número de identificación
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Número de Identificación de DJC:', 105, 40, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.text(djcNumber, 105, 47, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.text('(número único de identificación autodeterminado)', 105, 53, { align: 'center' });

      // Línea separadora
      pdf.line(20, 60, 190, 60);

      // Información del Fabricante o Importador
      let yPos = 70;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Información del Fabricante o Importador:', 20, yPos);
      
      yPos += 10;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      // Razón Social
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Razón Social: ', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedClient.razon_social || '', 55, yPos);
      
      // CUIT
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('• C.U.I.T. N°', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text('(cuando fuera aplicable)', 45, yPos);
      pdf.text(': ' + formatCuit(selectedClient.cuit || ''), 85, yPos);
      
      // Nombre Comercial o Marca
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Nombre Comercial o Marca Registrada: ', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedProduct.marca || selectedProduct.titular || '', 100, yPos);
      
      // Domicilio Legal
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Domicilio Legal: ', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      const domicilio = selectedClient.direccion || selectedProduct.direccion_legal_empresa || '';
      pdf.text(domicilio, 60, yPos);
      
      // Domicilio de la planta
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Domicilio de la planta de producción o del depósito del importador: ', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 6;
      pdf.text(selectedProduct.planta_fabricacion || 'No especificado', 25, yPos);
      
      // Teléfono
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Teléfono: ', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      const telefono = selectedClient.telefono || 'CAMPO NO ENCONTRADO';
      if (telefono === 'CAMPO NO ENCONTRADO') {
        pdf.setTextColor(255, 0, 0);
      }
      pdf.text(telefono, 50, yPos);
      pdf.setTextColor(0, 0, 0);
      
      // Correo Electrónico
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Correo Electrónico: ', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedClient.email || '', 65, yPos);

      // Representante Autorizado
      yPos += 15;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Representante Autorizado (si corresponde):', 20, yPos);
      
      yPos += 8;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Nombre y Apellido / Razón Social: ', 25, yPos);
      pdf.setFont('helvetica', 'italic');
      pdf.text(representante.nombre || 'No aplica', 85, yPos);
      
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Domicilio Legal: ', 25, yPos);
      pdf.setFont('helvetica', 'italic');
      pdf.text(representante.domicilio || 'No aplica', 60, yPos);
      
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('• C.U.I.T. N°: ', 25, yPos);
      pdf.setFont('helvetica', 'italic');
      pdf.text(representante.cuit || 'No aplica', 55, yPos);

      // Información del Producto
      yPos += 15;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Información del Producto ', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text('(por producto o familia de productos):', 75, yPos);
      
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Código de Identificación Único del Producto ', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text('(autodeterminado): ', 115, yPos);
      pdf.text(selectedProduct.codificacion || '', 155, yPos);
      
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Fabricante', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text('(Incluir domicilio de la planta de producción): ', 50, yPos);
      pdf.text(selectedProduct.fabricante || '', 140, yPos);
      
      if (selectedProduct.planta_fabricacion) {
        yPos += 6;
        pdf.text(selectedProduct.planta_fabricacion, 25, yPos);
      }
      
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Identificación del producto ', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text('(marca, modelo, características técnicas): ', 80, yPos);
      yPos += 6;
      const identificacion = `${selectedProduct.marca || ''} - ${selectedProduct.modelo || ''} - ${selectedProduct.caracteristicas_tecnicas || ''}`;
      pdf.text(identificacion, 25, yPos);

      // Nueva página para Normas y Evaluación
      pdf.addPage();
      yPos = 30;
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Normas y Evaluación de la Conformidad:', 20, yPos);
      
      yPos += 10;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Reglamento/s Aplicable/s: ', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedResolution, 75, yPos);
      yPos += 6;
      pdf.setFont('helvetica', 'italic');
      pdf.text('(Detallar el o los reglamentos bajo los cuales se encuentra alcanzado el producto)', 25, yPos);
      
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Norma/s Técnica/s: ', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedProduct.normas_aplicacion || '', 65, yPos);
      yPos += 6;
      pdf.setFont('helvetica', 'italic');
      pdf.text('(Incluir normas técnicas específicas a las que se ajusta el producto)', 25, yPos);
      
      yPos += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Referencia al Documento de Evaluación de la Conformidad: ', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 6;
      pdf.text(selectedProduct.informe_ensayo_nro || '', 25, yPos);
      yPos += 6;
      pdf.setFont('helvetica', 'italic');
      pdf.text('(Emitido por un OEC, especificar el número de referencia)', 25, yPos);

      // Otros Datos
      yPos += 15;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Otros Datos:', 20, yPos);
      
      yPos += 10;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('• Enlace a la copia de la Declaración de la Conformidad en Internet: ', 25, yPos);
      yPos += 6;
      const qrLink = `https://verificar.argentina.gob.ar/qr/${selectedProduct.codificacion}`;
      pdf.setTextColor(0, 0, 255);
      pdf.text(qrLink, 25, yPos);
      pdf.setTextColor(0, 0, 0);
      yPos += 6;
      pdf.setFont('helvetica', 'italic');
      pdf.text('(Si está disponible, incluir el enlace al documento en línea)', 25, yPos);

      // Texto legal
      yPos += 15;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      const textoLegal = 'La presente declaración jurada de conformidad se emite, en todo de acuerdo con el/los Reglamentos Técnicos aludidos precedentemente, asumiendo la responsabilidad directa por los datos declarados, así como por la conformidad del producto.';
      const lines = pdf.splitTextToSize(textoLegal, 165);
      lines.forEach((line: string) => {
        pdf.text(line, 22, yPos);
        yPos += 6;
      });

      // Fecha
      yPos += 10;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Fecha:', 20, yPos);
      yPos += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.text(currentDate, 20, yPos);

      // Firma
      yPos += 15;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Firma:', 20, yPos);
      yPos += 6;
      pdf.setFont('helvetica', 'italic');
      pdf.text('(Firma del responsable)', 20, yPos);
      
      // Línea para firma
      yPos += 20;
      pdf.line(20, yPos, 80, yPos);
      
      // Línea para aclaración
      yPos += 15;
      pdf.text('Aclaración:', 20, yPos);
      yPos += 10;
      pdf.line(20, yPos, 80, yPos);

      // Nota de documento preliminar
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(128, 128, 128);
      pdf.text('DOCUMENTO PRELIMINAR - PENDIENTE DE FIRMA', 105, 280, { align: 'center' });
      pdf.setTextColor(0, 0, 0);

      // Convertir PDF a blob
      const pdfBlob = pdf.output('blob');
      const fileName = `djc_preliminar_${selectedProduct.codificacion}_${Date.now()}.pdf`;

      // Guardar en bucket 'djc' (preliminares)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('djc')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('djc')
        .getPublicUrl(fileName);

      // Guardar registro en tabla djc
      const { error: djcError } = await supabase
        .from('djc')
        .insert({
          numero_djc: djcNumber,
          resolucion: selectedResolution,
          razon_social: selectedClient.razon_social,
          cuit: selectedClient.cuit,
          marca: selectedProduct.marca || selectedProduct.titular || '',
          domicilio_legal: domicilio,
          domicilio_planta: selectedProduct.planta_fabricacion || 'No especificado',
          telefono: selectedClient.telefono || '',
          email: selectedClient.email || '',
          representante_nombre: representante.nombre || null,
          representante_domicilio: representante.domicilio || null,
          representante_cuit: representante.cuit || null,
          codigo_producto: selectedProduct.codificacion,
          fabricante: selectedProduct.fabricante || '',
          identificacion_producto: identificacion,
          reglamentos: selectedResolution,
          normas_tecnicas: selectedProduct.normas_aplicacion || '',
          documento_evaluacion: selectedProduct.informe_ensayo_nro || '',
          enlace_declaracion: qrLink,
          fecha_lugar: currentDate,
          pdf_url: urlData.publicUrl,
          status: 'Generada Pendiente de Firma',
          conformity_status: 'Conforme'
        });

      if (djcError) throw djcError;

      // Actualizar estado del producto
      const { error: updateError } = await supabase
        .from('products')
        .update({
          djc_status: 'Generada Pendiente de Firma',
          djc_path: urlData.publicUrl
        })
        .eq('codificacion', selectedProduct.codificacion);

      if (updateError) throw updateError;

      // Guardar historial
      const { error: historyError } = await supabase
        .from('djc_history')
        .insert({
          djc_id: djcNumber,
          product_code: selectedProduct.codificacion,
          action: 'created',
          details: {
            resolution: selectedResolution,
            client: selectedClient.razon_social,
            product: selectedProduct.producto
          }
        });

      if (historyError) console.error('Error saving history:', historyError);

      // Descargar el PDF
      pdf.save(`DJC_${djcNumber}.pdf`);

      toast.success('DJC generada y guardada exitosamente');
      
      // Limpiar formulario
      handleClear();
      
    } catch (error) {
      console.error('Error generating DJC:', error);
      toast.error('Error al generar la DJC');
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
    setDjcHistory([]);
    setShowHistory(false);
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
                <li>Las DJC preliminares se guardan en el bucket "djc" (borradores)</li>
                <li>Las DJC firmadas se moverán al bucket "documents" (oficiales)</li>
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

        {/* Paso 1: Selección según modo */}
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
                  const client = clients.find(c => c.cuit === e.target.value);
                  setSelectedClient(client || null);
                  setSelectedProduct(null);
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
                  Paso 2: Seleccionar Producto
                </label>
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
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar por producto, marca o código..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={selectedProduct?.codificacion || ''}
                  onChange={(e) => {
                    const product = filteredProducts.find(p => p.codificacion === e.target.value);
                    setSelectedProduct(product || null);
                  }}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccione un producto...</option>
                  {filteredProducts
                    .filter(product => 
                      !productSearch ||
                      product.producto?.toLowerCase().includes(productSearch.toLowerCase()) ||
                      product.marca?.toLowerCase().includes(productSearch.toLowerCase()) ||
                      product.codificacion?.toLowerCase().includes(productSearch.toLowerCase())
                    )
                    .map(product => (
                      <option key={product.codificacion} value={product.codificacion}>
                        {product.producto} - {product.marca} ({product.codificacion})
                        {product.djc_status === 'No Generada' && ' ⚠️ Sin DJC'}
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
                  placeholder="Buscar por producto, marca o código..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={selectedProduct?.codificacion || ''}
                onChange={(e) => {
                  const product = products.find(p => p.codificacion === e.target.value);
                  if (product) {
                    setSelectedProduct(product);
                    const client = clients.find(c => c.cuit.toString() === product.cuit);
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
                    product.codificacion?.toLowerCase().includes(productSearch.toLowerCase())
                  )
                  .map(product => (
                    <option key={product.codificacion} value={product.codificacion}>
                      {product.producto} - {product.marca} ({product.codificacion})
                      {product.djc_status === 'No Generada' && ' ⚠️ Sin DJC'}
                    </option>
                  ))}
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
            <p className="text-sm text-gray-600">
              <span className="font-medium">Dirección:</span> {selectedClient.direccion || 'No especificada'}
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
            <p className="text-sm text-gray-600">
              <span className="font-medium">Producto:</span> {selectedProduct.producto}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Marca:</span> {selectedProduct.marca}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Código:</span> {selectedProduct.codificacion}
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
            {(!selectedProduct.normas_aplicacion || !selectedProduct.informe_ensayo_nro) && (
              <p className="text-sm text-red-600 mt-1">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                Faltan datos técnicos del producto
              </p>
            )}
          </div>
        )}

        {/* Historial de DJCs */}
        {djcHistory.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-2"
            >
              <History className="h-4 w-4" />
              {showHistory ? 'Ocultar' : 'Mostrar'} historial de DJCs ({djcHistory.length})
            </button>
            {showHistory && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-yellow-800 mb-2">
                  DJCs existentes para este producto:
                </p>
                {djcHistory.map((djc) => (
                  <div key={djc.id} className="text-sm text-yellow-700 mb-1">
                    • {djc.numero_djc} - {djc.resolucion} - {djc.status}
                    {djc.conformity_status === 'Fuera de conformidad' && (
                      <span className="ml-2 text-red-600 font-semibold">
                        (FUERA DE CONFORMIDAD)
                      </span>
                    )}
                  </div>
                ))}
                {djcHistory.some(djc => djc.conformity_status === 'Fuera de conformidad') && (
                  <p className="text-sm text-red-600 mt-2">
                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                    Ya existe una DJC fuera de conformidad. Generar otra requerirá justificación.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Paso 3: Selección de Resolución */}
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

        {/* Representante Autorizado (Opcional) */}
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
            <p className="text-xs text-gray-500 mt-2">
              Complete solo si el producto tiene un representante autorizado
            </p>
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

        {/* Botón de generación */}
        <div className="flex justify-end gap-4">
          <button
            onClick={generatePDF}
            disabled={!canGenerate || generating}
            className={`px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
              canGenerate && !generating
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generando DJC...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Generar y Guardar DJC
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DJCGenerator;