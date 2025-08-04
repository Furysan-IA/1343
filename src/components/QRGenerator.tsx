// QRGenerator.tsx - Versión completa y corregida
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { qrConfigService } from '../services/qrConfig.service';
import { QRConfigModal } from './QRConfigModal';
import QRCode from 'qrcode';
import { saveAs } from 'file-saver';
import { toPng, toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { 
  QrCode, Download, Eye, Copy, CheckCircle, Settings,
  TestTube, Smartphone, ExternalLink, AlertCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getQRModConfig } from '../utils/qrModConfig';

interface QRGeneratorProps {
  product: {
    codificacion: string;
    marca: string | null;
    producto: string | null;
    modelo: string | null;
    titular?: string | null;
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
    if ((product as any).qr_link) {
      setQrUrl((product as any).qr_link);
      // Si ya tiene QR, intentar cargarlo
      if ((product as any).qr_path) {
        setQrDataUrlHighRes((product as any).qr_path);
        // Generar versión normal desde la alta resolución
        generateNormalFromHighRes((product as any).qr_path);
      }
    }
  }, [product]);

  const generateNormalFromHighRes = async (highResData: string) => {
    try {
      // Crear versión de tamaño normal desde el QR de alta resolución
      const qrDataNormal = await QRCode.toDataURL((product as any).qr_link || '', {
        width: 75,
        margin: 0,
        errorCorrectionLevel: 'H'
      });
      setQrDataUrl(qrDataNormal);
    } catch (error) {
      console.error('Error generando QR normal:', error);
    }
  };

  const canGenerate = product.titular && product.producto && product.marca;

  const generateQR = async (force = false) => {
    if (!canGenerate) {
      toast.error('Faltan datos obligatorios: titular, producto o marca');
      return;
    }

    // Si ya tiene QR y no es forzado, preguntar
    if ((product as any).qr_path && !force && !showRegenerateAlert) {
      if (!confirm('Este producto ya tiene un código QR. ¿Desea regenerarlo?')) {
        return;
      }
    }

    setGenerating(true);
    
    try {
      // Usar el servicio de configuración para generar la URL
      const productUrl = qrConfigService.generateProductUrl(product.codificacion);
      setQrUrl(productUrl);

      // Generar QR tamaño normal (75x75px para etiqueta de 25x30mm)
      const qrDataNormal = await QRCode.toDataURL(productUrl, {
        width: 75,
        margin: 0,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrDataUrl(qrDataNormal);

      // Generar QR alta resolución (225x225px para impresión a 300dpi)
      const qrDataHigh = await QRCode.toDataURL(productUrl, {
        width: 225,
        margin: 0,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
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
        pixelRatio: 8,
        quality: 1,
        backgroundColor: '#ffffff',
        canvasWidth: 752,
        canvasHeight: 904,
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
        pixelRatio: 8,
        quality: 1,
        backgroundColor: '#ffffff',
        canvasWidth: 752,
        canvasHeight: 904,
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
      await navigator.clipboard.writeText(qrUrl);
      toast.success('URL copiada al portapapeles');
    } catch (err) {
      toast.error('Error al copiar la URL');
    }
  };

  const testQR = () => {
    if (qrUrl) {
      window.open(qrUrl, '_blank');
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
        ) : (product as any).qr_path ? (
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

  // Vista completa
  return (
    <div className="space-y-6">
      {/* Barra de configuración */}
      <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-gray-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Configuración de URL</p>
            <p className="text-xs text-gray-600">Base: {currentConfig.baseUrl}</p>
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

      {/* Alerta de regeneración si el producto cambió */}
      {showRegenerateAlert && qrDataUrl && (
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

      {/* Botón generar QR */}
      {!qrDataUrl && (
        <div className="text-center py-8">
          <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No se ha generado un código QR para este producto</p>
          <button
            onClick={() => generateQR()}
            disabled={generating || !canGenerate}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 mx-auto disabled:opacity-50"
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
          {!canGenerate && (
            <p className="text-red-600 text-sm mt-2">
              Faltan datos obligatorios: titular, producto o marca
            </p>
          )}
        </div>
      )}

      {/* Vista previa del QR */}
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
                  {/* Código QR - 20mm × 20mm */}
                  <div
                    style={{
                      position: 'absolute',
                      top: `${qrModConfig.qrTop}px`,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '75px',
                      height: '75px'
                    }}
                  >
                    <img
                      src={qrDataUrl}
                      alt="Código QR"
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        imageRendering: 'pixelated'
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
            </div>

            {/* Vista digital */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Vista Previa Digital
              </h4>
              <div className="flex justify-center mb-4">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <img src={qrDataUrl} alt="QR Code Preview" className="w-32 h-32" />
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">Como se verá al escanear</p>
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
              {(product as any).qr_generated_at && (
                <div className="flex items-center">
                  <span className="text-blue-700 font-medium mr-2">Generado:</span>
                  <span className="text-blue-900">
                    {new Date((product as any).qr_generated_at).toLocaleString('es-AR')}
                  </span>
                </div>
              )}
            </div>
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
              onClick={testQR}
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

      {/* Modal de prueba local */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          {/* ... contenido del modal de prueba ... */}
        </div>
      )}
    </div>
  );
}