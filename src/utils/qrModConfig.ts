// src/utils/qrModConfig.ts - Configuración actualizada con nuevas propiedades
export interface QRModConfig {
  // Etiqueta
  labelWidth: number;
  labelHeight: number;
  labelBorderRadius: number;
  labelBorderWidth: number;
  labelPaddingTop: number;
  labelPaddingBottom: number;
  labelPaddingLeft: number;
  labelPaddingRight: number;
  
  // QR
  qrSize: number;
  qrTop: number;
  qrLeft: number;
  qrCenterHorizontally: boolean;
  
  // AR
  arBottom: number;
  arSize: number;
  arGap: number;
  arOffsetX: number;
  arOffsetY: number;
  fontSize: number;
  fontFamily: string;
  useImage: boolean;
  imagePath: string;
  customFontUrl?: string;
  
  // Tildes/Símbolos
  checkHeight: number;
  checkOverlap: number;
  checkWidth: number;
  checkStrokeWidth: number;
  checkSpacingVertical: number;
  tildeOffsetX: number;
  tildeOffsetY: number;
  
  // Símbolos avanzados
  symbolCount: number;
  symbol1Angle: number;
  symbol2Angle: number;
  symbolSize: number;
  useIndividualSize: boolean;
  symbol1Size: number;
  symbol2Size: number;
  useIndividualControl: boolean;
  symbol1X: number;
  symbol1Y: number;
  symbol2X: number;
  symbol2Y: number;
  
  // Fuente
  fontWeight: string;
  letterSpacing: number;
  textTransform: string;
  arText: string;
  
  // Colores
  useCMYK: boolean;
  cmyk: { c: number; m: number; y: number; k: number };
  checkColor: string;
}

export function getQRModConfig(): QRModConfig {
  // Valores por defecto
  const defaultConfig: QRModConfig = {
    // Etiqueta
    labelWidth: 94,
    labelHeight: 113,
    labelBorderRadius: 8,
    labelBorderWidth: 1,
    labelPaddingTop: 0,
    labelPaddingBottom: 0,
    labelPaddingLeft: 0,
    labelPaddingRight: 0,
    
    // QR
    qrSize: 75,
    qrTop: 3,
    qrLeft: 9.5,
    qrCenterHorizontally: true,
    
    // AR
    arBottom: 9,
    arSize: 19,
    arGap: 3,
    arOffsetX: 0,
    arOffsetY: 0,
    fontSize: 16,
    fontFamily: 'AR-Monserrat-Arabic',
    useImage: false,
    imagePath: '/src/assets/images/AR-Monserrat-arabic.png',
    
    // Tildes/Símbolos
    checkHeight: 10,
    checkOverlap: -0.5,
    checkWidth: 19,
    checkStrokeWidth: 2.2,
    checkSpacingVertical: -0.5,
    tildeOffsetX: 0,
    tildeOffsetY: 0,
    
    // Símbolos avanzados
    symbolCount: 2,
    symbol1Angle: 0,
    symbol2Angle: 0,
    symbolSize: 100,
    useIndividualSize: false,
    symbol1Size: 100,
    symbol2Size: 100,
    useIndividualControl: false,
    symbol1X: 0,
    symbol1Y: 0,
    symbol2X: 0,
    symbol2Y: 0,
    
    // Fuente
    fontWeight: 'bold',
    letterSpacing: 0,
    textTransform: 'none',
    arText: 'AR',
    
    // Colores
    useCMYK: true,
    cmyk: { c: 47, m: 22, y: 0, k: 14 },
    checkColor: '#73a9c2'
  };

  // Si está activado el modo QRMod, usar la configuración guardada
  const isApplied = localStorage.getItem('qr-mod-apply') === 'true';
  
  if (isApplied) {
    const savedConfig = localStorage.getItem('qr-mod-config');
    if (savedConfig) {
      try {
        return { ...defaultConfig, ...JSON.parse(savedConfig) };
      } catch (e) {
        console.error('Error parsing QR mod config:', e);
      }
    }
  }

  // También verificar la nueva configuración de QRModTool
  const qrModConfig = localStorage.getItem('qrModConfig');
  if (qrModConfig) {
    try {
      const parsed = JSON.parse(qrModConfig);
      if (parsed.isActive) {
        // Mapear las propiedades del nuevo formato al formato esperado
        return {
          ...defaultConfig,
          labelWidth: parsed.labelWidth || defaultConfig.labelWidth,
          labelHeight: parsed.labelHeight || defaultConfig.labelHeight,
          labelBorderRadius: parsed.labelBorderRadius || defaultConfig.labelBorderRadius,
          labelBorderWidth: parsed.labelBorderWidth || defaultConfig.labelBorderWidth,
          qrSize: parsed.qrSize || defaultConfig.qrSize,
          qrTop: parsed.qrTopPosition || defaultConfig.qrTop,
          qrLeft: parsed.qrLeftPosition || defaultConfig.qrLeft,
          qrCenterHorizontally: parsed.qrCenterHorizontally !== undefined ? parsed.qrCenterHorizontally : defaultConfig.qrCenterHorizontally,
          arBottom: parsed.arBottomPosition || defaultConfig.arBottom,
          arSize: parsed.arHeight || defaultConfig.arSize,
          arGap: parsed.arSpacing || defaultConfig.arGap,
          arOffsetX: parsed.arOffsetX || defaultConfig.arOffsetX,
          arOffsetY: parsed.arOffsetY || defaultConfig.arOffsetY,
          fontSize: parsed.fontSize || defaultConfig.fontSize,
          fontFamily: parsed.fontFamily || defaultConfig.fontFamily,
          useImage: parsed.useImage !== undefined ? parsed.useImage : defaultConfig.useImage,
          imagePath: parsed.imageUrl || defaultConfig.imagePath,
          checkHeight: parsed.checkHeight || defaultConfig.checkHeight,
          checkWidth: parsed.checkWidth || defaultConfig.checkWidth,
          checkStrokeWidth: parsed.checkStrokeWidth || defaultConfig.checkStrokeWidth,
          checkSpacingVertical: parsed.checkSpacingVertical !== undefined ? parsed.checkSpacingVertical : defaultConfig.checkSpacingVertical,
          tildeOffsetX: parsed.tildeOffsetX || defaultConfig.tildeOffsetX,
          tildeOffsetY: parsed.tildeOffsetY || defaultConfig.tildeOffsetY,
          symbolCount: parsed.symbolCount || defaultConfig.symbolCount,
          symbol1Angle: parsed.symbol1Angle || defaultConfig.symbol1Angle,
          symbol2Angle: parsed.symbol2Angle || defaultConfig.symbol2Angle,
          symbolSize: parsed.symbolSize || defaultConfig.symbolSize,
          useIndividualSize: parsed.useIndividualSize !== undefined ? parsed.useIndividualSize : defaultConfig.useIndividualSize,
          symbol1Size: parsed.symbol1Size || defaultConfig.symbol1Size,
          symbol2Size: parsed.symbol2Size || defaultConfig.symbol2Size,
          useIndividualControl: parsed.useIndividualControl !== undefined ? parsed.useIndividualControl : defaultConfig.useIndividualControl,
          symbol1X: parsed.symbol1X || defaultConfig.symbol1X,
          symbol1Y: parsed.symbol1Y || defaultConfig.symbol1Y,
          symbol2X: parsed.symbol2X || defaultConfig.symbol2X,
          symbol2Y: parsed.symbol2Y || defaultConfig.symbol2Y,
          fontWeight: parsed.fontWeight || defaultConfig.fontWeight,
          letterSpacing: parsed.letterSpacing !== undefined ? parsed.letterSpacing : defaultConfig.letterSpacing,
          textTransform: parsed.textTransform || defaultConfig.textTransform,
          arText: parsed.arText || defaultConfig.arText,
          useCMYK: parsed.useCMYK !== undefined ? parsed.useCMYK : defaultConfig.useCMYK,
          cmyk: parsed.cmyk || defaultConfig.cmyk,
          checkColor: parsed.checkColor || defaultConfig.checkColor
        };
      }
    } catch (e) {
      console.error('Error parsing QRModTool config:', e);
    }
  }

  return defaultConfig;
}

// Función para convertir CMYK a RGB
export function cmykToRgb(c: number = 47, m: number = 22, y: number = 0, k: number = 14): string {
  const r = Math.round(255 * (1 - c / 100) * (1 - k / 100));
  const g = Math.round(255 * (1 - m / 100) * (1 - k / 100));
  const b = Math.round(255 * (1 - y / 100) * (1 - k / 100));
  return `rgb(${r}, ${g}, ${b})`;
}