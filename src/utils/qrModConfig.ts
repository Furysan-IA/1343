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
}

const DEFAULT_QR_MOD_CONFIG: QRModConfig = {
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

export function getQRModConfig(): QRModConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_QR_MOD_CONFIG;
  }
  
  const savedConfig = localStorage.getItem('qr-mod-config');
  if (savedConfig) {
    try {
      return { ...DEFAULT_QR_MOD_CONFIG, ...JSON.parse(savedConfig) };
    } catch (e) {
      console.error("Error parsing QR mod config from localStorage", e);
      return DEFAULT_QR_MOD_CONFIG;
    }
  }
  
  return DEFAULT_QR_MOD_CONFIG;
}