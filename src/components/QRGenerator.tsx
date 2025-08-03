// QRGenerator.tsx - Versión actualizada
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { qrConfigService } from '../services/qrConfig.service';
import { QRConfigModal } from './QRConfigModal';
import QRCode from 'qrcode';
import { 
  QrCode, Download, Eye, Copy, CheckCircle, Settings,
  TestTube, Smartphone, ExternalLink, AlertCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  showRegenerateAlert?: boolean; // Para mostrar alerta de regeneración
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

  const downloadLabel = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Tamaño de la etiqueta en alta resolución (300dpi)
    canvas.width = 295;  // 25mm a 300dpi
    canvas.height = 354; // 30mm a 300dpi

    // Fondo blanco
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Borde negro
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Dibujar QR
    const qrImage = new Image();
    qrImage.onload = () => {
      const qrSize = 225;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 40;
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

      // Dibujar logo AR
      const logoY = canvas.height - 80;
      
      // Texto "AR"
      ctx.font = 'bold 60px Arial';
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.fillText('AR', canvas.width / 2 - 40, logoY);

      // Dibujar checkmarks
      ctx.strokeStyle = '#73A8D8';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Primer checkmark
      ctx.beginPath();
      ctx.moveTo(190, logoY - 45);
      ctx.lineTo(210, logoY - 25);
      ctx.lineTo(250, logoY - 65);
      ctx.stroke();
      
      // Segundo checkmark
      ctx.beginPath();
      ctx.moveTo(190, logoY - 15);
      ctx.lineTo(210, logoY + 5);
      ctx.lineTo(250, logoY - 35);
      ctx.stroke();

      // Descargar
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `etiqueta-qr-${product.codificacion}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };
    qrImage.src = qrDataUrlHighRes;
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
                  className="bg-white border-2 border-black rounded-lg p-2"
                  style={{ width: '94px', height: '113px' }}
                >
                  <div className="h-full flex flex-col items-center justify-between">
                    <div className="flex-1" />
                    <img src={qrDataUrl} alt="QR Code" className="w-[75px] h-[75px]" />
                    <div className="flex-1" />
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xl">AR</span>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                        <path d="M3 12L9 18L21 6" stroke="#73A8D8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(0, -3)"/>
                        <path d="M3 12L9 18L21 6" stroke="#73A8D8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(0, 4)"/>
                      </svg>
                    </div>
                    <div className="flex-[0.5]" />
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
              onClick={downloadLabel}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar Etiqueta
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