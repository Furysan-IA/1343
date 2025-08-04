// components/QRConfigModal.tsx - Versión completa mejorada con auto-detección
import { useState, useEffect } from 'react';
import { Settings, Save, X, Globe, Server, Zap, CheckCircle, AlertCircle, Copy, RefreshCw, ExternalLink, Activity } from 'lucide-react';
import { qrConfigService } from '../services/qrConfig.service';
import toast from 'react-hot-toast';

interface QRConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRConfigModal({ isOpen, onClose }: QRConfigModalProps) {
  const [baseUrl, setBaseUrl] = useState('');
  const [environment, setEnvironment] = useState<'development' | 'production'>('production');
  const [isValidating, setIsValidating] = useState(false);
  const [urlStatus, setUrlStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  
  // Obtener sugerencias de URL dinámicamente
  const urlPresets = qrConfigService.getUrlSuggestions();

  useEffect(() => {
    if (isOpen) {
      const config = qrConfigService.getConfig();
      setBaseUrl(config.baseUrl);
      setEnvironment(config.environment);
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      // Restaurar scroll del body cuando el modal se cierra
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Validar URL en tiempo real
  useEffect(() => {
    if (baseUrl) {
      validateUrl();
    } else {
      setUrlStatus('idle');
    }
  }, [baseUrl]);

  const handleAutoDetect = () => {
    const detectedUrl = qrConfigService.autoDetectBaseUrl();
    setBaseUrl(detectedUrl);
    
    // Determinar automáticamente el entorno
    const currentUrl = window.location.origin;
    if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
      setEnvironment('development');
      toast.success('URL de desarrollo local detectada');
    } else if (currentUrl.includes('webcontainer-api.io') || currentUrl.includes('stackblitz.io')) {
      setEnvironment('development');
      toast.success('URL de WebContainer detectada');
    } else {
      setEnvironment('production');
      toast.success('URL de producción detectada');
    }
  };

  const validateUrl = async () => {
    if (!baseUrl || baseUrl.trim() === '') {
      setUrlStatus('idle');
      return;
    }

    setIsValidating(true);
    
    try {
      const isValid = qrConfigService.isValidUrl(baseUrl);
      setUrlStatus(isValid ? 'valid' : 'invalid');
    } catch (error) {
      setUrlStatus('invalid');
    } finally {
      setIsValidating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(baseUrl);
      toast.success('URL copiada al portapapeles');
    } catch (error) {
      toast.error('Error al copiar la URL');
    }
  };

  const handleSave = () => {
    if (!baseUrl || baseUrl.trim() === '') {
      toast.error('La URL base es requerida');
      return;
    }

    if (urlStatus === 'invalid') {
      toast.error('La URL no tiene un formato válido');
      return;
    }

    try {
      qrConfigService.updateConfig(baseUrl.trim());
      toast.success('Configuración guardada correctamente');
      
      // Mostrar información adicional
      toast((t) => (
        <div>
          <p className="font-medium">Configuración actualizada</p>
          <p className="text-sm mt-1">
            Los nuevos QR usarán: <span className="font-mono text-xs break-all">{baseUrl}</span>
          </p>
          <p className="text-sm mt-2 text-orange-600">
            Los QR existentes mantendrán sus URLs originales hasta que se regeneren.
          </p>
        </div>
      ), {
        duration: 6000,
        icon: '🔗'
      });
      
      onClose();
    } catch (error) {
      toast.error('Error al guardar la configuración');
    }
  };

  const selectPreset = (preset: any) => {
    setBaseUrl(preset.url);
    const isDev = preset.url.includes('localhost') || 
                  preset.url.includes('webcontainer') ||
                  preset.url.includes('5173');
    setEnvironment(isDev ? 'development' : 'production');
  };

  const testUrl = () => {
    if (baseUrl) {
      const testUrl = `${baseUrl}/products/TEST-001`;
      window.open(testUrl, '_blank');
      toast.info('Abriendo URL de prueba en nueva pestaña');
    }
  };

  const getEnvironmentLabel = () => {
    const currentUrl = window.location.origin;
    if (currentUrl.includes('webcontainer-api.io')) return 'WebContainer';
    if (currentUrl.includes('stackblitz.io')) return 'StackBlitz';
    if (currentUrl.includes('localhost')) return 'Desarrollo Local';
    if (currentUrl.includes('5173')) return 'Vite Dev';
    return 'Producción';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Contenedor del modal */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-4 sm:p-6 rounded-t-xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
              <h2 className="text-lg sm:text-xl font-bold">Configuración de URLs para QR</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* URL Base actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Base Actual
            </label>
            <div className="relative">
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSave();
                  }
                }}
                className={`w-full pl-10 pr-32 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base ${
                  urlStatus === 'invalid' ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="https://ejemplo.com"
                autoComplete="off"
              />
              
              {/* Icono de estado */}
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                {isValidating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent" />
                ) : urlStatus === 'valid' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : urlStatus === 'invalid' ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Globe className="w-4 h-4 text-gray-400" />
                )}
              </div>

              {/* Botones de acción */}
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={copyToClipboard}
                  className="p-1.5 text-gray-500 hover:text-gray-700 rounded"
                  title="Copiar URL"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleAutoDetect}
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 flex items-center gap-1"
                >
                  <Zap className="w-4 h-4" />
                  Auto
                </button>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  environment === 'development' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {environment === 'development' ? 'Dev' : 'Prod'}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Esta URL se usará como base para generar los enlaces de los códigos QR
            </p>
            {urlStatus === 'invalid' && (
              <p className="mt-1 text-xs sm:text-sm text-red-600">
                La URL no tiene un formato válido
              </p>
            )}
          </div>

          {/* Presets de URLs */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-3">URLs Sugeridas</h3>
            <div className="grid gap-2 sm:gap-3">
              {urlPresets.map((preset, index) => {
                const Icon = preset.isAutoDetected ? Zap : Globe;
                return (
                  <button
                    key={preset.url + index}
                    onClick={() => selectPreset(preset)}
                    className={`p-3 sm:p-4 rounded-lg border-2 transition-all text-left ${
                      baseUrl === preset.url
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${preset.isRecommended ? 'ring-2 ring-purple-200' : ''}`}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 ${
                        baseUrl === preset.url ? 'text-purple-600' : 'text-gray-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 text-sm sm:text-base">{preset.name}</p>
                          {preset.isAutoDetected && (
                            <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                              Detectada
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 break-all">{preset.url}</p>
                        <p className="text-xs text-gray-500 mt-1">{preset.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vista previa con botón de prueba */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Vista Previa del Link</h3>
            <div className="bg-white rounded border border-gray-200 p-2 sm:p-3">
              <p className="text-xs sm:text-sm font-mono text-gray-600 break-all">
                {baseUrl || 'https://ejemplo.com'}/products/[CODIGO_PRODUCTO]
              </p>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Ejemplo: {baseUrl || 'https://ejemplo.com'}/products/PROD-2025-001
            </p>
            
            {/* Botones de prueba */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={testUrl}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
                disabled={!baseUrl || urlStatus === 'invalid'}
              >
                <ExternalLink className="w-4 h-4" />
                Probar URL
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch(`${baseUrl}/api/health`, { 
                      method: 'HEAD',
                      mode: 'no-cors' 
                    });
                    toast.success('La URL parece estar activa');
                  } catch (error) {
                    toast.warning('No se pudo verificar la URL (esto es normal en desarrollo)');
                  }
                }}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 flex items-center gap-1"
                disabled={!baseUrl || urlStatus === 'invalid'}
              >
                <Activity className="w-4 h-4" />
                Verificar
              </button>
            </div>
          </div>

          {/* Información importante */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-1">Información Importante</h4>
            <ul className="text-xs sm:text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Esta configuración afectará todos los QR generados a partir de ahora</li>
              <li>Los QR existentes mantendrán sus URLs originales</li>
              <li>En WebContainer, usa el botón "Auto" para detectar la URL actual</li>
              <li>Los cambios se aplicarán inmediatamente</li>
            </ul>
          </div>

          {/* Estado del entorno */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4">
            <h4 className="text-sm font-medium text-purple-900 mb-2">Estado del Entorno</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-purple-700">Entorno detectado:</span>
                <p className="font-medium text-purple-900">{getEnvironmentLabel()}</p>
              </div>
              <div>
                <span className="text-purple-700">URL del navegador:</span>
                <p className="font-mono text-xs text-purple-900 break-all">
                  {window.location.origin}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 sm:p-6 bg-gray-50 flex flex-col sm:flex-row justify-end gap-3 rounded-b-xl flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm sm:text-base"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!baseUrl || urlStatus === 'invalid'}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}