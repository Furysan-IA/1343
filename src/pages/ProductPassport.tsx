import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabasePublic } from '../lib/supabase';
import { Package, Shield, Factory, Calendar, MapPin, User, FileText, Award, Globe, Phone, Mail, Building2, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Clock, ArrowLeft, ExternalLink, QrCode, Download, Eye, Loader as Loader2, TriangleAlert as AlertTriangle, Chrome as Home, RefreshCw } from 'lucide-react';
import { formatDateWithoutTimezone } from '../utils/formatters';

interface Product {
  codificacion: string;
  uuid: string;
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
  djc_source?: string;
  djc_version?: number;
  is_active?: boolean;
}

export default function ProductPassport() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [djc, setDjc] = useState<DJC | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [showingRevision, setShowingRevision] = useState<boolean>(false);

  useEffect(() => {
    if (uuid) {
      fetchProductData();
    } else {
      setError('UUID de producto no válido');
      setLoading(false);
    }
  }, [uuid]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar producto por UUID
      const { data: productData, error: productError } = await supabasePublic
        .from('products')
        .select('*')
        .eq('uuid', uuid)
        .single();

      if (productError) {
        if (productError.code === 'PGRST116') {
          setError('Producto no encontrado');
        } else {
          throw productError;
        }
        return;
      }

      let displayedCodificacion = productData.codificacion;

      if (productData.is_qr_master) {
        const { data: productsUsingThisQR } = await supabasePublic
          .from('products')
          .select('*')
          .eq('shared_qr_from', productData.codificacion)
          .order('updated_at', { ascending: false });

        if (productsUsingThisQR && productsUsingThisQR.length > 0) {
          displayedCodificacion = productsUsingThisQR[0].codificacion;
          setProduct(productsUsingThisQR[0]);
          setShowingRevision(true);
          setRelatedProducts([productData, ...productsUsingThisQR.slice(1)]);
        } else {
          setProduct(productData);
          setShowingRevision(false);
        }
      } else if (productData.shared_qr_from) {
        setProduct(productData);
        setShowingRevision(true);

        const { data: masterProduct } = await supabasePublic
          .from('products')
          .select('*')
          .eq('codificacion', productData.shared_qr_from)
          .maybeSingle();

        if (masterProduct) {
          setRelatedProducts([masterProduct]);
        }
      } else {
        setProduct(productData);
        setShowingRevision(false);
      }

      // The product's djc_path field is the SIGNED DJC uploaded by the client.
      // This is the source of truth - it always takes priority.
      const signedDjcUrl = productData.djc_path;

      // Load DJC metadata from the djc table
      const { data: djcRecord } = await supabasePublic
        .from('djc')
        .select('*')
        .eq('codigo_producto', displayedCodificacion)
        .eq('is_active', true)
        .order('djc_version', { ascending: false })
        .maybeSingle();

      // If no DJC for displayed product, try the original product
      const finalDjcRecord = djcRecord || (displayedCodificacion !== productData.codificacion
        ? (await supabasePublic.from('djc').select('*').eq('codigo_producto', productData.codificacion).eq('is_active', true).order('djc_version', { ascending: false }).maybeSingle()).data
        : null);

      if (finalDjcRecord) {
        // Always override pdf_url with the signed file from products.djc_path if it exists
        if (signedDjcUrl) {
          finalDjcRecord.pdf_url = signedDjcUrl;
          finalDjcRecord.djc_source = 'manually_uploaded';
        }
        setDjc(finalDjcRecord);
      } else if (signedDjcUrl) {
        // No DJC record in table at all, but the product has a signed file
        setDjc({
          id: '',
          resolucion: '',
          razon_social: productData.titular || '',
          cuit: productData.cuit,
          marca: '',
          domicilio_legal: '',
          domicilio_planta: '',
          telefono: null,
          email: '',
          representante_nombre: null,
          representante_domicilio: null,
          representante_cuit: null,
          codigo_producto: displayedCodificacion,
          fabricante: '',
          identificacion_producto: '',
          reglamentos: null,
          normas_tecnicas: null,
          documento_evaluacion: null,
          enlace_declaracion: null,
          fecha_lugar: '',
          firma_url: null,
          pdf_url: signedDjcUrl,
          created_at: '',
          numero_djc: `DJC-${displayedCodificacion}`,
          updated_at: '',
          djc_source: 'manually_uploaded',
          djc_version: 1,
          is_active: true
        });
      }

    } catch (error: any) {
      console.error('Error fetching product data:', error);
      setError('Error al cargar la información del producto');
    } finally {
      setLoading(false);
    }
  };

  const getProductStatus = () => {
    // 1. PRIORIDAD: Usar el campo oficial "estado" de la base de datos
    if (product?.estado) {
      const estadoUpper = product.estado.toUpperCase().trim();

      // Mapear estados oficiales a visualización
      const estadoMap: Record<string, { status: string; color: string; bgColor: string; icon: any; warning?: string }> = {
        'VIGENTE': {
          status: 'Vigente',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: CheckCircle
        },
        'VENCIDO': {
          status: 'Vencido',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: AlertCircle
        },
        'CANCELADO': {
          status: 'Cancelado',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: AlertCircle
        },
        'SUSPENDIDO': {
          status: 'Suspendido',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          icon: AlertTriangle
        },
        'EN PROCESO DE RENOVACIÓN': {
          status: 'En Renovación',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          icon: Clock
        }
      };

      const estadoInfo = estadoMap[estadoUpper] || {
        status: product.estado,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: Clock
      };

      // Detectar inconsistencias entre estado oficial y fecha
      if (product.vencimiento && estadoUpper === 'VIGENTE') {
        const now = new Date();
        const vencimiento = new Date(product.vencimiento);

        if (vencimiento < now) {
          // El estado dice VIGENTE pero la fecha ya pasó - mostrar advertencia
          estadoInfo.warning = 'Fecha vencida pero estado oficial vigente';
        }
      }

      return estadoInfo;
    }

    // 2. RESPALDO: Calcular estado basándose en fechas si no hay estado oficial
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
        status: 'Vencido (por fecha)',
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
      status: 'Vigente (por fecha)',
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
    return formatDateWithoutTimezone(date, 'short');
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
        {/* Warning Banner for Inconsistencies */}
        {status.warning && (
          <div className="mb-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Advertencia de Inconsistencia</h3>
                <p className="text-amber-100 mb-3">
                  El estado oficial del certificado es <span className="font-bold">VIGENTE</span>,
                  pero la fecha de vencimiento ({product?.vencimiento ? formatDate(product.vencimiento) : 'N/A'}) ya ha pasado.
                </p>
                <p className="text-sm text-amber-200">
                  El estado mostrado es el oficial del sistema de certificación.
                  Si tiene dudas, por favor contacte al organismo emisor del certificado.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Revision Banner */}
        {showingRevision && product.shared_qr_from && (
          <div className="mb-6 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Información Actualizada</h3>
                <p className="text-purple-100 mb-3">
                  El código QR que escaneaste pertenece al producto base <span className="font-mono font-bold">{product.shared_qr_from}</span>.
                  Se está mostrando la revisión más reciente: <span className="font-mono font-bold">{product.codificacion}</span>
                </p>
                <div className="flex items-center gap-4 text-sm text-purple-200">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Certificado actualizado</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Última revisión</span>
                  </div>
                </div>
              </div>
            </div>
            {relatedProducts.length > 1 && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm text-purple-200 mb-2">Otras revisiones disponibles:</p>
                <div className="flex flex-wrap gap-2">
                  {relatedProducts.slice(1).map((rp) => (
                    <span
                      key={rp.codificacion}
                      className="px-3 py-1 bg-white/10 rounded-full text-xs font-mono"
                    >
                      {rp.codificacion}
                    </span>
                  ))}
                  <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-mono">
                    {product.shared_qr_from} (original)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

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
                  <label className="text-sm font-medium text-gray-500">Estado Oficial</label>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 font-medium">{product.estado || 'No especificado'}</p>
                    {product.estado && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        Certificado
                      </span>
                    )}
                  </div>
                  {status.warning && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Ver advertencia arriba
                    </p>
                  )}
                </div>
                {product.caracteristicas_tecnicas && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Características Técnicas</label>
                    <p className="text-gray-900">{product.caracteristicas_tecnicas}</p>
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-indigo-600" />
                    Declaración Jurada de Conformidad
                  </h2>
                  <div className="flex items-center gap-2">
                    {djc.djc_source === 'manually_uploaded' ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Firmada por Cliente
                      </span>
                    ) : djc.djc_source === 'auto_generated' ? (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Pendiente de Firma
                      </span>
                    ) : null}
                    {djc.djc_version && djc.djc_version > 1 && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                        V{djc.djc_version}
                      </span>
                    )}
                  </div>
                </div>
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
                  {djc.djc_source === 'manually_uploaded' && (
                    <div className="md:col-span-2">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          DJC firmada por el cliente
                        </p>
                      </div>
                    </div>
                  )}
                  {djc.djc_source === 'auto_generated' && (
                    <div className="md:col-span-2">
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          DJC generada automaticamente - Pendiente de firma del cliente
                        </p>
                      </div>
                    </div>
                  )}
                  {djc.pdf_url && (
                    <div className="md:col-span-2">
                      <a
                        href={djc.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Descargar DJC {djc.djc_source === 'manually_uploaded' ? 'Firmada' : ''}
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
                  {/* Priorizar DJC activa de la tabla djc */}
                  {djc?.pdf_url ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={djc.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        title={djc.djc_source === 'manually_uploaded' ? 'DJC firmada y subida manualmente' : 'DJC generada automáticamente'}
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </a>
                      {djc.djc_source === 'manually_uploaded' && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                          Firmada
                        </span>
                      )}
                    </div>
                  ) : product.djc_path ? (
                    <a
                      href={product.djc_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      title="DJC generada automáticamente"
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


        {/* Footer de Verificación */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-green-400" />
            <h3 className="text-xl font-bold">Producto Verificado</h3>
          </div>
          <p className="text-gray-300 mb-4">
            Esta información ha sido verificada y es oficial del Sistema Argentino de Certificación
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-900 text-white text-center">
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