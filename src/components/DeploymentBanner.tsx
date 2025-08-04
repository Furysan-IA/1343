// components/DeploymentBanner.tsx - Banner informativo sobre el estado del deployment
import { useState, useEffect } from 'react';
import { qrConfigService } from '../services/qrConfig.service';
import { Globe, AlertCircle, CheckCircle, X, ExternalLink } from 'lucide-react';

export function DeploymentBanner() {
  const [deploymentInfo, setDeploymentInfo] = useState(qrConfigService.getDeploymentInfo());
  const [isVisible, setIsVisible] = useState(true);
  const [config, setConfig] = useState(qrConfigService.getConfig());

  useEffect(() => {
    // Actualizar cuando cambie la configuración
    const unsubscribe = qrConfigService.subscribe((newConfig) => {
      setConfig(newConfig);
      setDeploymentInfo(qrConfigService.getDeploymentInfo());
    });

    return unsubscribe;
  }, []);

  // No mostrar si está cerrado o si ya está en producción con la URL correcta
  if (!isVisible || (deploymentInfo.isPrimaryDomain && config.baseUrl === 'https://argqr.com')) {
    return null;
  }

  // Mostrar banner si estamos en desarrollo o si la URL no es la de producción
  const showBanner = !deploymentInfo.isPrimaryDomain || config.baseUrl !== 'https://argqr.com';

  if (!showBanner) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-40 ${
      deploymentInfo.isProduction ? 'bg-green-50 border-b border-green-200' : 'bg-yellow-50 border-b border-yellow-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {deploymentInfo.isProduction ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            
            <div className="flex items-center gap-4">
              <p className={`text-sm font-medium ${
                deploymentInfo.isProduction ? 'text-green-800' : 'text-yellow-800'
              }`}>
                {deploymentInfo.isProduction ? 'Modo Producción' : 'Modo Desarrollo'}
              </p>
              
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  Dominio actual: <code className="bg-white px-2 py-0.5 rounded text-xs">
                    {deploymentInfo.currentDomain}
                  </code>
                </span>
              </div>

              {config.baseUrl !== deploymentInfo.recommendedUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    URL QR configurada: <code className="bg-white px-2 py-0.5 rounded text-xs">
                      {config.baseUrl}
                    </code>
                  </span>
                  {config.baseUrl !== 'https://argqr.com' && deploymentInfo.isProduction && (
                    <button
                      onClick={() => {
                        qrConfigService.updateConfig('https://argqr.com');
                        window.location.reload();
                      }}
                      className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                    >
                      Cambiar a argqr.com
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {deploymentInfo.currentDomain.includes('webcontainer') && (
              <a
                href="https://argqr.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                Ver producción
              </a>
            )}
            
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mensaje adicional para WebContainer */}
        {deploymentInfo.currentDomain.includes('webcontainer') && (
          <div className="mt-2 text-xs text-gray-600 bg-white/50 rounded p-2">
            <p>
              <strong>Nota:</strong> Estás en un entorno de desarrollo temporal. 
              Los códigos QR generados aquí deberían configurarse para apuntar a{' '}
              <code className="bg-yellow-100 px-1 rounded">https://argqr.com</code> antes de usarse en producción.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}