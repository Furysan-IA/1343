// QRGenerator.tsx - Versión mejorada con QR optimizados para escaneo móvil
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { qrConfigService } from '../services/qrConfig.service';
import { QRConfigModal } from './QRConfigModal';
import QRCode from 'qrcode';
import { saveAs } from 'file-saver';
import { toPng, toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { getQRModConfig } from '../utils/qrModConfig';
import { 
  QrCode, Download, Eye, Copy, CheckCircle, Settings,
  TestTube, Smartphone, ExternalLink, AlertCircle, RefreshCw,
  Globe, Link, AlertTriangle, Info, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

interface QRGeneratorProps {
  product: {
    codificacion: string;
    uuid: string;  // Ahora es requerido, no opcional
    marca: string | null;
    producto: string | null;
    modelo: string | null;
    titular?: string | null;
    qr_link?: string | null;
    qr_path?: string | null;
    qr_status?: string | null;
    qr_generated_at?: string | null;
  };
  onQRGenerated?: (qrUrl: string) => void;
  compact?: boolean;
  showRegenerateAlert?: boolean;
}

export function QRGenerator({ 
  product, 
  onQRGenerated, 
  compact = false,
  showRegenerateAlert = false 
}: QRGeneratorProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrDataUrlHighRes, setQrDataUrlHighRes] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(qrConfigService.getConfig());
  const [showUrlPreview, setShowUrlPreview] = useState(false);
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [qrQuality, setQrQuality] = useState<'L' | 'M' | 'Q' | 'H'>('M'); // Cambio de H a M por defecto
  const labelRef = useRef<HTMLDivElement>(null);
  const qrModConfig = getQRModConfig();
  
  // Suscribirse a cambios de configuración
  useEffect(() => {
    const unsubscribe = qrConfigService.subscribe((config) => {
      setCurrentConfig(config);
    });
    
    return unsubscribe;
  }, []);

  // Cargar QR existente si existe
  useEffect(() => {
    if (product.qr_link) {
      setQrUrl(product.qr_link);
      // Si ya tiene QR, intentar cargarlo
      if (product.qr_path) {
        setQrDataUrlHighRes(product.qr_path);
        // Generar versión normal desde la alta resolución
        generateNormalFromHighRes(product.qr_path);
      }
    }
  }, [product]);

  const generateNormalFromHighRes = async (highResData: string) => {
    try {
      // IMPORTANTE: Regenerar el QR con parámetros optimizados para escaneo
      const qrDataNormal = await QRCode.toDataURL(product.qr_link || '', {
        width: 200, // Aumentado de 75 a 200 para mejor calidad
        margin: 2, // Margen de 2 módulos para mejor detección
        errorCorrectionLevel: 'M', // Cambiado de H a M para mejor balance
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrDataUrl(qrDataNormal);
    } catch (error) {
      console.error('Error generando QR normal:', error);
    }
  };

  const canGenerate = product.titular && product.producto && product.marca;

  // Generar la URL que se usará para el QR
  const getPreviewUrl = () => {
    // Usar UUID del producto
    if (product.uuid) {
      return qrConfigService.generateProductUrl(product.uuid);
    }
    // Fallback temporal si no hay UUID
    return `${window.location.origin}/products/[UUID-NO-DISPONIBLE]`;
  };

  // Verificar si la URL actual es diferente a la configurada
  const checkUrlStatus = () => {
    if (!product.qr_link) return null;
    
    const currentBase = currentConfig.baseUrl;
    const isOutdated = !product.qr_link.startsWith(currentBase);
    
    if (isOutdated) {
      try {
        const existingUrl = new URL(product.qr_link);
        return {
          isOutdated: true,
          oldBase: existingUrl.origin,
          newBase: currentBase
        };
      } catch {
        return null;
      }
    }
    
    return { isOutdated: false };
  };

  // Probar URL antes de generar QR
  const testUrl = async () => {
    const testUrl = qrUrl || getPreviewUrl();
    setIsTestingUrl(true);
    
    try {
      // Abrir en nueva pestaña
      const newWindow = window.open(testUrl, '_blank');
      
      if (newWindow) {
        toast.success('URL abierta en nueva pestaña. Verifica que funcione correctamente.');
      } else {
        toast.error('No se pudo abrir la URL. Verifica los bloqueadores de ventanas emergentes.');
      }
      
      // Opcional: Intentar verificar si la URL responde
      try {
        // Nota: Esto puede fallar por CORS, pero es un intento adicional
        const response = await fetch(testUrl, { 
          method: 'HEAD',
          mode: 'no-cors' 
        });
        console.log('URL verificada:', testUrl);
      } catch (error) {
        console.log('No se pudo verificar la URL por CORS, pero esto es normal');
      }
      
    } catch (error) {
      toast.error('Error al probar la URL');
      console.error('Error:', error);
    } finally {
      setIsTestingUrl(false);
    }
  };

  const generateQR = async (force = false) => {
    if (!canGenerate) {
      toast.error('Faltan datos obligatorios: titular, producto o marca');
      return;
    }

    // Verificar que el producto tenga UUID
    if (!product.uuid) {
      toast.error('Este producto no tiene UUID asignado. Por favor, contacte al administrador.');
      return;
    }

    // Si ya tiene QR y no es forzado, preguntar
    if (product.qr_path && !force && !showRegenerateAlert) {
      if (!confirm('Este producto ya tiene un código QR. ¿Desea regenerarlo?')) {
        return;
      }
    }

    setGenerating(true);
    
    try {
      // Usar el UUID del producto para generar la URL
      const productUrl = qrConfigService.generateProductUrl(product.uuid);
      setQrUrl(productUrl);

      // IMPORTANTE: Configuración optimizada para escaneo móvil
      const qrOptions = {
        errorCorrectionLevel: qrQuality, // Usar nivel seleccionado
        type: 'image/png' as const,
        quality: 1,
        margin: 2, // Margen de 2 módulos para mejor detección
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        rendererOpts: {
          quality: 1
        }
      };

      // Generar QR para visualización (200x200px)
      const qrDataNormal = await QRCode.toDataURL(productUrl, {
        ...qrOptions,
        width: 200 // Tamaño óptimo para visualización y escaneo
      });
      setQrDataUrl(qrDataNormal);

      // Generar QR alta resolución para impresión (600x600px)
      const qrDataHigh = await QRCode.toDataURL(productUrl, {
        ...qrOptions,
        width: 600 // Alta resolución para impresión
      });
      setQrDataUrlHighRes(qrDataHigh);

      // Guardar en base de datos
      const { error } = await supabase
        .from('products')
        .update({
          qr_link: productUrl,
          qr_path: qrDataHigh,
          qr_status: 'Generado',
          qr_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('codificacion', product.codificacion);

      if (error) throw error;

      toast.success('Código QR generado exitosamente');
      
      // Mostrar información sobre escaneo
      toast((t) => (
        <div>
          <p className="font-medium">QR generado correctamente</p>
          <p className="text-sm mt-1">
            Optimizado para escaneo móvil con corrección de errores nivel {qrQuality}
          </p>
        </div>
      ), {
        duration: 4000,
        icon: '✅'
      });
      
      if (onQRGenerated) {
        onQRGenerated(productUrl);
      }

    } catch (error: any) {
      console.error('Error generando QR:', error);
      toast.error('Error al generar el código QR');
    } finally {
      setGenerating(false);
    }
  };

  const downloadQR = (highRes: boolean = false) => {
    const link = document.createElement('a');
    link.download = `qr-${product.codificacion}${highRes ? '-hd' : ''}.png`;
    link.href = highRes ? qrDataUrlHighRes : qrDataUrl;
    link.click();
  };

  const downloadLabelPNG = async () => {
    if (!labelRef.current) return;

    try {
      const dataUrl = await toPng(labelRef.current, {
        width: 94,
        height: 113,
        pixelRatio: 12, // Aumentado de 8 a 12 para mejor calidad
        quality: 1,
        backgroundColor: '#ffffff',
        canvasWidth: 1128, // 94 * 12
        canvasHeight: 1356, // 113 * 12
        skipAutoScale: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      saveAs(dataUrl, `etiqueta-qr-${product.codificacion}.png`);
      toast.success('Etiqueta PNG descargada exitosamente');
    } catch (error) {
      console.error('Error downloading PNG:', error);
      toast.error('Error al descargar la etiqueta PNG');
    }
  };

  const downloadLabelPDF = async () => {
    if (!labelRef.current) return;

    try {
      const blob = await toBlob(labelRef.current, {
        width: 94,
        height: 113, 
        pixelRatio: 12, // Aumentado para mejor calidad
        quality: 1,
        backgroundColor: '#ffffff',
        canvasWidth: 1128,
        canvasHeight: 1356,
        skipAutoScale: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });

      if (!blob) throw new Error('Error generating image');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [25, 30]
      });

      const imgData = URL.createObjectURL(blob);
      pdf.addImage(imgData, 'PNG', 0, 0, 25, 30);
      pdf.save(`etiqueta-qr-${product.codificacion}.pdf`);
      
      URL.revokeObjectURL(imgData);
      toast.success('Etiqueta PDF descargada exitosamente');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Error al descargar la etiqueta PDF');
    }
  };

  // Convert CMYK to RGB for checkmarks
  const cmykToRgb = () => {
    const c = 0.47;
    const m = 0.22;
    const y = 0;
    const k = 0.14;
    
    const r = Math.round(255 * (1 - c) * (1 - k));
    const g = Math.round(255 * (1 - m) * (1 - k));
    const b = Math.round(255 * (1 - y) * (1 - k));
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  const copyUrl = async () => {
    try {
      const url = qrUrl || getPreviewUrl();
      await navigator.clipboard.writeText(url);
      toast.success('URL copiada al portapapeles');
    } catch (err) {
      toast.error('Error al copiar la URL');
    }
  };

  // Vista compacta para lista
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {!canGenerate ? (
          <span className="text-red-600 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Datos faltantes
          </span>
        ) : product.qr_path ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <button
              onClick={() => generateQR(true)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Regenerar
            </button>
          </div>
        ) : (
          <button
            onClick={() => generateQR()}
            disabled={generating}
            className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            {generating ? 'Generando...' : 'Generar QR'}
          </button>
        )}
      </div>
    );
  }

  const urlStatus = checkUrlStatus();

  // Vista completa
  return (
    <div className="space-y-6">
      {/* Barra de configuración */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Configuración de URL</p>
              <p className="text-xs text-gray-600">Base: {currentConfig.baseUrl}</p>
              {currentConfig.baseUrl === 'https://argqr.com' && (
                <p className="text-xs text-green-600 font-medium">✓ Modo producción activo</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
          >
            <Settings className="w-4 h-4" />
            Configurar
          </button>
        </div>
      </div>

      {/* Selector de calidad del QR */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-3">Calidad del Código QR</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { value: 'L', label: 'Baja (7%)', desc: 'Menor tamaño' },
            { value: 'M', label: 'Media (15%)', desc: 'Recomendado' },
            { value: 'Q', label: 'Alta (25%)', desc: 'Más resistente' },
            { value: 'H', label: 'Máxima (30%)', desc: 'Máxima protección' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setQrQuality(option.value as any)}
              className={`p-2 rounded-lg border-2 transition-all ${
                qrQuality === option.value
                  ? 'border-blue-500 bg-blue-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium">{option.label}</div>
              <div className="text-xs text-gray-600">{option.desc}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-blue-700 mt-2">
          <Info className="w-3 h-3 inline mr-1" />
          Nivel de corrección de errores. Para etiquetas pequeñas se recomienda usar nivel Medio.
        </p>
      </div>

      {/* Alerta de URL desactualizada */}
      {urlStatus?.isOutdated && qrDataUrl && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-orange-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800">
                La URL del QR está desactualizada
              </p>
              <div className="text-sm text-orange-700 mt-1 space-y-1">
                <p>URL anterior: <code className="text-xs bg-orange-100 px-1 rounded">{urlStatus.oldBase}</code></p>
                <p>URL actual: <code className="text-xs bg-orange-100 px-1 rounded">{urlStatus.newBase}</code></p>
              </div>
              <button
                onClick={() => generateQR(true)}
                className="mt-2 px-4 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar QR con nueva URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de regeneración si el producto cambió */}
      {showRegenerateAlert && qrDataUrl && !urlStatus?.isOutdated && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                Los datos del producto han cambiado
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Se recomienda regenerar el código QR para reflejar los cambios.
              </p>
              <button
                onClick={() => generateQR(true)}
                className="mt-2 px-4 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerar QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vista previa de URL antes de generar */}
      {!qrDataUrl && (
        <div className="space-y-4">
          {/* Mensaje inicial */}
          <div className="text-center py-8">
            <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No se ha generado un código QR para este producto</p>
            {!canGenerate && (
              <p className="text-red-600 text-sm">
                Faltan datos obligatorios: titular, producto o marca
              </p>
            )}
          </div>

          {/* Vista previa de URL */}
          {canGenerate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Link className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Vista Previa de URL</h4>
                </div>
                <button
                  onClick={() => setShowUrlPreview(!showUrlPreview)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showUrlPreview ? 'Ocultar' : 'Mostrar detalles'}
                </button>
              </div>
              
              <div className="bg-white rounded border border-blue-200 p-3 mb-3">
                <p className="text-sm font-mono text-gray-700 break-all">{getPreviewUrl()}</p>
              </div>
              
              {showUrlPreview && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="text-blue-800">
                      <p>Esta URL apuntará a la vista pública del producto en esta aplicación.</p>
                      <p className="mt-1">El código QR dirigirá a los usuarios a: <code className="bg-blue-100 px-1 rounded">/products/{product.uuid}</code></p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 mt-3">
                <button
                  onClick={testUrl}
                  disabled={isTestingUrl}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {isTestingUrl ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Probando...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      Probar URL
                    </>
                  )}
                </button>
                <button
                  onClick={copyUrl}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </button>
              </div>
            </div>
          )}

          {/* Botón generar QR */}
          <div className="flex justify-center">
            <button
              onClick={() => generateQR()}
              disabled={generating || !canGenerate}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Generando...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  Generar Código QR
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Vista del QR generado */}
      {qrDataUrl && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vista tamaño real */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Tamaño Real (25mm × 30mm)
              </h4>
              <div className="flex justify-center mb-4">
                <div
                  ref={labelRef}
                  style={{
                    width: '94px',
                    height: '113px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #000000',
                    borderRadius: '8px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Código QR - Optimizado para escaneo */}
                  <div
                    style={{
                      position: 'absolute',
                      top: `${qrModConfig.qrTop}px`,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '75px',
                      height: '75px',
                      backgroundColor: '#ffffff',
                      padding: '2px' // Padding para asegurar margen blanco
                    }}
                  >
                    <img
                      src={qrDataUrl}
                      alt="Código QR"
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        imageRendering: 'crisp-edges' // Mejor renderizado para QR
                      }}
                    />
                  </div>
                  
                  {/* AR + Tildes */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: `${qrModConfig.arBottom}px`,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: `${qrModConfig.arGap}px`
                    }}
                  >
                    {/* Logo AR con fuente personalizada o imagen */}
                    {qrModConfig.useImage ? (
                      <img
                        src={qrModConfig.imagePath}
                        alt="AR"
                        style={{
                          height: `${qrModConfig.arSize}px`,
                          width: 'auto',
                          display: 'block'
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontFamily: `"${qrModConfig.fontFamily}", Arial, sans-serif`,
                          fontSize: `${qrModConfig.fontSize}px`,
                          fontWeight: 'bold',
                          color: '#000000',
                          height: `${qrModConfig.arSize}px`,
                          display: 'flex',
                          alignItems: 'center',
                          lineHeight: 1
                        }}
                      >
                        AR
                      </span>
                    )}
                    
                    {/* Tildes */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0',
                        height: `${qrModConfig.arSize}px`
                      }}
                    >
                      <svg
                        width={qrModConfig.arSize}
                        height={qrModConfig.checkHeight}
                        viewBox="0 0 19 9.5"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ 
                          display: 'block',
                          marginBottom: `${qrModConfig.checkOverlap}px`
                        }}
                      >
                        <path
                          d="M3 5L6.5 8.5L16 1.5"
                          stroke={cmykToRgb()}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <svg
                        width={qrModConfig.arSize}
                        height={qrModConfig.checkHeight}
                        viewBox="0 0 19 9.5"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ 
                          display: 'block',
                          marginTop: `${qrModConfig.checkOverlap}px`
                        }}
                      >
                        <path
                          d="M3 5L6.5 8.5L16 1.5"
                          stroke={cmykToRgb()}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">Vista a escala real</p>
              <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <Zap className="w-3 h-3 inline mr-1" />
                  <strong>Consejo:</strong> Para mejor escaneo, asegúrate de que el QR tenga suficiente contraste con el fondo.
                </p>
              </div>
            </div>

            {/* Vista digital */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Vista Previa Digital
              </h4>
              <div className="flex justify-center mb-4">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <img src={qrDataUrl} alt="QR Code Preview" className="w-48 h-48" />
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center mb-3">Como se verá al escanear</p>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-800">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  QR optimizado con nivel de corrección <strong>{qrQuality}</strong> y margen de seguridad
                </p>
              </div>
            </div>
          </div>

          {/* Información del QR */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Información del QR</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start">
                <span className="text-blue-700 font-medium mr-2">URL:</span>
                <code className="flex-1 bg-white px-2 py-1 rounded text-xs break-all">{qrUrl}</code>
              </div>
              <div className="flex items-center">
                <span className="text-blue-700 font-medium mr-2">Producto:</span>
                <span className="text-blue-900">
                  {product.producto || 'Sin nombre'} - {product.marca || 'Sin marca'} {product.modelo || ''}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-blue-700 font-medium mr-2">Calidad:</span>
                <span className="text-blue-900">
                  Corrección de errores nivel {qrQuality} ({
                    qrQuality === 'L' ? '7%' :
                    qrQuality === 'M' ? '15%' :
                    qrQuality === 'Q' ? '25%' : '30%'
                  })
                </span>
              </div>
              {product.qr_generated_at && (
                <div className="flex items-center">
                  <span className="text-blue-700 font-medium mr-2">Generado:</span>
                  <span className="text-blue-900">
                    {new Date(product.qr_generated_at).toLocaleString('es-AR')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Recomendaciones para impresión */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 mb-2">Recomendaciones para Impresión</h4>
            <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
              <li>Usa papel blanco mate para mejor contraste</li>
              <li>Imprime en alta calidad (300 DPI mínimo)</li>
              <li>Evita reducir el tamaño del QR por debajo de 20mm x 20mm</li>
              <li>Verifica que el QR sea escaneable antes de imprimir en masa</li>
              <li>Mantén el área alrededor del QR libre de elementos</li>
            </ul>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => downloadQR(false)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar QR
            </button>
            
            <button
              onClick={() => downloadQR(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar HD
            </button>
            
            <button
              onClick={downloadLabelPNG}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Etiqueta PNG
            </button>
            
            <button
              onClick={downloadLabelPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Etiqueta PDF
            </button>
            
            <button
              onClick={copyUrl}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copiar URL
            </button>
            
            <button
              onClick={testUrl}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Probar QR
            </button>

            <button
              onClick={() => generateQR(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerar
            </button>
          </div>
        </>
      )}

      {/* Modal de configuración */}
      <QRConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
}