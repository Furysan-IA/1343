// utils/envConfig.ts - Configuración automática según el entorno

export interface EnvironmentConfig {
  baseUrl: string;
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    debugMode: boolean;
    showDeploymentBanner: boolean;
    allowUrlOverride: boolean;
  };
}

class EnvironmentConfigService {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.detectEnvironment();
  }

  private detectEnvironment(): EnvironmentConfig {
    const hostname = window.location.hostname;
    const origin = window.location.origin;

    // Producción - argqr.com
    if (hostname === 'argqr.com' || hostname === 'www.argqr.com') {
      return {
        baseUrl: 'https://argqr.com',
        apiUrl: 'https://argqr.com/api',
        environment: 'production',
        features: {
          debugMode: false,
          showDeploymentBanner: false,
          allowUrlOverride: false
        }
      };
    }

    // Staging (si tienes un entorno de staging)
    if (hostname === 'staging.argqr.com') {
      return {
        baseUrl: 'https://staging.argqr.com',
        apiUrl: 'https://staging.argqr.com/api',
        environment: 'staging',
        features: {
          debugMode: true,
          showDeploymentBanner: true,
          allowUrlOverride: true
        }
      };
    }

    // Desarrollo local
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return {
        baseUrl: 'http://localhost:5173',
        apiUrl: 'http://localhost:5173/api',
        environment: 'development',
        features: {
          debugMode: true,
          showDeploymentBanner: true,
          allowUrlOverride: true
        }
      };
    }

    // WebContainer o entornos temporales
    if (hostname.includes('webcontainer') || hostname.includes('stackblitz')) {
      return {
        baseUrl: origin,
        apiUrl: `${origin}/api`,
        environment: 'development',
        features: {
          debugMode: true,
          showDeploymentBanner: true,
          allowUrlOverride: true
        }
      };
    }

    // Fallback - asumir desarrollo
    return {
      baseUrl: origin,
      apiUrl: `${origin}/api`,
      environment: 'development',
      features: {
        debugMode: true,
        showDeploymentBanner: true,
        allowUrlOverride: true
      }
    };
  }

  getConfig(): EnvironmentConfig {
    return this.config;
  }

  // Obtener URL base para QR codes
  getQRBaseUrl(): string {
    // Si estamos en desarrollo pero queremos generar QRs para producción
    const forceProduction = localStorage.getItem('qr-force-production') === 'true';
    
    if (forceProduction && this.config.environment !== 'production') {
      return 'https://argqr.com';
    }

    // Si hay una URL personalizada guardada y está permitido
    if (this.config.features.allowUrlOverride) {
      const customUrl = localStorage.getItem('qr-base-url');
      if (customUrl) {
        return customUrl;
      }
    }

    return this.config.baseUrl;
  }

  // Verificar si deberíamos mostrar advertencias
  shouldShowProductionWarning(): boolean {
    return this.config.environment !== 'production' && 
           this.getQRBaseUrl() !== 'https://argqr.com';
  }

  // Obtener mensaje de advertencia apropiado
  getWarningMessage(): string {
    if (this.config.environment === 'development') {
      return `Estás en modo desarrollo. Los QR codes apuntan a ${this.getQRBaseUrl()}. 
              Para producción, configura la URL base a https://argqr.com`;
    }
    
    if (this.config.environment === 'staging') {
      return `Estás en staging. Verifica que los QR codes apunten a la URL correcta antes de usarlos.`;
    }

    return '';
  }

  // Método para forzar URL de producción
  forceProductionUrls(enable: boolean = true): void {
    if (enable) {
      localStorage.setItem('qr-force-production', 'true');
      localStorage.setItem('qr-base-url', 'https://argqr.com');
    } else {
      localStorage.removeItem('qr-force-production');
    }
  }
}

// Exportar instancia única
export const envConfig = new EnvironmentConfigService();

// Hook para React
export function useEnvironmentConfig() {
  const config = envConfig.getConfig();
  const qrBaseUrl = envConfig.getQRBaseUrl();
  const showWarning = envConfig.shouldShowProductionWarning();
  const warningMessage = envConfig.getWarningMessage();

  return {
    ...config,
    qrBaseUrl,
    showWarning,
    warningMessage,
    forceProductionUrls: envConfig.forceProductionUrls.bind(envConfig)
  };
}