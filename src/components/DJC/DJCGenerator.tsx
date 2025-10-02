import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCuit } from '../../utils/formatters';
import { FileText, Search, User, Package, Download, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateDJCPDF, type DJCData } from '../../services/djcPdf.service';

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
  organismo_certificacion?: string;
  esquema_certificacion?: string;
  fecha_proxima_vigilancia?: string;
  numero_certificado?: string;
  djc_status?: string;
}

const RESOLUCIONES = [
  'Resolución 531/2020',
  'Resolución 620/2024',
  'Resolución 437/2016',
  'Otra resolución'
];

export const DJCGenerator: React.FC = () => {
  const [searchMode, setSearchMode] = useState<'client' | 'product'>('client');
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedResolution, setSelectedResolution] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [representante, setRepresentante] = useState({
    nombre: '',
    domicilio: '',
    cuit: ''
  });

  useEffect(() => {
    loadClients();
    loadProducts();
  }, []);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('razon_social');

    if (!error && data) {
      setClients(data);
    }
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('producto');

    if (!error && data) {
      setProducts(data);
    }
  };

  const filteredClients = clients.filter(c =>
    c.razon_social.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.cuit.includes(clientSearch)
  );

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.producto.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.codificacion.toLowerCase().includes(productSearch.toLowerCase());

    if (selectedClient) {
      return matchesSearch && p.cuit === selectedClient.cuit;
    }
    return matchesSearch;
  });

  const handleClear = () => {
    setSelectedClient(null);
    setSelectedProduct(null);
    setSelectedResolution('');
    setClientSearch('');
    setProductSearch('');
    setRepresentante({ nombre: '', domicilio: '', cuit: '' });
  };

  const handleGenerate = async () => {
    if (!selectedClient || !selectedProduct || !selectedResolution) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    setGenerating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debe estar autenticado');
        setGenerating(false);
        return;
      }

      const numero_djc = `DJC-${Date.now()}`;
      const currentDate = new Date().toLocaleDateString('es-AR');

      const qrLink = `${window.location.origin}/qr/${selectedProduct.codificacion}`;

      const djcData: DJCData = {
        numero_djc,
        resolucion: selectedResolution,
        razon_social: selectedClient.razon_social,
        cuit: formatCuit(selectedClient.cuit),
        marca: selectedClient.razon_social,
        domicilio_legal: selectedClient.direccion || '',
        domicilio_planta: selectedProduct.planta_fabricacion || selectedClient.direccion || '',
        telefono: selectedClient.telefono || '',
        email: selectedClient.email || '',
        representante_nombre: representante.nombre,
        representante_domicilio: representante.domicilio,
        representante_cuit: representante.cuit,
        codigo_producto: selectedProduct.codificacion,
        fabricante: selectedProduct.fabricante || selectedProduct.titular || '',
        identificacion_producto: selectedProduct.producto,
        producto_marca: selectedProduct.marca || '',
        producto_modelo: selectedProduct.modelo || '',
        caracteristicas_tecnicas: selectedProduct.caracteristicas_tecnicas || '',
        normas_tecnicas: selectedProduct.normas_aplicacion || '',
        numero_certificado: selectedProduct.numero_certificado || '',
        organismo_certificacion: selectedProduct.organismo_certificacion || 'Intertek Argentina Certificaciones SA',
        esquema_certificacion: selectedProduct.esquema_certificacion || '',
        fecha_emision_certificado: selectedProduct.fecha_emision || '',
        fecha_proxima_vigilancia: selectedProduct.fecha_proxima_vigilancia || '',
        laboratorio_ensayos: selectedProduct.laboratorio || '',
        informe_ensayos: selectedProduct.informe_ensayo_nro || '',
        enlace_declaracion: qrLink,
        fecha_lugar: `Argentina, ${currentDate}`
      };

      const pdfBlob = generateDJCPDF(djcData);
      const fileName = `${numero_djc}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('djcs')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading PDF:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('djcs')
        .getPublicUrl(fileName);

      const { error: djcError } = await supabase
        .from('djc')
        .insert({
          numero_djc,
          resolucion: selectedResolution,
          razon_social: selectedClient.razon_social,
          cuit: selectedClient.cuit,
          marca: djcData.marca,
          domicilio_legal: djcData.domicilio_legal,
          domicilio_planta: djcData.domicilio_planta,
          telefono: djcData.telefono,
          email: djcData.email,
          representante_nombre: representante.nombre || null,
          representante_domicilio: representante.domicilio || null,
          representante_cuit: representante.cuit || null,
          codigo_producto: selectedProduct.codificacion,
          fabricante: djcData.fabricante,
          identificacion_producto: djcData.identificacion_producto,
          reglamentos: selectedResolution,
          normas_tecnicas: djcData.normas_tecnicas,
          documento_evaluacion: djcData.informe_ensayos,
          enlace_declaracion: qrLink,
          fecha_lugar: djcData.fecha_lugar,
          pdf_url: urlData.publicUrl,
          created_by: user.id
        });

      if (djcError) {
        console.error('Error saving DJC:', djcError);
        throw djcError;
      }

      await supabase
        .from('products')
        .update({
          djc_status: 'Generada Pendiente de Firma',
          djc_path: urlData.publicUrl
        })
        .eq('codificacion', selectedProduct.codificacion);

      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(pdfBlob);
      downloadLink.download = fileName;
      downloadLink.click();
      URL.revokeObjectURL(downloadLink.href);

      toast.success('DJC generada exitosamente');
      handleClear();

    } catch (error) {
      console.error('Error generating DJC:', error);
      toast.error('Error al generar la DJC');
    } finally {
      setGenerating(false);
    }
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

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Sistema de Generación de DJC:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Seleccione un cliente y un producto</li>
                <li>Las DJC se generan en formato PDF</li>
                <li>Los campos vacíos se marcan en rojo</li>
                <li>Puede agregar un representante autorizado si corresponde</li>
              </ul>
            </div>
          </div>
        </div>

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
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Package className="h-4 w-4" />
              Por Producto
            </button>
          </div>
        </div>

        {searchMode === 'client' ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Cliente:
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Buscar por razón social o CUIT..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {clientSearch && (
              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      setSelectedClient(client);
                      setClientSearch('');
                    }}
                    className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                      selectedClient?.id === client.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900">{client.razon_social}</div>
                    <div className="text-sm text-gray-600">CUIT: {formatCuit(client.cuit)}</div>
                  </button>
                ))}
              </div>
            )}

            {selectedClient && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Cliente Seleccionado:</h3>
                <p className="text-green-800">{selectedClient.razon_social}</p>
                <p className="text-sm text-green-700">CUIT: {formatCuit(selectedClient.cuit)}</p>
              </div>
            )}

            {selectedClient && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Producto del Cliente:
                </label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar producto por nombre o código..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setSelectedProduct(product);
                        setProductSearch('');
                      }}
                      className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                        selectedProduct?.id === product.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{product.producto}</div>
                      <div className="text-sm text-gray-600">Código: {product.codificacion}</div>
                      {product.djc_status && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                          {product.djc_status}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Producto:
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar por nombre o código..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {productSearch && (
              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product);
                      const client = clients.find(c => c.cuit === product.cuit);
                      if (client) setSelectedClient(client);
                      setProductSearch('');
                    }}
                    className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                      selectedProduct?.id === product.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900">{product.producto}</div>
                    <div className="text-sm text-gray-600">Código: {product.codificacion}</div>
                    {product.djc_status && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                        {product.djc_status}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedProduct && selectedClient && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Selección:</h3>
                <p className="text-green-800 font-medium">{selectedProduct.producto}</p>
                <p className="text-sm text-green-700">Código: {selectedProduct.codificacion}</p>
                <p className="text-sm text-green-700 mt-2">{selectedClient.razon_social}</p>
              </div>
            )}
          </div>
        )}

        {selectedClient && selectedProduct && (
          <div className="mt-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolución Aplicable *
              </label>
              <select
                value={selectedResolution}
                onChange={(e) => setSelectedResolution(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar resolución...</option>
                {RESOLUCIONES.map((res) => (
                  <option key={res} value={res}>
                    {res}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Representante Autorizado (Opcional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={representante.nombre}
                    onChange={(e) => setRepresentante({ ...representante, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domicilio
                  </label>
                  <input
                    type="text"
                    value={representante.domicilio}
                    onChange={(e) => setRepresentante({ ...representante, domicilio: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CUIT
                  </label>
                  <input
                    type="text"
                    value={representante.cuit}
                    onChange={(e) => setRepresentante({ ...representante, cuit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {missingFields.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900 mb-1">Campos faltantes:</p>
                    <ul className="list-disc list-inside text-sm text-yellow-800">
                      {missingFields.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                    <p className="text-sm text-yellow-700 mt-2">
                      Los campos faltantes se marcarán en rojo en el PDF generado.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Generar DJC
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DJCGenerator;
