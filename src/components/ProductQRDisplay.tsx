import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeModal } from './QRCodeModal';
import { qrConfigService } from '../services/qrConfig.service';
import { 
  QrCode, RefreshCw, Download, CheckCircle, AlertCircle, 
  Loader2, Eye, AlertTriangle, ExternalLink 
} from 'lucide-react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

interface Product {
  codificacion: string;
  uuid: string;
  cuit: number;
  titular: string | null;
  producto: string | null;
  marca: string | null;
  modelo: string | null;
  qr_path: string | null;
  qr_link: string | null;
  qr_status: string | null;
  qr_generated_at: string | null;
  updated_at: string;
}

interface ProductQRDisplayProps {
  product: Product;
  onUpdate: () => void;
}

export function ProductQRDisplay({ product, onUpdate }: ProductQRDisplayProps) {
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrLink, setQrLink] = useState<string>('');
  const [shouldRegenerateQR, setShouldRegenerateQR] = useState(false);

  useEffect(() => {
    checkIfQRNeedsRegeneration();
  }, [product]);

  const checkIfQRNeedsRegeneration = () => {
    // Check if QR needs regeneration based on configuration changes
    if (product.qr_link) {
      const currentConfig = qrConfigService.getConfig();
      const needsUpdate = !product.qr_link.startsWith(currentConfig.baseUrl);
      setShouldRegenerateQR(needsUpdate);
    }
  };

  const canGenerateQR = () => {
    // Check if product has required fields for QR generation
    return product.titular && product.producto && product.marca;
  };

  const handleGenerateQR = async () => {
    if (!canGenerateQR()) {
      toast.error('El producto debe tener titular, nombre y marca para generar QR');
      return;
    }

    setIsGenerating(true);
    try {
      // Generate product URL using UUID
      const productUrl = qrConfigService.generateProductUrl(product.uuid);
      setQrLink(productUrl);

      // Generate QR code data URL
      const dataUrl = await QRCode.toDataURL(productUrl, {
        type: 'image/png',
        width: 1000,
        margin: 0,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrDataUrl(dataUrl);

      // Update product in Supabase
      const { error } = await supabase
        .from('products')
        .update({
          qr_link: productUrl,
          qr_path: dataUrl,
          qr_status: 'Generado',
          qr_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('codificacion', product.codificacion);

      if (error) throw error;

      toast.success('Código QR generado exitosamente');
      setShouldRegenerateQR(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error generating QR:', error);
      toast.error(`Error al generar QR: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const getQRStatus = () => {
    if (!product.qr_path) {
      return {
        status: 'No generado',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: QrCode
      };
    }

    if (product.qr_status === 'Pendiente regeneración' || shouldRegenerateQR) {
      return {
        status: 'Pendiente regeneración',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        icon: AlertCircle
      };
    }

    return {
      status: 'Generado',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: CheckCircle
    };
  };

  const qrStatus = getQRStatus();
  const StatusIcon = qrStatus.icon;

  return (
    <div className="space-y-6">
      {/* QR Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Estado del Código QR</h3>
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${qrStatus.color}`} />
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${qrStatus.bgColor} ${qrStatus.color}`}>
              {qrStatus.status}
            </span>
          </div>
        </div>

        {/* QR Information */}
        <div className="space-y-3">
          {product.qr_link && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL del QR
              </label>
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <input
                  type="text"
                  value={product.qr_link}
                  readOnly
                  className="flex-1 text-sm text-gray-600 bg-transparent outline-none"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(product.qr_link!)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Copiar
                </button>
                <a
                  href={product.qr_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {product.qr_generated_at && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de generación
              </label>
              <p className="text-sm text-gray-600">
                {new Date(product.qr_generated_at).toLocaleString('es-AR')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Missing Fields Warning */}
      {!canGenerateQR() && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 mb-1">
                Datos faltantes para generar QR
              </p>
              <ul className="list-disc list-inside text-sm text-red-700">
                {!product.titular && <li>Titular</li>}
                {!product.producto && <li>Nombre del producto</li>}
                {!product.marca && <li>Marca</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Regeneration Warning */}
      {shouldRegenerateQR && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-800 mb-1">
                QR necesita regeneración
              </p>
              <p className="text-sm text-orange-700">
                La configuración de URL base ha cambiado. Se recomienda regenerar el código QR.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleGenerateQR}
          disabled={!canGenerateQR() || isGenerating}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            canGenerateQR() && !isGenerating
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generando QR...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              {product.qr_path ? 'Regenerar QR' : 'Generar QR'}
            </>
          )}
        </button>

        {product.qr_path && (
          <button
            onClick={() => setShowQRCodeModal(true)}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-5 h-5" />
            Ver y Descargar QR
          </button>
        )}
      </div>

      {/* Current Configuration Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Configuración Actual</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>
            <span className="font-medium">URL base:</span> {qrConfigService.getConfig().baseUrl}
          </p>
          <p>
            <span className="font-medium">Entorno:</span> {qrConfigService.getConfig().environment}
          </p>
          {product.uuid && (
            <p>
              <span className="font-medium">URL del producto:</span> {qrConfigService.generateProductUrl(product.uuid)}
            </p>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRCodeModal && product.qr_link && (
        <QRCodeModal
          isOpen={showQRCodeModal}
          onClose={() => setShowQRCodeModal(false)}
          qrLink={product.qr_link}
          productName={product.producto || 'Producto'}
        />
      )}
    </div>
  );
}