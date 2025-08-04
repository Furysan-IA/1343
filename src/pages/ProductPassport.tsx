import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Package, Shield, Factory, Calendar, MapPin, User, 
  FileText, Award, Globe, Phone, Mail, Building2,
  CheckCircle, AlertCircle, Clock, ArrowLeft, ExternalLink,
  QrCode, Download, Eye, Loader2, AlertTriangle, Home
} from 'lucide-react';

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

interface DJC {
  id: string;
  resolucion: string;
  razon_social: string;
  cuit: number | null;
  marca: string;
  domicilio_legal: string;
  domicilio_planta: string;
  telefono: string | null;
  email: string;
  representante_nombre: string | null;
  representante_domicilio: string | null;
  representante_cuit: string | null;
  codigo_producto: string;
  fabricante: string;
  identificacion_producto: string;
  reglamentos: string | null;
  normas_tecnicas: string | null;
  documento_evaluacion: string | null;
  enlace_declaracion: string | null;
  fecha_lugar: string;
  firma_url: string | null;
  pdf_url: string | null;
  created_at: string;
  numero_djc: string | null;
  updated_at: string;
}

export default function ProductPassport() {
  const { uuid: codificacion } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [djc, setDjc] = useState<DJC | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (codificacion) {
      fetchProductData();
    } else {
      setError('Código de producto no válido');
      setLoading(false);
    }
  }, [codificacion]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar producto por codificacion
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('codificacion', codificacion)
        .single();

      if (productError) {
        if (productError.code === 'PGRST116') {
          setError('Producto no encontrado');
        } else {
          throw productError;
        }
        return;
      }

      setProduct(productData);

      // Buscar DJC asociada
      const { data: djcData, error: djcError } = await supabase
        .from('djc')
        .select('*')
        .eq('codigo_producto', codificacion)
        .maybeSingle();

      if (djcError && djcError.code !== 'PGRST116') {
        console.warn('Error loading DJC:', djcError);
      } else if (djcData) {
        setDjc(djcData);
      }

    } catch (error: any) {
      console.error('Error fetching product data:', error);
      setError('Error al cargar la información del producto');
    } finally {
      setLoading(false);
    }
  };

  const getProductStatus = () => {
    if (!product?.vencimiento) {
      return { 
        status: 'Sin fecha de vencimiento', 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-100',
        icon: Clock
      };
    }

    const now = new Date();
    const vencimiento = new Date(product.vencimiento);
    
    if (vencimiento < now) {
      return { 
        status: 'Vencido', 
        color: 'text-red-600', 
        bgColor: 'bg-red-100',
        icon: AlertCircle
      };
    }

    const diasParaVencer = Math.ceil((vencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasParaVencer <= 30) {
      return { 
        status: `Vence en ${diasParaVencer} días`, 
        color: 'text-orange-600', 
        bgColor: 'bg-orange-100',
        icon: AlertTriangle
      };
    }

    return { 
      status: 'Vigente', 
      color: 'text-green-600', 
      bgColor: 'bg-green-100',
      icon: CheckCircle
    };
  };

  const formatCuit = (cuit: number): string => {
    const str = cuit.toString();
    if (str.length !== 11) return str;
    return `${str.slice(0, 2)}-${str.slice(2, 10)}-${str.slice(10)}`;
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando información</h2>
          <p className="text-gray-600">Obteniendo datos del producto...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Producto no encontrado</h2>
          <p className="text-gray-600 mb-6">
            {error || 'No se pudo encontrar información para este código de producto.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <Home className="w-4 h-4" />
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const status = getProductStatus();
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header público */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center hover:scale-105 transition-transform"
              >
                <Shield className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Verificación de Producto</h1>
                <p className="text-xs text-gray-600">Sistema Argentino de Certificación</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-5 h-5 ${status.color}`} />
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}>
                {status.status}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-12 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="w-8 h-8" />
                  <h1 className="text-3xl font-bold">
                    {product.producto || 'Producto Certificado'}
                  </h1>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-blue-100">
                  <div>
                    <p className="text-sm opacity-90">Marca</p>
                    <p className="font-semibold text-lg">{product.marca || 'No especificada'}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Modelo</p>
                    <p className="font-semibold text-lg">{product.modelo || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Código</p>
                    <p className="font-semibold text-lg font-mono">{product.codificacion}</p>
                  </div>
                </div>
              </div>
              <div className="ml-6">
                <QrCode className="w-16 h-16 opacity-80" />
              </div>
            </div>
          </div>
        </div>

        {/* Información Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Información General */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos del Producto */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-600" />
                Información del Producto
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Producto</label>
                  <p className="text-gray-900 font-medium">{product.producto || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Marca</label>
                  <p className="text-gray-900 font-medium">{product.marca || 'No especificada'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Modelo</label>
                  <p className="text-gray-900 font-medium">{product.modelo || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Origen</label>
                  <p className="text-gray-900 font-medium">{product.origen || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipo de Certificación</label>
                  <p className="text-gray-900 font-medium">{product.tipo_certificacion || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Estado</label>
                  <p className="text-gray-900 font-medium">{product.estado || 'No especificado'}</p>
                </div>
                {product.caracteristicas_tecnicas && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Características Técnicas</label>
                    <p className="text-gray-900">{product.caracteristicas_tecnicas}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Información del Fabricante */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Factory className="w-6 h-6 text-green-600" />
                Información del Fabricante
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Fabricante</label>
                  <p className="text-gray-900 font-medium">{product.fabricante || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Planta de Fabricación</label>
                  <p className="text-gray-900 font-medium">{product.planta_fabricacion || 'No especificada'}</p>
                </div>
                {product.direccion_legal_empresa && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Dirección Legal de la Empresa</label>
                    <p className="text-gray-900">{product.direccion_legal_empresa}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Información de Certificación */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-600" />
                Certificación y Normas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.normas_aplicacion && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Normas de Aplicación</label>
                    <p className="text-gray-900">{product.normas_aplicacion}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Informe de Ensayo Nro</label>
                  <p className="text-gray-900 font-medium">{product.informe_ensayo_nro || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Laboratorio</label>
                  <p className="text-gray-900 font-medium">{product.laboratorio || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Fecha de Emisión</label>
                  <p className="text-gray-900 font-medium">
                    {product.fecha_emision ? formatDate(product.fecha_emision) : 'No especificada'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Fecha de Vencimiento</label>
                  <p className="text-gray-900 font-medium">
                    {product.vencimiento ? formatDate(product.vencimiento) : 'No especificada'}
                  </p>
                </div>
              </div>
            </div>

            {/* DJC Information */}
            {djc && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-indigo-600" />
                  Declaración Jurada de Conformidad
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Número DJC</label>
                    <p className="text-gray-900 font-medium font-mono">{djc.numero_djc || 'No asignado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Resolución</label>
                    <p className="text-gray-900 font-medium">{djc.resolucion}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fecha y Lugar</label>
                    <p className="text-gray-900">{djc.fecha_lugar}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Creado</label>
                    <p className="text-gray-900">{formatDate(djc.created_at)}</p>
                  </div>
                  {djc.pdf_url && (
                    <div className="md:col-span-2">
                      <a
                        href={djc.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Descargar DJC
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Información del Titular */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Titular
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Razón Social</label>
                  <p className="text-gray-900 font-medium">{product.titular || 'No especificado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">CUIT</label>
                  <p className="text-gray-900 font-mono">{formatCuit(product.cuit)}</p>
                </div>
              </div>
            </div>

            {/* Fechas Importantes */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                Fechas Importantes
              </h3>
              <div className="space-y-3">
                {product.fecha_emision && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Emisión</span>
                    <span className="font-medium">{formatDate(product.fecha_emision)}</span>
                  </div>
                )}
                {product.vencimiento && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Vencimiento</span>
                    <span className="font-medium">{formatDate(product.vencimiento)}</span>
                  </div>
                )}
                {product.dias_para_vencer !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Días restantes</span>
                    <span className={`font-bold ${
                      product.dias_para_vencer < 0 ? 'text-red-600' :
                      product.dias_para_vencer <= 30 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {product.dias_para_vencer} días
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Documentos */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Documentos
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Certificado</span>
                  {product.certificado_path ? (
                    <a
                      href={product.certificado_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">No disponible</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">DJC</span>
                  {product.djc_path ? (
                    <a
                      href={product.djc_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">No disponible</span>
                  )}
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            {(product.ocp_extranjero || product.n_certificado_extranjero || product.disposicion_convenio) && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-orange-600" />
                  Información Internacional
                </h3>
                <div className="space-y-3">
                  {product.ocp_extranjero && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">OCP Extranjero</label>
                      <p className="text-gray-900">{product.ocp_extranjero}</p>
                    </div>
                  )}
                  {product.n_certificado_extranjero && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">N° Certificado Extranjero</label>
                      <p className="text-gray-900 font-mono">{product.n_certificado_extranjero}</p>
                    </div>
                  )}
                  {product.fecha_emision_certificado_extranjero && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Fecha Emisión Cert. Extranjero</label>
                      <p className="text-gray-900">{formatDate(product.fecha_emision_certificado_extranjero)}</p>
                    </div>
                  )}
                  {product.disposicion_convenio && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Disposición Convenio</label>
                      <p className="text-gray-900">{product.disposicion_convenio}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Información Técnica Detallada */}
        {(product.cod_rubro || product.nombre_subrubro || product.en_proceso_renovacion) && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-yellow-600" />
              Información Técnica Adicional
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {product.cod_rubro && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Código Rubro</label>
                  <p className="text-gray-900 font-medium">{product.cod_rubro}</p>
                </div>
              )}
              {product.cod_subrubro && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Código Subrubro</label>
                  <p className="text-gray-900 font-medium">{product.cod_subrubro}</p>
                </div>
              )}
              {product.nombre_subrubro && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Nombre Subrubro</label>
                  <p className="text-gray-900 font-medium">{product.nombre_subrubro}</p>
                </div>
              )}
              {product.en_proceso_renovacion && (
                <div className="md:col-span-3">
                  <label className="text-sm font-medium text-gray-500">En Proceso de Renovación</label>
                  <p className="text-gray-900">{product.en_proceso_renovacion}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer de Verificación */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-green-400" />
            <h3 className="text-xl font-bold">Producto Verificado</h3>
          </div>
          <p className="text-gray-300 mb-4">
            Esta información ha sido verificada y es oficial del Sistema Argentino de Certificación
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
            <span>Código: {product.codificacion}</span>
            <span>•</span>
            <span>Verificado: {formatDate(product.created_at)}</span>
            {product.qr_generated_at && (
              <>
                <span>•</span>
                <span>QR: {formatDate(product.qr_generated_at)}</span>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}