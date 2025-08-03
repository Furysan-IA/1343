import React, { useState, useEffect } from 'react';
import { supabase, Database } from '../../lib/supabase';
import { qrConfigService } from '../../services/qrConfig.service';
import { formatCuit } from '../../utils/formatters';
import { jsPDF } from 'jspdf';
import { 
  FileText, Search, Download, Eye, X, AlertCircle, 
  CheckCircle, Package, Filter, RefreshCw, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

// Use database types for consistency
type Client = Database['public']['Tables']['clients']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

interface DJCData {
  resolucion: string;
  numero_djc: string;
  razon_social: string;
  cuit: string;
  domicilio_legal: string;
  telefono: string;
  email: string;
  nombre_comercial: string;
  codigo_identificacion: string;
  fabricante_completo: string;
  identificacion_producto: string;
  normas_tecnicas: string;
  documento_evaluacion: string;
  enlace_declaracion: string;
  fecha_lugar: string;
}

// Las resoluciones disponibles
const RESOLUCIONES = [
  { value: 'res-236-24', label: 'Res. SIYC N° 236/24 - Materiales para instalaciones eléctricas' },
  { value: 'res-17-2025', label: 'Res. SIYC N° 17/2025' },
  { value: 'res-16-2025', label: 'Res. SIYC N° 16/2025' }
];

export default function DJCGenerator() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedResolucion, setSelectedResolucion] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [djcData, setDjcData] = useState<DJCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [showProductsWithoutDJC, setShowProductsWithoutDJC] = useState(false);
  const [productsWithoutDJC, setProductsWithoutDJC] = useState<Product[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchProduct, showProductsWithoutDJC]);

  const fetchData = async () => {
    try {
      // Cargar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('razon_social');

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Cargar productos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('producto');

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Filtrar productos sin DJC
      const withoutDJC = (productsData || []).filter(p => !p.djc_path);
      setProductsWithoutDJC(withoutDJC);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Filtrar por búsqueda
    if (searchProduct) {
      filtered = filtered.filter(product => 
        product.producto?.toLowerCase().includes(searchProduct.toLowerCase()) ||
        product.marca?.toLowerCase().includes(searchProduct.toLowerCase()) ||
        product.codificacion?.toLowerCase().includes(searchProduct.toLowerCase())
      );
    }

    // Mostrar solo productos sin DJC si está activado
    if (showProductsWithoutDJC) {
      filtered = filtered.filter(p => !p.djc_path);
    }

    setFilteredProducts(filtered);
  };

  const generateDJC = () => {
    if (!selectedClient || !selectedProduct) {
      toast.error('Debe seleccionar un cliente y un producto');
      return;
    }

    if (!selectedResolucion) {
      toast.error('Debe seleccionar una resolución aplicable');
      return;
    }

    // Obtener el QR link del producto o generarlo si no existe
    let qrLink = selectedProduct.qr_link;
    
    if (!qrLink) {
      // Si no tiene QR link, generarlo usando el servicio
      qrLink = qrConfigService.generateProductUrl(selectedProduct.codificacion);
    }

    const djc = {
      resolucion: RESOLUCIONES.find(r => r.value === selectedResolucion)?.label || '',
      numero_djc: `DJC-2025-${Date.now().toString().slice(-6)}`,
      razon_social: selectedClient.razon_social || 'CAMPO NO ENCONTRADO',
      cuit: formatCuit(selectedClient.cuit),
      domicilio_legal: selectedClient.direccion || 'CAMPO NO ENCONTRADO',
      telefono: 'CAMPO NO ENCONTRADO', // No existe en el esquema actual
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
      documento_evaluacion: selectedProduct.informe_ensayo_nro || selectedProduct.codificacion || 'CAMPO NO ENCONTRADO',
      enlace_declaracion: qrLink || 'CAMPO NO ENCONTRADO',
      fecha_lugar: `Morón, ${new Date().toLocaleDateString('es-AR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })}`
    };

    setDjcData(djc);
    setShowPreview(true);
  };

  const saveDJC = async () => {
    if (!djcData || !selectedProduct) return;

    try {
      // Generar PDF
      const doc = new jsPDF();
      
      // Configurar fuente y estilo
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DECLARACIÓN JURADA DE CONFORMIDAD', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      let y = 40;
      const lineHeight = 8;
      const margin = 20;
      const pageWidth = doc.internal.pageSize.width;
      const contentWidth = pageWidth - 2 * margin;

      // Función auxiliar para agregar texto con salto de línea automático
      const addText = (label: string, value: string, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        const text = `${label}${value}`;
        const lines = doc.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin, y);
          y += lineHeight;
        });
      };

      // Contenido del DJC
      addText('Número: ', djcData.numero_djc, true);
      addText('Resolución Aplicable: ', djcData.resolucion);
      y += 5;

      addText('Razón Social: ', djcData.razon_social);
      addText('CUIT: ', djcData.cuit);
      addText('Domicilio Legal: ', djcData.domicilio_legal);
      addText('Teléfono: ', djcData.telefono);
      addText('Email: ', djcData.email);
      y += 5;

      addText('Nombre Comercial: ', djcData.nombre_comercial);
      addText('Código de Identificación: ', djcData.codigo_identificacion);
      addText('Fabricante: ', djcData.fabricante_completo);
      addText('Identificación del Producto: ', djcData.identificacion_producto);
      addText('Normas Técnicas: ', djcData.normas_tecnicas);
      addText('Documento de Evaluación: ', djcData.documento_evaluacion);
      y += 5;

      addText('Enlace QR: ', djcData.enlace_declaracion);
      y += 10;

      addText('', djcData.fecha_lugar);

      // Guardar el PDF
      const pdfBlob = doc.output('blob');
      const fileName = `DJC_${selectedProduct.codificacion}_${Date.now()}.pdf`;
      
      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, pdfBlob);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Actualizar el producto con la ruta del DJC
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          djc_path: publicUrl,
          djc_status: 'Generada Pendiente de Firma',
          updated_at: new Date().toISOString()
        })
        .eq('codificacion', selectedProduct.codificacion);

      if (updateError) throw updateError;

      toast.success('DJC generado y guardado exitosamente');
      
      // Descargar el PDF
      doc.save(fileName);
      
      // Resetear el formulario
      setShowPreview(false);
      setDjcData(null);
      setSelectedClient(null);
      setSelectedProduct(null);
      setSelectedResolucion('');
      
      // Recargar datos
      fetchData();
    } catch (error: any) {
      console.error('Error saving DJC:', error);
      toast.error('Error al guardar el DJC');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">Gestión de DJC</h2>
            <p className="opacity-90">Genera Declaraciones Juradas de Conformidad</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{productsWithoutDJC.length}</p>
            <p className="text-sm opacity-90">Productos sin DJC</p>
          </div>
        </div>
      </div>

      {/* Filtro de productos sin DJC */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showProductsWithoutDJC}
            onChange={(e) => setShowProductsWithoutDJC(e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded"
          />
          <span className="text-sm font-medium">
            Mostrar solo productos sin DJC ({productsWithoutDJC.length})
          </span>
        </label>
      </div>

      {/* Formulario de generación */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Generar Nueva DJC</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Selección de Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchClient}
                onChange={(e) => setSearchClient(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={selectedClient?.cuit || ''}
              onChange={(e) => {
                const client = clients.find(c => c.cuit.toString() === e.target.value);
                setSelectedClient(client || null);
              }}
              className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Seleccione un cliente</option>
              {clients
                .filter(client => 
                  !searchClient || 
                  client.razon_social.toLowerCase().includes(searchClient.toLowerCase())
                )
                .map(client => (
                  <option key={client.cuit} value={client.cuit}>
                    {client.razon_social} - {formatCuit(client.cuit)}
                  </option>
                ))}
            </select>
          </div>

          {/* Selección de Producto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Producto
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={selectedProduct?.codificacion || ''}
              onChange={(e) => {
                const product = products.find(p => p.codificacion === e.target.value);
                setSelectedProduct(product || null);
              }}
              className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Seleccione un producto</option>
              {filteredProducts.map(product => (
                <option key={product.codificacion} value={product.codificacion}>
                  {product.producto} - {product.marca} ({product.codificacion})
                  {!product.djc_path && ' ⚠️ Sin DJC'}
                </option>
              ))}
            </select>
          </div>

          {/* Selección de Resolución */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resolución Aplicable
            </label>
            <select
              value={selectedResolucion}
              onChange={(e) => setSelectedResolucion(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Seleccione una resolución</option>
              {RESOLUCIONES.map(res => (
                <option key={res.value} value={res.value}>
                  {res.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Información del producto seleccionado */}
        {selectedProduct && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Información del Producto</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <p><span className="font-medium">Código:</span> {selectedProduct.codificacion}</p>
              <p><span className="font-medium">Marca:</span> {selectedProduct.marca}</p>
              <p><span className="font-medium">Origen:</span> {selectedProduct.origen}</p>
              <p className="md:col-span-3">
                <span className="font-medium">Normas:</span> {selectedProduct.normas_aplicacion}
              </p>
              {selectedProduct.djc_path && (
                <p className="md:col-span-3 text-orange-600">
                  <AlertCircle className="inline w-4 h-4 mr-1" />
                  Este producto ya tiene una DJC generada
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={() => {
              setSelectedClient(null);
              setSelectedProduct(null);
              setSelectedResolucion('');
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Limpiar
          </button>
          <button
            onClick={generateDJC}
            disabled={!selectedClient || !selectedProduct || !selectedResolucion}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Vista Previa DJC
          </button>
        </div>
      </div>

      {/* Modal de Vista Previa */}
      {showPreview && djcData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Vista Previa de DJC</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Encabezado DJC */}
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">DECLARACIÓN JURADA DE CONFORMIDAD</h1>
                <p className="text-gray-600">Número: {djcData.numero_djc}</p>
              </div>

              {/* Resolución Aplicable */}
              <section>
                <h3 className="font-bold text-lg mb-2">Resolución Aplicable:</h3>
                <p className="pl-4">{djcData.resolucion}</p>
              </section>

              {/* Datos del Declarante */}
              <section>
                <h3 className="font-bold text-lg mb-3">Datos del Declarante:</h3>
                <div className="pl-4 space-y-2">
                  <p>● <strong>Razón Social:</strong> {djcData.razon_social}</p>
                  <p>● <strong>CUIT:</strong> {djcData.cuit}</p>
                  <p>● <strong>Domicilio Legal:</strong> {djcData.domicilio_legal}</p>
                  <p>● <strong>Teléfono:</strong> {djcData.telefono}</p>
                  <p>● <strong>Email:</strong> {djcData.email}</p>
                </div>
              </section>

              {/* Datos del Producto */}
              <section>
                <h3 className="font-bold text-lg mb-3">Datos del Producto:</h3>
                <div className="pl-4 space-y-2">
                  <p>● <strong>Nombre Comercial:</strong> {djcData.nombre_comercial}</p>
                  <p>● <strong>Código de Identificación:</strong> {djcData.codigo_identificacion}</p>
                  <p>● <strong>Fabricante y Planta:</strong> {djcData.fabricante_completo}</p>
                  <p>● <strong>Identificación del Producto:</strong> {djcData.identificacion_producto}</p>
                  <p>● <strong>Normas Técnicas:</strong> {djcData.normas_tecnicas}</p>
                  <p>● <strong>Documento de Evaluación:</strong> {djcData.documento_evaluacion}</p>
                </div>
              </section>

              {/* Otros Datos */}
              <section>
                <h3 className="font-bold text-lg mb-3">Otros Datos:</h3>
                <div className="pl-4">
                  <p>● <strong>Enlace a la copia de la Declaración de la Conformidad en Internet:</strong>{' '}
                    <span className={djcData.enlace_declaracion === 'CAMPO NO ENCONTRADO' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                      {djcData.enlace_declaracion}
                    </span>
                  </p>
                  <p className="text-sm italic text-gray-600 ml-4">
                    (Si está disponible, incluir el enlace al documento en línea)
                  </p>
                  {djcData.enlace_declaracion !== 'CAMPO NO ENCONTRADO' && (
                    <p className="text-xs text-gray-500 ml-4 mt-1">
                      Este enlace corresponde al código QR del producto
                    </p>
                  )}
                </div>
              </section>

              {/* Fecha y Lugar */}
              <section>
                <p className="text-right mt-8">
                  <strong>{djcData.fecha_lugar}</strong>
                </p>
              </section>

              {/* Campos faltantes */}
              {Object.entries(djcData).some(([_, value]) => value === 'CAMPO NO ENCONTRADO') && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Atención: Hay campos sin completar
                  </p>
                  <p className="text-red-600 text-sm mt-1">
                    Revise los campos marcados en rojo antes de generar el documento final.
                  </p>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={saveDJC}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Generar y Descargar DJC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}