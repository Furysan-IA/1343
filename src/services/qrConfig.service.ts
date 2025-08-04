// services/qrConfig.service.ts - Servicio actualizado con soporte para argqr.com
class QRConfigService {
  private readonly STORAGE_KEY = 'qr-base-url';
  private readonly DEFAULT_PROD_URL = 'https://argqr.com';
  private readonly DEFAULT_DEV_URL = 'http://localhost:5173';
  private listeners: ((config: any) => void)[] = [];

  constructor() {
    // Intentar detectar y configurar la URL base inicial
    this.initializeBaseUrl();
  }

  private initializeBaseUrl(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      // Si no hay configuración guardada, detectar automáticamente
      const detectedUrl = this.autoDetectBaseUrl();
      this.updateConfig(detectedUrl);
    }
  }

  getConfig(): { baseUrl: string; environment: 'development' | 'production' } {
    const baseUrl = localStorage.getItem(this.STORAGE_KEY) || this.autoDetectBaseUrl();
    const environment = this.detectEnvironment(baseUrl);
    
    return {
      baseUrl,
      environment
    };
  }

  updateConfig(baseUrl: string): void {
    // Normalizar URL (quitar trailing slash)
    const normalizedUrl = baseUrl.replace(/\/$/, '');
    
    localStorage.setItem(this.STORAGE_KEY, normalizedUrl);
    
    // Notificar a los listeners
    this.notifyListeners();
  }

  generateProductUrl(productUuid: string): string {
    const { baseUrl } = this.getConfig();
    return `${baseUrl}/products/${productUuid}`;
  }

  autoDetectBaseUrl(): string {
    const currentUrl = window.location.origin;
    
    // Detectar entornos conocidos
    if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
      return this.DEFAULT_DEV_URL;
    }
    
    if (currentUrl.includes('webcontainer-api.io') || currentUrl.includes('stackblitz.io')) {
      // En WebContainer, usar la URL actual
      return currentUrl;
    }
    
    if (currentUrl.includes('argqr.com')) {
      return this.DEFAULT_PROD_URL;
    }
    
    // Si es un dominio de producción desconocido, usar ese dominio
    if (!currentUrl.includes('localhost') && !currentUrl.includes('127.0.0.1')) {
      return currentUrl;
    }
    
    // Fallback
    return currentUrl;
  }

  detectEnvironment(url: string): 'development' | 'production' {
    if (
      url.includes('localhost') || 
      url.includes('127.0.0.1') ||
      url.includes('webcontainer') ||
      url.includes('stackblitz') ||
      url.includes('5173')
    ) {
      return 'development';
    }
    
    return 'production';
  }

  getUrlSuggestions(): Array<{
    name: string;
    url: string;
    description: string;
    isAutoDetected?: boolean;
    isRecommended?: boolean;
  }> {
    const currentUrl = window.location.origin;
    const suggestions = [];
    
    // URL de producción principal (argqr.com)
    suggestions.push({
      name: 'Producción - argqr.com',
      url: this.DEFAULT_PROD_URL,
      description: 'URL de producción oficial',
      isRecommended: true
    });
    
    // URL actual si es diferente
    if (currentUrl !== this.DEFAULT_PROD_URL && currentUrl !== this.DEFAULT_DEV_URL) {
      suggestions.push({
        name: 'URL Actual',
        url: currentUrl,
        description: 'URL detectada del navegador actual',
        isAutoDetected: true
      });
    }
    
    // Desarrollo local
    suggestions.push({
      name: 'Desarrollo Local',
      url: this.DEFAULT_DEV_URL,
      description: 'Para pruebas en localhost'
    });
    
    // WebContainer si estamos en ese entorno
    if (currentUrl.includes('webcontainer-api.io')) {
      suggestions.push({
        name: 'WebContainer Actual',
        url: currentUrl,
        description: 'URL temporal de WebContainer',
        isAutoDetected: true
      });
    }
    
    // URLs alternativas comunes
    suggestions.push({
      name: 'Desarrollo - IP Local',
      url: 'http://127.0.0.1:5173',
      description: 'Alternativa para desarrollo local'
    });
    
    return suggestions;
  }

  isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  subscribe(listener: (config: any) => void): () => void {
    this.listeners.push(listener);
    
    // Retornar función para desuscribirse
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const config = this.getConfig();
    this.listeners.forEach(listener => listener(config));
  }

  // Método para migrar QRs existentes a nueva URL
  async migrateExistingQRs(oldBaseUrl: string, newBaseUrl: string): Promise<{
    total: number;
    migrated: number;
    failed: number;
  }> {
    // Este método sería usado para actualizar QRs en la base de datos
    // Por ahora solo retorna un placeholder
    console.log(`Migración de QRs: ${oldBaseUrl} → ${newBaseUrl}`);
    
    return {
      total: 0,
      migrated: 0,
      failed: 0
    };
  }

  // Método para verificar si un QR necesita actualización
  needsUpdate(existingQrUrl: string): boolean {
    const { baseUrl } = this.getConfig();
    return !existingQrUrl.startsWith(baseUrl);
  }

  // Obtener información de deployment
  getDeploymentInfo(): {
    isProduction: boolean;
    isPrimaryDomain: boolean;
    currentDomain: string;
    recommendedUrl: string;
  } {
    const currentUrl = window.location.origin;
    const isProduction = this.detectEnvironment(currentUrl) === 'production';
    const isPrimaryDomain = currentUrl === this.DEFAULT_PROD_URL;
    
    return {
      isProduction,
      isPrimaryDomain,
      currentDomain: currentUrl,
      recommendedUrl: isProduction ? this.DEFAULT_PROD_URL : currentUrl
    };
  }

  // Método para regenerar QR cuando cambia un producto
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
    this.initializeBaseUrl();
    this.notifyListeners();
  }
}

// Exportar instancia única (singleton)
export const qrConfigService = new QRConfigService();