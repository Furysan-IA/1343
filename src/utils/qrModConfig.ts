// src/utils/qrModConfig.ts
export interface QRModConfig {
  qrTop: number;
  arBottom: number;
  arSize: number;
  arGap: number;
  checkHeight: number;
  checkOverlap: number;
  fontFamily: string;
  fontSize: number;
  useImage: boolean;
  imagePath: string;
  customFontUrl?: string;
}

export function getQRModConfig(): QRModConfig {
  // Valores por defecto
  const defaultConfig: QRModConfig = {
    qrTop: 3,
    arBottom: 9,
    arSize: 19,
    arGap: 3,
    checkHeight: 10,
    checkOverlap: -0.5,
    fontFamily: 'AR-Monserrat-Arabic',
    fontSize: 16,
    useImage: false,
    imagePath: '/src/assets/images/AR-Monserrat-arabic.png'
  };

  // Si está activado el modo QRMod, usar la configuración guardada
  const isApplied = localStorage.getItem('qr-mod-apply') === 'true';
  
  if (isApplied) {
    const savedConfig = localStorage.getItem('qr-mod-config');
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch (e) {
        console.error('Error parsing QR mod config:', e);
      }
    }
  }

  return defaultConfig;
}