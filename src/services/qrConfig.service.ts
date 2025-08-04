// services/qrConfig.service.ts - Versión completa mejorada con auto-detección
import { supabase } from '../lib/supabase';

export interface QRConfig {
  baseUrl: string;
  environment: 'development' | 'production';
  lastUpdated: string;
}

class QRConfigService {
  private config: QRConfig | null = null;
  private listeners: ((config: QRConfig) => void)[] = [];
  private readonly STORAGE_KEY = 'qr_config';
  private readonly ENV_CONFIGS_KEY = 'qr_env_configs';

  constructor() {
    this.loadConfig();
    // Auto-detectar y actualizar si es necesario al iniciar
    this.autoDetectAndUpdateIfNeeded();
  }

  // Cargar configuración desde localStorage o usar default
  private loadConfig() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.config = JSON.parse(saved);
      } catch (error) {
        console.error('Error parsing QR config:', error);
        this.setDefaultConfig();
      }
    } else {
      this.setDefaultConfig();
    }
  }

  // Establecer configuración por defecto
  private setDefaultConfig() {
    const baseUrl = this.autoDetectBaseUrl();
    const isDevelopment = this.isDevEnvironment(baseUrl);
    
    this.config = {
      baseUrl,
      environment: isDevelopment ? 'development' : 'production',
      lastUpdated: new Date().toISOString()
    };
    
    this.saveConfig();
  }

  // Auto-detectar la URL base actual
  autoDetectBaseUrl(): string {
    const currentUrl = window.location.origin;
    
    // Si estamos en un WebContainer o entorno similar
    if (this.isDevEnvironment(currentUrl)) {
      return currentUrl;
    }
    
    // Para producción, usar el dominio configurado
    return 'https://verificar.argentina.gob.ar';
  }

  // Detectar si es un entorno de desarrollo
  private isDevEnvironment(url: string): boolean {
    return url.includes('localhost') || 
           url.includes('127.0.0.1') ||
           url.includes('webcontainer-api.io') ||
           url.includes('stackblitz.io') ||
           url.includes('codesandbox.io') ||
           url.includes('5173'); // Puerto común de Vite
  }

  // Auto-detectar y actualizar si es necesario
  private autoDetectAndUpdateIfNeeded() {
    if (!this.config) return;
    
    const currentUrl = window.location.origin;
    
    // Solo actualizar automáticamente si:
    // 1. Estamos en desarrollo
    // 2. La URL guardada también es de desarrollo
    // 3. La URL cambió (ej: nuevo WebContainer)
    if (this.isDevEnvironment(currentUrl) && 
        this.isDevEnvironment(this.config.baseUrl) && 
        this.config.baseUrl !== currentUrl) {
      
      console.log(`[QRConfig] Auto-actualizando URL de ${this.config.baseUrl} a ${currentUrl}`);
      this.updateConfig(currentUrl);
    }
  }

  // Obtener configuración actual
  getConfig(): QRConfig {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config!;
  }

  // Actualizar configuración
  updateConfig(baseUrl: string) {
    // Limpiar URL
    baseUrl = baseUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    const isDevelopment = this.isDevEnvironment(baseUrl);
    
    this.config = {
      baseUrl,
      environment: isDevelopment ? 'development' : 'production',
      lastUpdated: new Date().toISOString()
    };
    
    this.saveConfig();
    this.saveEnvironmentConfig(this.config.environment, baseUrl);
    this.notifyListeners();
  }

  // Guardar en localStorage
  private saveConfig() {
    if (this.config) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
    }
  }

  // Guardar configuración por entorno
  private saveEnvironmentConfig(environment: string, baseUrl: string) {
    const configs = this.getEnvironmentConfigs();
    configs[environment] = baseUrl;
    localStorage.setItem(this.ENV_CONFIGS_KEY, JSON.stringify(configs));
  }

  // Obtener configuraciones guardadas por entorno
  getEnvironmentConfigs(): Record<string, string> {
    const stored = localStorage.getItem(this.ENV_CONFIGS_KEY);
    return stored ? JSON.parse(stored) : {
      development: 'http://localhost:5173',
      production: 'https://verificar.argentina.gob.ar'
    };
  }

  // Generar URL para un producto
  generateProductUrl(codificacion: string): string {
    const config = this.getConfig();
    // Usar /products/ en lugar de /qr/
    return `${config.baseUrl}/products/${codificacion}`;
  }

  // Obtener sugerencias de URL
  getUrlSuggestions(): Array<{
    name: string;
    url: string;
    description: string;
    isRecommended?: boolean;
    isAutoDetected?: boolean;
  }> {
    const currentUrl = window.location.origin;
    const suggestions = [];
    
    // Siempre agregar la URL actual como primera opción
    suggestions.push({
      name: 'URL Actual (Auto-detectada)',
      url: currentUrl,
      description: 'URL detectada automáticamente del entorno actual',
      isRecommended: true,
      isAutoDetected: true
    });
    
    const envConfigs = this.getEnvironmentConfigs();
    
    // Agregar configuraciones guardadas si son diferentes
    if (envConfigs.production && envConfigs.production !== currentUrl) {
      suggestions.push({
        name: 'Producción',
        url: envConfigs.production,
        description: 'URL de producción guardada'
      });
    }
    
    if (envConfigs.development && envConfigs.development !== currentUrl && !currentUrl.includes('localhost')) {
      suggestions.push({
        name: 'Desarrollo Local',
        url: envConfigs.development,
        description: 'URL de desarrollo local'
      });
    }
    
    return suggestions;
  }

  // Verificar si una URL es válida
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Suscribirse a cambios de configuración
  subscribe(listener: (config: QRConfig) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notificar cambios
  private notifyListeners() {
    if (this.config) {
      this.listeners.forEach(listener => listener(this.config!));
    }
  }

  // Regenerar QR cuando cambia un producto
  async regenerateQRIfNeeded(product: any, oldProduct: any) {
    // Verificar si cambiaron datos relevantes para el QR
    const relevantFields = ['titular', 'producto', 'marca', 'modelo'];
    const hasChanges = relevantFields.some(field => product[field] !== oldProduct[field]);
    
    // También verificar si la URL base cambió
    const currentBaseUrl = this.getConfig().baseUrl;
    const qrUsesOldUrl = product.qr_link && !product.qr_link.startsWith(currentBaseUrl);
    
    return (hasChanges && product.qr_path) || qrUsesOldUrl;
  }

  // Verificar el estado de URL de un producto
  checkProductQRStatus(product: any): {
    needsUpdate: boolean;
    reason?: string;
    currentBase?: string;
    productBase?: string;
  } {
    if (!product.qr_link) {
      return { needsUpdate: false };
    }
    
    const currentConfig = this.getConfig();
    try {
      const productUrl = new URL(product.qr_link);
      const productBase = productUrl.origin;
      
      if (productBase !== currentConfig.baseUrl) {
        return {
          needsUpdate: true,
          reason: 'URL base desactualizada',
          currentBase: currentConfig.baseUrl,
          productBase
        };
      }
    } catch (error) {
      return { needsUpdate: false };
    }
    
    return { needsUpdate: false };
  }

  // Reset configuración
  reset() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.ENV_CONFIGS_KEY);
    this.loadConfig();
    this.notifyListeners();
  }
}

// Exportar instancia única (singleton)
export const qrConfigService = new QRConfigService();