import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeModal } from './QRCodeModal';
import { qrConfigService } from '../services/qrConfig.service';
import { sharedQRService, Product as SharedProduct } from '../services/sharedQRService';
import {
  QrCode, RefreshCw, Download, CheckCircle, AlertCircle,
  Loader2, Eye, AlertTriangle, ExternalLink, Link as LinkIcon, Unlink, Search, X
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
  shared_qr_from: string | null;
  is_qr_master: boolean;
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

  // QR Sharing states
  const [showQRSharingSection, setShowQRSharingSection] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SharedProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestedBaseProduct, setSuggestedBaseProduct] = useState<SharedProduct | null>(null);
  const [productsUsingThisQR, setProductsUsingThisQR] = useState<SharedProduct[]>([]);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    checkIfQRNeedsRegeneration();
    checkForRevisionAndSuggest();
    loadProductsUsingThisQR();

    // Configurar suscripción Realtime para este producto específico
    const channel = supabase
      .channel(`product-qr-${product.codificacion}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `codificacion=eq.${product.codificacion}`
        },
        (payload) => {
          console.log('🔄 QR Realtime update for product:', payload);

          // Verificar si cambió información relevante del QR
          if (
            payload.new.qr_link !== payload.old?.qr_link ||
            payload.new.qr_status !== payload.old?.qr_status ||
            payload.new.qr_path !== payload.old?.qr_path
          ) {
            console.log('✅ QR data changed, triggering update');

            // Actualizar el link del QR si cambió
            if (payload.new.qr_link && payload.new.qr_link !== product.qr_link) {
              setQrLink(payload.new.qr_link);

              // Regenerar el QR visual con el nuevo link
              if (payload.new.qr_path) {
                setQrDataUrl(payload.new.qr_path);
              }
            }

            // Notificar al componente padre para actualizar
            onUpdate();

            toast.success('QR actualizado automáticamente', {
              icon: '✨',
              duration: 2000
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 QR Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [product]);

  const checkIfQRNeedsRegeneration = () => {
    console.log('🔍 Verificando si QR necesita regeneración...');
    console.log('📦 Product QR Link:', product.qr_link);
    console.log('📦 Product QR Status:', product.qr_status);
    console.log('📦 Product QR Path:', product.qr_path);
    
    // Check if QR needs regeneration based on configuration changes
    if (product.qr_link) {
      const currentConfig = qrConfigService.getConfig();
      console.log('⚙️ Current Config Base URL:', currentConfig.baseUrl);
      const needsUpdate = !product.qr_link.startsWith(currentConfig.baseUrl);
      console.log('🔄 Needs Update:', needsUpdate);
      setShouldRegenerateQR(needsUpdate);
      console.log('🎯 Should Regenerate QR set to:', needsUpdate);
    } else {
      console.log('❌ No QR link found, no regeneration needed');
      setShouldRegenerateQR(false);
    }
  };

  const canGenerateQR = () => {
    // Check if product has required fields for QR generation
    return product.titular && product.producto && product.marca;
  };

  const handleGenerateQR = async () => {
    console.log('🔄 Iniciando generación de QR...');
    console.log('📦 Producto:', product);
    
    if (!canGenerateQR()) {
      console.log('❌ No se puede generar QR - datos faltantes');
      console.log('📋 Datos del producto:', {
        titular: product.titular,
        producto: product.producto,
        marca: product.marca
      });
      toast.error('El producto debe tener titular, nombre y marca para generar QR');
      return;
    }

    console.log('✅ Verificación de datos pasada');
    console.log('🆔 UUID del producto:', product.uuid);
    
    setIsGenerating(true);
    try {
      // Generate product URL using UUID
      console.log('🔗 Generando URL del producto...');
      const productUrl = qrConfigService.generateProductUrl(product.uuid);
      console.log('🔗 URL generada:', productUrl);
      setQrLink(productUrl);

      // Generate QR code data URL
      console.log('🔲 Generando código QR...');
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
      console.log('🔲 QR generado exitosamente, tamaño:', dataUrl.length);
      setQrDataUrl(dataUrl);

      // Update product in Supabase
      console.log('💾 Actualizando producto en Supabase...');
      console.log('📝 Datos a actualizar:', {
        qr_link: productUrl,
        qr_status: 'Generado',
        codificacion: product.codificacion
      });
      
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

      if (error) {
        console.error('❌ Error de Supabase:', error);
        throw error;
      }
      
      console.log('✅ Producto actualizado en Supabase exitosamente');

      toast.success('Código QR generado exitosamente');
      setShouldRegenerateQR(false);
      onUpdate();
      console.log('🎉 Proceso de generación de QR completado');
    } catch (error: any) {
      console.error('❌ Error completo en generación de QR:', error);
      console.error('❌ Mensaje de error:', error.message);
      console.error('❌ Stack trace:', error.stack);
      toast.error(`Error al generar QR: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsGenerating(false);
      console.log('🏁 Finalizando proceso de generación de QR');
    }
  };

  const getQRStatus = () => {
    console.log('📊 Getting QR Status...');
    console.log('📦 Product QR Path:', product.qr_path);
    console.log('📦 Product QR Status:', product.qr_status);
    console.log('🔄 Should Regenerate QR:', shouldRegenerateQR);
    
    if (!product.qr_path) {
      console.log('🔴 Status: No generado');
      return {
        status: 'No generado',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: QrCode
      };
    }

    if (product.qr_status === 'Pendiente regeneración' || shouldRegenerateQR) {
      console.log('🟡 Status: Pendiente regeneración');
      return {
        status: 'Pendiente regeneración',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        icon: AlertCircle
      };
    }

    console.log('🟢 Status: Generado');
    return {
      status: 'Generado',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: CheckCircle
    };
  };

  const checkForRevisionAndSuggest = async () => {
    if (sharedQRService.isRevisionCode(product.codificacion) && !product.shared_qr_from) {
      const baseProduct = await sharedQRService.findBaseProduct(product.codificacion);
      if (baseProduct) {
        setSuggestedBaseProduct(baseProduct);
      }
    }
  };

  const loadProductsUsingThisQR = async () => {
    const products = await sharedQRService.getProductsUsingThisQR(product.codificacion);
    setProductsUsingThisQR(products);
  };

  const handleSearchProducts = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await sharedQRService.searchProductsWithQR(term);
      // Exclude current product and products already sharing
      const filtered = results.filter(
        p => p.codificacion !== product.codificacion && !p.shared_qr_from
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching products:', error);
      toast.error('Error al buscar productos');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLinkToSharedQR = async (sourceProduct: SharedProduct) => {
    setIsLinking(true);
    try {
      const result = await sharedQRService.linkProductToSharedQR(
        product.codificacion,
        sourceProduct.codificacion
      );

      if (result.success) {
        toast.success(`QR compartido desde ${sourceProduct.codificacion}`);
        setShowQRSharingSection(false);
        setSuggestedBaseProduct(null);
        onUpdate();
      } else {
        toast.error(result.error || 'Error al vincular QR');
      }
    } catch (error) {
      console.error('Error linking QR:', error);
      toast.error('Error inesperado al vincular QR');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkSharedQR = async () => {
    if (!confirm('¿Está seguro de desvincular este QR compartido? El producto volverá a usar su propio QR.')) {
      return;
    }

    setIsLinking(true);
    try {
      const result = await sharedQRService.unlinkSharedQR(product.codificacion);

      if (result.success) {
        toast.success('QR desvinculado correctamente');
        onUpdate();
      } else {
        toast.error(result.error || 'Error al desvincular QR');
      }
    } catch (error) {
      console.error('Error unlinking QR:', error);
      toast.error('Error inesperado al desvincular QR');
    } finally {
      setIsLinking(false);
    }
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

      {/* Shared QR Info - If product is using shared QR */}
      {product.shared_qr_from && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1">
              <LinkIcon className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-800 mb-1">
                  QR Compartido
                </p>
                <p className="text-sm text-blue-700">
                  Este producto está usando el código QR de: <span className="font-mono font-bold">{product.shared_qr_from}</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Los clientes que escaneen el QR físico del producto original verán este producto actualizado.
                </p>
              </div>
            </div>
            <button
              onClick={handleUnlinkSharedQR}
              disabled={isLinking}
              className="px-3 py-1.5 text-sm bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Unlink className="w-4 h-4" />
              Desvincular
            </button>
          </div>
        </div>
      )}

      {/* Products Using This QR - If other products are using this QR */}
      {productsUsingThisQR.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-800 mb-1">
                QR compartido por otros productos ({productsUsingThisQR.length})
              </p>
              <p className="text-sm text-green-700 mb-2">
                Los siguientes productos están usando el QR de este producto:
              </p>
              <div className="flex flex-wrap gap-2">
                {productsUsingThisQR.map(p => (
                  <span
                    key={p.codificacion}
                    className="px-2 py-1 bg-white text-green-700 rounded text-xs font-mono border border-green-300"
                  >
                    {p.codificacion}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Base Product - If revision detected */}
      {suggestedBaseProduct && !product.shared_qr_from && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-purple-800 mb-1">
                Revisión Detectada
              </p>
              <p className="text-sm text-purple-700 mb-3">
                Detectamos que este producto es una revisión. ¿Desea reutilizar el QR del producto original?
              </p>
              <div className="bg-white rounded p-3 mb-3">
                <p className="text-xs text-gray-600 mb-1">Producto original:</p>
                <p className="font-mono font-bold text-purple-900">{suggestedBaseProduct.codificacion}</p>
                <p className="text-sm text-gray-700">{suggestedBaseProduct.producto}</p>
                {suggestedBaseProduct.qr_link && (
                  <p className="text-xs text-gray-500 mt-1">
                    QR generado: {new Date(suggestedBaseProduct.qr_generated_at || '').toLocaleDateString('es-AR')}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleLinkToSharedQR(suggestedBaseProduct)}
                disabled={isLinking}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {isLinking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4" />
                    Reutilizar QR Original
                  </>
                )}
              </button>
            </div>
            <button
              onClick={() => setSuggestedBaseProduct(null)}
              className="text-purple-400 hover:text-purple-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* QR Sharing Section */}
      {!product.shared_qr_from && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
          <button
            onClick={() => setShowQRSharingSection(!showQRSharingSection)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-900">Reutilizar QR de Otro Producto</span>
            </div>
            <span className="text-sm text-gray-500">
              {showQRSharingSection ? 'Ocultar' : 'Mostrar'}
            </span>
          </button>

          {showQRSharingSection && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-gray-600">
                Si este producto es una revisión o actualización, puede reutilizar el QR de un producto anterior.
                Esto permite mantener el mismo código QR físico mientras se muestra información actualizada.
              </p>

              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchProducts(e.target.value)}
                  placeholder="Buscar por código, nombre, marca..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-600 animate-spin" />
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.codificacion}
                      className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                      onClick={() => handleLinkToSharedQR(result)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-mono font-bold text-gray-900">{result.codificacion}</p>
                          <p className="text-sm text-gray-700">{result.producto}</p>
                          <p className="text-xs text-gray-500">{result.marca} {result.modelo}</p>
                          {result.qr_generated_at && (
                            <p className="text-xs text-green-600 mt-1">
                              QR generado: {new Date(result.qr_generated_at).toLocaleDateString('es-AR')}
                            </p>
                          )}
                        </div>
                        <LinkIcon className="w-5 h-5 text-purple-600" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchTerm.length >= 2 && searchResults.length === 0 && !isSearching && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No se encontraron productos con QR generado
                </p>
              )}
            </div>
          )}
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