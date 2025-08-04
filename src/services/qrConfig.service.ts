// services/qrConfig.service.ts
import { supabase } from '../lib/supabase';

export interface QRConfig {
  baseUrl: string;
  environment: 'development' | 'production';
  lastUpdated: string;
}

class QRConfigService {
  private config: QRConfig | null = null;
  private listeners: ((config: QRConfig) => void)[] = [];

  constructor() {
    this.loadConfig();
  }

  // Cargar configuración desde localStorage o usar default
  private loadConfig() {
    const saved = localStorage.getItem('qr_config');
    if (saved) {
      this.config = JSON.parse(saved);
    } else {
      // Detectar entorno automáticamente
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
      
      this.config = {
        baseUrl: isDevelopment 
          ? 'http://localhost:3000' 
          : 'https://verificar.argentina.gob.ar',
        environment: isDevelopment ? 'development' : 'production',
        lastUpdated: new Date().toISOString()
      };
      
      this.saveConfig();
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
    this.config = {
      ...this.config!,
      baseUrl,
      lastUpdated: new Date().toISOString()
    };
    
    this.saveConfig();
    this.notifyListeners();
  }

  // Guardar en localStorage
  private saveConfig() {
    if (this.config) {
      localStorage.setItem('qr_config', JSON.stringify(this.config));
    }
  }

  // Generar URL para un producto
  generateProductUrl(codificacion: string): string {
    const config = this.getConfig();
    return `${config.baseUrl}/qr/${codificacion}`;
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
    
    if (hasChanges && product.qr_path) {
      // El producto ya tiene QR y cambió información relevante
      return true; // Indicar que se debe regenerar
    }
    
    return false;
  }
}

// Exportar instancia única (singleton)
export const qrConfigService = new QRConfigService();