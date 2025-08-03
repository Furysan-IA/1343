// components/QRConfigModal.tsx
import { useState, useEffect } from 'react';
import { Settings, Save, X, Globe, Server } from 'lucide-react';
import { qrConfigService } from '../services/qrConfig.service';
import toast from 'react-hot-toast';

interface QRConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRConfigModal({ isOpen, onClose }: QRConfigModalProps) {
  const [baseUrl, setBaseUrl] = useState('');
  const [environment, setEnvironment] = useState<'development' | 'production'>('production');
  
  // Presets de URLs comunes
  const urlPresets = [
    { 
      name: 'Producción Argentina', 
      url: 'https://verificar.argentina.gob.ar',
      icon: Globe,
      description: 'Sitio oficial de verificación'
    },
    { 
      name: 'Desarrollo Local', 
      url: 'http://localhost:3000',
      icon: Server,
      description: 'Para pruebas locales'
    },
    { 
      name: 'Staging', 
      url: 'https://staging.verificar.argentina.gob.ar',
      icon: Server,
      description: 'Ambiente de pruebas'
    }
  ];

  useEffect(() => {
    if (isOpen) {
      const config = qrConfigService.getConfig();
      setBaseUrl(config.baseUrl);
      setEnvironment(config.environment);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!baseUrl) {
      toast.error('La URL base es requerida');
      return;
    }

    try {
      qrConfigService.updateConfig(baseUrl);
      toast.success('Configuración guardada correctamente');
      onClose();
    } catch (error) {
      toast.error('Error al guardar la configuración');
    }
  };

  const selectPreset = (url: string) => {
    setBaseUrl(url);
    const isDev = url.includes('localhost');
    setEnvironment(isDev ? 'development' : 'production');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6" />
              <h2 className="text-xl font-bold">Configuración de URLs para QR</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://ejemplo.com"
              />
              <div className="absolute right-3 top-3">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  environment === 'development' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {environment === 'development' ? 'Desarrollo' : 'Producción'}
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Esta URL se usará como base para generar los enlaces de los códigos QR
            </p>
          </div>

          {/* Presets */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">URLs Predefinidas</h3>
            <div className="grid gap-3">
              {urlPresets.map((preset) => (
                <button
                  key={preset.url}
                  onClick={() => selectPreset(preset.url)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    baseUrl === preset.url
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <preset.icon className={`w-5 h-5 mt-0.5 ${
                      baseUrl === preset.url ? 'text-purple-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{preset.name}</p>
                      <p className="text-sm text-gray-600">{preset.url}</p>
                      <p className="text-xs text-gray-500 mt-1">{preset.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Vista previa */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Vista Previa del Link</h3>
            <div className="bg-white rounded border border-gray-200 p-3">
              <p className="text-sm font-mono text-gray-600 break-all">
                {baseUrl}/products/[CODIGO_PRODUCTO]
              </p>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Ejemplo: {baseUrl}/products/PROD-2025-001
            </p>
          </div>

          {/* Información importante */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-1">Información Importante</h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Esta configuración afectará todos los QR generados a partir de ahora</li>
              <li>Los QR existentes mantendrán sus URLs originales</li>
              <li>La URL se compartirá con el módulo de DJC</li>
              <li>Los cambios se aplicarán inmediatamente</li>
            </ul>
          </div>
        </div>

        <div className="border-t p-6 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}