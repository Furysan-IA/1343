// QRModTool.tsx - Herramienta avanzada de configuración QR con pestañas mejoradas
import React, { useState, useRef, useEffect } from 'react';
import { Wrench, X, Save, Download, Eye, Copy, CheckCircle, AlertCircle, Upload, FileText, RefreshCw, Maximize2, ImageIcon, Grid3x3, Square, Move, Type, Check, Settings, Ruler, FileType, Palette } from 'lucide-react';

// Tipos actualizados
interface QRConfig {
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
  qrTopPosition: number;
  qrLeftPosition: number;
  qrCenterHorizontally: boolean;
  
  // AR
  arBottomPosition: number;
  arHeight: number;
  arOffsetX: number;
  arOffsetY: number;
  arSpacing: number;
  fontSize: number;
  fontFamily: string;
  useImage: boolean;
  imageUrl: string;
  
  // Tildes/Símbolos
  checkWidth: number;
  checkHeight: number;
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
  
  // General
  isActive: boolean;
  showGrid: boolean;
  gridSize: number;
}

const defaultConfig: QRConfig = {
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
  qrTopPosition: 3,
  qrLeftPosition: 9.5,
  qrCenterHorizontally: true,
  
  // AR
  arBottomPosition: 9,
  arHeight: 19,
  arOffsetX: 0,
  arOffsetY: 0,
  arSpacing: 3,
  fontSize: 14,
  fontFamily: 'Montserrat-Arabic',
  useImage: false,
  imageUrl: '',
  
  // Tildes/Símbolos
  checkWidth: 19,
  checkHeight: 9.5,
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
  checkColor: '#73a9c2',
  
  // General
  isActive: true,
  showGrid: false,
  gridSize: 1
};

// Función para convertir CMYK a RGB
const cmykToRgb = (c: number = 47, m: number = 22, y: number = 0, k: number = 14) => {
  const r = Math.round(255 * (1 - c / 100) * (1 - k / 100));
  const g = Math.round(255 * (1 - m / 100) * (1 - k / 100));
  const b = Math.round(255 * (1 - y / 100) * (1 - k / 100));
  return `rgb(${r}, ${g}, ${b})`;
};

// Sistema de notificaciones simple
const toast = {
  success: (message: string) => {
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 text-sm';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  },
  error: (message: string) => {
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50 text-sm';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  }
};

// Generador de QR simple (placeholder)
const generateQRDataUrl = (text: string): string => {
  const size = 200;
  const modules = 25;
  const moduleSize = size / modules;
  
  let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;
  svg += '<rect width="100%" height="100%" fill="white"/>';
  
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (
        (row < 7 && col < 7) ||
        (row < 7 && col >= modules - 7) ||
        (row >= modules - 7 && col < 7) ||
        (row >= 7 && row < modules - 7 && col >= 7 && col < modules - 7 && Math.random() > 0.5)
      ) {
        const x = col * moduleSize;
        const y = row * moduleSize;
        svg += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }
  
  svg += '</svg>';
  
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  return svgUrl;
};

// Guardar configuración en localStorage
const saveQRModConfig = (config: QRConfig) => {
  localStorage.setItem('qrModConfig', JSON.stringify(config));
};

// Cargar configuración desde localStorage
const loadQRModConfig = (): QRConfig => {
  const saved = localStorage.getItem('qrModConfig');
  if (saved) {
    return { ...defaultConfig, ...JSON.parse(saved) };
  }
  return defaultConfig;
};

export const QRModTool: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [activeTab, setActiveTab] = useState('label');
  const [config, setConfig] = useState<QRConfig>(loadQRModConfig());
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [fontUrl, setFontUrl] = useState<string | null>(null);
  const [customFonts, setCustomFonts] = useState<string[]>(['Arial', 'Montserrat-Arabic', 'Helvetica', 'Times New Roman']);
  const [componentsStatus, setComponentsStatus] = useState({
    qrGenerator: false,
    qrModal: false,
    lastCheck: null as Date | null
  });
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [scale, setScale] = useState(3);
  const labelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Tabs configuration actualizada
  const tabs = [
    { id: 'label', label: 'Etiqueta', icon: Square },
    { id: 'qr', label: 'QR', icon: Grid3x3 },
    { id: 'ar', label: 'AR', icon: Type },
    { id: 'symbols', label: 'Símbolos', icon: Check },
    { id: 'font', label: 'Fuente', icon: FileType },
    { id: 'colors', label: 'Colores', icon: Palette },
    { id: 'general', label: 'General', icon: Settings }
  ];

  // Generar QR de prueba
  useEffect(() => {
    const qrUrl = generateQRDataUrl('https://ejemplo.com?id=TEST123');
    setQrDataUrl(qrUrl);
  }, []);

  // Actualizar configuración
  const updateConfig = (key: keyof QRConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
  };

  // Guardar configuración
  const handleSave = () => {
    saveQRModConfig(config);
    toast.success('Configuración guardada');
  };

  // Cargar fuente personalizada
  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fontData = event.target?.result as string;
        setFontUrl(fontData);
        const fontName = file.name.split('.')[0];
        setCustomFonts([...customFonts, fontName]);
        updateConfig('fontFamily', fontName);
        
        // Crear @font-face
        const style = document.createElement('style');
        style.textContent = `
          @font-face {
            font-family: '${fontName}';
            src: url('${fontData}');
          }
        `;
        document.head.appendChild(style);
        
        toast.success(`Fuente "${fontName}" cargada`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Renderizar contenido de pestaña
  const renderTabContent = () => {
    switch (activeTab) {
      case 'label':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Square className="w-5 h-5" />
              Configuración de Etiqueta
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Ancho: {config.labelWidth}px</label>
                <input
                  type="range"
                  min="80"
                  max="150"
                  value={config.labelWidth}
                  onChange={(e) => updateConfig('labelWidth', Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-600">Alto: {config.labelHeight}px</label>
                <input
                  type="range"
                  min="100"
                  max="150"
                  value={config.labelHeight}
                  onChange={(e) => updateConfig('labelHeight', Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-600">Radio de borde: {config.labelBorderRadius}px</label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={config.labelBorderRadius}
                  onChange={(e) => updateConfig('labelBorderRadius', Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-600">Grosor de borde: {config.labelBorderWidth}px</label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={config.labelBorderWidth}
                  onChange={(e) => updateConfig('labelBorderWidth', Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Espaciado interno (Padding)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Superior: {config.labelPaddingTop}px</label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={config.labelPaddingTop}
                    onChange={(e) => updateConfig('labelPaddingTop', Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">Inferior: {config.labelPaddingBottom}px</label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={config.labelPaddingBottom}
                    onChange={(e) => updateConfig('labelPaddingBottom', Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">Izquierda: {config.labelPaddingLeft}px</label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={config.labelPaddingLeft}
                    onChange={(e) => updateConfig('labelPaddingLeft', Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">Derecha: {config.labelPaddingRight}px</label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={config.labelPaddingRight}
                    onChange={(e) => updateConfig('labelPaddingRight', Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'qr':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Grid3x3 className="w-5 h-5" />
              Configuración del Código QR
            </h3>
            
            <div>
              <label className="text-sm text-gray-600">Tamaño del QR: {config.qrSize}px</label>
              <input
                type="range"
                min="50"
                max="100"
                value={config.qrSize}
                onChange={(e) => updateConfig('qrSize', Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Posición desde arriba: {config.qrTopPosition}px</label>
              <input
                type="range"
                min="0"
                max="40"
                value={config.qrTopPosition}
                onChange={(e) => updateConfig('qrTopPosition', Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="centerQR"
                checked={config.qrCenterHorizontally}
                onChange={(e) => updateConfig('qrCenterHorizontally', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="centerQR" className="text-sm text-gray-600">Centrar horizontalmente</label>
            </div>
            
            {!config.qrCenterHorizontally && (
              <div>
                <label className="text-sm text-gray-600">Posición desde la izquierda: {config.qrLeftPosition}px</label>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={config.qrLeftPosition}
                  onChange={(e) => updateConfig('qrLeftPosition', Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        );
        
      case 'ar':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Type className="w-5 h-5" />
              Configuración del Logo AR
            </h3>
            
            <div>
              <label className="text-sm text-gray-600">Texto AR</label>
              <input
                type="text"
                value={config.arText}
                onChange={(e) => updateConfig('arText', e.target.value)}
                className="w-full mt-1 p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Posición desde abajo: {config.arBottomPosition}px</label>
              <input
                type="range"
                min="0"
                max="30"
                value={config.arBottomPosition}
                onChange={(e) => updateConfig('arBottomPosition', Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Altura AR: {config.arHeight}px</label>
              <input
                type="range"
                min="10"
                max="40"
                value={config.arHeight}
                onChange={(e) => updateConfig('arHeight', Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Desplazamiento X: {config.arOffsetX}px</label>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={config.arOffsetX}
                  onChange={(e) => updateConfig('arOffsetX', Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-600">Desplazamiento Y: {config.arOffsetY}px</label>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  value={config.arOffsetY}
                  onChange={(e) => updateConfig('arOffsetY', Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Espacio AR-Símbolos: {config.arSpacing}px</label>
              <input
                type="range"
                min="0"
                max="20"
                value={config.arSpacing}
                onChange={(e) => updateConfig('arSpacing', Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="useImage"
                checked={config.useImage}
                onChange={(e) => updateConfig('useImage', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="useImage" className="text-sm text-gray-600">Usar imagen en lugar de texto</label>
            </div>
            
            <button
              onClick={() => imageInputRef.current?.click()}
              className="w-full bg-gray-100 hover:bg-gray-200 p-2 rounded text-sm flex items-center justify-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Cargar Imagen AR
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const imageData = event.target?.result as string;
                    setUploadedImage(imageData);
                    updateConfig('imageUrl', imageData);
                    updateConfig('useImage', true);
                    toast.success('Imagen AR cargada');
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
            />
          </div>
        );
        
      case 'symbols':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Configuración de Símbolos
            </h3>
            
            <div>
              <label className="text-sm text-gray-600">Cantidad de símbolos: {config.symbolCount}</label>
              <input
                type="range"
                min="1"
                max="3"
                value={config.symbolCount}
                onChange={(e) => updateConfig('symbolCount', Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Ancho: {config.checkWidth}px</label>
                <input
                  type="range"
                  min="10"
                  max="40"
                  value={config.checkWidth}
                  onChange={(e) => updateConfig('checkWidth', Number(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-600">Altura: {config.checkHeight}px</label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={config.checkHeight}
                  onChange={(e) => updateConfig('checkHeight', Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Grosor del trazo: {config.checkStrokeWidth}</label>
              <input
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={config.checkStrokeWidth}
                onChange={(e) => updateConfig('checkStrokeWidth', Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Espaciado vertical: {config.checkSpacingVertical}px</label>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.5"
                value={config.checkSpacingVertical}
                onChange={(e) => updateConfig('checkSpacingVertical', Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Tamaño general: {config.symbolSize}%</label>
              <input
                type="range"
                min="50"
                max="150"
                step="5"
                value={config.symbolSize}
                onChange={(e) => updateConfig('symbolSize', Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Control de ángulos</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Ángulo símbolo 1: {config.symbol1Angle}°</label>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    value={config.symbol1Angle}
                    onChange={(e) => updateConfig('symbol1Angle', Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                {config.symbolCount > 1 && (
                  <div>
                    <label className="text-sm text-gray-600">Ángulo símbolo 2: {config.symbol2Angle}°</label>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={config.symbol2Angle}
                      onChange={(e) => updateConfig('symbol2Angle', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Posición del grupo</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Desplazamiento X: {config.tildeOffsetX}px</label>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    value={config.tildeOffsetX}
                    onChange={(e) => updateConfig('tildeOffsetX', Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">Desplazamiento Y: {config.tildeOffsetY}px</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={config.tildeOffsetY}
                    onChange={(e) => updateConfig('tildeOffsetY', Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="individualControl"
                checked={config.useIndividualControl}
                onChange={(e) => updateConfig('useIndividualControl', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="individualControl" className="text-sm text-gray-600">Control individual de posición</label>
            </div>
            
            {config.useIndividualControl && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Posición individual</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Símbolo 1 X: {config.symbol1X}px</label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      value={config.symbol1X}
                      onChange={(e) => updateConfig('symbol1X', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600">Símbolo 1 Y: {config.symbol1Y}px</label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      value={config.symbol1Y}
                      onChange={(e) => updateConfig('symbol1Y', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  {config.symbolCount > 1 && (
                    <>
                      <div>
                        <label className="text-sm text-gray-600">Símbolo 2 X: {config.symbol2X}px</label>
                        <input
                          type="range"
                          min="-20"
                          max="20"
                          value={config.symbol2X}
                          onChange={(e) => updateConfig('symbol2X', Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm text-gray-600">Símbolo 2 Y: {config.symbol2Y}px</label>
                        <input
                          type="range"
                          min="-20"
                          max="20"
                          value={config.symbol2Y}
                          onChange={(e) => updateConfig('symbol2Y', Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
        
      case 'font':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <FileType className="w-5 h-5" />
              Configuración de Fuente
            </h3>
            
            <div>
              <label className="text-sm text-gray-600">Texto AR</label>
              <input
                type="text"
                value={config.arText}
                onChange={(e) => updateConfig('arText', e.target.value)}
                className="w-full mt-1 p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Fuente</label>
              <select
                value={config.fontFamily}
                onChange={(e) => updateConfig('fontFamily', e.target.value)}
                className="w-full mt-1 p-2 border rounded"
              >
                {customFonts.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-gray-100 hover:bg-gray-200 p-2 rounded text-sm flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Cargar Fuente (.otf, .ttf, .woff)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".otf,.ttf,.woff,.woff2"
              onChange={handleFontUpload}
              className="hidden"
            />
            
            <div>
              <label className="text-sm text-gray-600">Tamaño de fuente: {config.fontSize}px</label>
              <input
                type="range"
                min="8"
                max="30"
                value={config.fontSize}
                onChange={(e) => updateConfig('fontSize', Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Peso de fuente</label>
              <select
                value={config.fontWeight}
                onChange={(e) => updateConfig('fontWeight', e.target.value)}
                className="w-full mt-1 p-2 border rounded"
              >
                <option value="normal">Normal</option>
                <option value="bold">Negrita</option>
                <option value="300">Light</option>
                <option value="500">Medium</option>
                <option value="700">Bold</option>
                <option value="900">Black</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Espaciado entre letras: {config.letterSpacing}px</label>
              <input
                type="range"
                min="-2"
                max="5"
                step="0.1"
                value={config.letterSpacing}
                onChange={(e) => updateConfig('letterSpacing', Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Transformación de texto</label>
              <select
                value={config.textTransform}
                onChange={(e) => updateConfig('textTransform', e.target.value)}
                className="w-full mt-1 p-2 border rounded"
              >
                <option value="none">Normal</option>
                <option value="uppercase">MAYÚSCULAS</option>
                <option value="lowercase">minúsculas</option>
                <option value="capitalize">Capitalizar</option>
              </select>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
              <p className="font-medium text-yellow-800 mb-1">Tip para Montserrat Arabic:</p>
              <ol className="text-yellow-700 text-xs list-decimal list-inside space-y-1">
                <li>Carga el archivo .otf usando el botón arriba</li>
                <li>Selecciona la fuente del menú</li>
                <li>Si no se ve correctamente, usa la opción de imagen en la pestaña AR</li>
              </ol>
            </div>
          </div>
        );
        
      case 'colors':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Configuración de Colores
            </h3>
            
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="useCMYK"
                checked={config.useCMYK}
                onChange={(e) => updateConfig('useCMYK', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="useCMYK" className="text-sm font-medium text-gray-700">
                Usar valores CMYK (Especificación Argentina)
              </label>
            </div>
            
            {config.useCMYK ? (
              <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                <p className="text-sm font-medium text-blue-800">Valores CMYK oficiales</p>
                
                <div>
                  <label className="text-sm text-gray-600">Cyan: {config.cmyk.c}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.cmyk.c}
                    onChange={(e) => {
                      const newCmyk = { ...config.cmyk, c: Number(e.target.value) };
                      updateConfig('cmyk', newCmyk);
                      updateConfig('checkColor', cmykToRgb(newCmyk.c, newCmyk.m, newCmyk.y, newCmyk.k));
                    }}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">Magenta: {config.cmyk.m}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.cmyk.m}
                    onChange={(e) => {
                      const newCmyk = { ...config.cmyk, m: Number(e.target.value) };
                      updateConfig('cmyk', newCmyk);
                      updateConfig('checkColor', cmykToRgb(newCmyk.c, newCmyk.m, newCmyk.y, newCmyk.k));
                    }}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">Yellow: {config.cmyk.y}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.cmyk.y}
                    onChange={(e) => {
                      const newCmyk = { ...config.cmyk, y: Number(e.target.value) };
                      updateConfig('cmyk', newCmyk);
                      updateConfig('checkColor', cmykToRgb(newCmyk.c, newCmyk.m, newCmyk.y, newCmyk.k));
                    }}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-600">Key (Negro): {config.cmyk.k}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.cmyk.k}
                    onChange={(e) => {
                      const newCmyk = { ...config.cmyk, k: Number(e.target.value) };
                      updateConfig('cmyk', newCmyk);
                      updateConfig('checkColor', cmykToRgb(newCmyk.c, newCmyk.m, newCmyk.y, newCmyk.k));
                    }}
                    className="w-full"
                  />
                </div>
                
                <div className="bg-white rounded p-3 flex items-center justify-between">
                  <span className="text-sm">Color resultante:</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-12 h-12 rounded border-2 border-gray-300"
                      style={{ backgroundColor: cmykToRgb(config.cmyk.c, config.cmyk.m, config.cmyk.y, config.cmyk.k) }}
                    />
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {cmykToRgb(config.cmyk.c, config.cmyk.m, config.cmyk.y, config.cmyk.k)}
                    </code>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm text-gray-600">Color de símbolos</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    value={config.checkColor}
                    onChange={(e) => updateConfig('checkColor', e.target.value)}
                    className="h-10 w-20 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.checkColor}
                    onChange={(e) => updateConfig('checkColor', e.target.value)}
                    className="flex-1 p-2 border rounded font-mono text-sm"
                  />
                </div>
              </div>
            )}
            
            <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
              <p className="font-medium text-green-800">Especificación oficial argentina:</p>
              <p className="text-green-700 text-xs mt-1">CMYK: C=47, M=22, Y=0, K=14</p>
              <p className="text-green-700 text-xs">RGB aproximado: rgb(115, 169, 194)</p>
            </div>
          </div>
        );
        
      case 'general':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuración General
            </h3>
            
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={config.isActive}
                    onChange={(e) => updateConfig('isActive', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="font-medium">
                    Aplicar configuración a componentes
                  </label>
                </div>
                <span className={`text-sm px-2 py-1 rounded ${config.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {config.isActive ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                Cuadrícula de Medición
              </h4>
              
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="showGrid"
                  checked={config.showGrid}
                  onChange={(e) => updateConfig('showGrid', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showGrid" className="text-sm text-gray-600">Mostrar cuadrícula</label>
              </div>
              
              {config.showGrid && (
                <div>
                  <label className="text-sm text-gray-600">Tamaño de cuadrícula: {config.gridSize}px</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={config.gridSize}
                    onChange={(e) => updateConfig('gridSize', Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="font-medium mb-3">Zoom de Vista Previa</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScale(Math.max(1, scale - 0.5))}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  -
                </button>
                <span className="min-w-[60px] text-center text-sm">{scale * 100}%</span>
                <button
                  onClick={() => setScale(Math.min(5, scale + 0.5))}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Función para obtener el color actual
  const getCurrentColor = () => {
    return config.useCMYK 
      ? cmykToRgb(config.cmyk.c, config.cmyk.m, config.cmyk.y, config.cmyk.k)
      : config.checkColor;
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 left-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 ${config.isActive ? 'ring-4 ring-green-400 ring-opacity-50' : ''}`}
        title="Modificar QR"
      >
        <Wrench className="w-6 h-6" />
        {config.isActive && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className={`fixed inset-0 z-50 ${isFullscreen ? '' : 'p-4'}`}>
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
          
          <div className={`relative bg-white rounded-lg shadow-xl mx-auto overflow-hidden ${
            isFullscreen ? 'w-full h-full' : 'max-w-7xl w-full max-h-[95vh]'
          }`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Configurador QR Avanzado
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 hover:bg-blue-800 rounded transition-colors"
                  title="Pantalla completa"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-blue-800 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex h-[calc(100%-3rem)]">
              {/* Sidebar with tabs */}
              <div className="w-56 bg-gray-100 border-r overflow-y-auto">
                <nav className="p-3">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full text-left p-2.5 mb-1.5 rounded-lg flex items-center gap-2.5 transition-colors text-sm ${
                          activeTab === tab.id
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
                
                {/* Actions - botones más pequeños */}
                <div className="p-3 border-t space-y-2">
                  <button
                    onClick={handleSave}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      handleSave();
                      window.dispatchEvent(new Event('qrModConfigUpdated'));
                      toast.success('Configuración aplicada');
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Aplicar
                  </button>
                  <button
                    onClick={() => {
                      const code = generateCode();
                      navigator.clipboard.writeText(code);
                      toast.success('Código copiado');
                    }}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm flex items-center justify-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </button>
                </div>
              </div>

              {/* Main content area */}
              <div className="flex-1 flex">
                {/* Tab content */}
                <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
                  {renderTabContent()}
                </div>

                {/* Preview panel */}
                <div className="w-96 bg-white border-l p-6 flex flex-col items-center justify-center">
                  <h3 className="font-semibold mb-4">Vista Previa ({scale * 100}%)</h3>
                  
                  <div className="relative">
                    {/* Grid overlay */}
                    {config.showGrid && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: `
                            repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent ${config.gridSize}px),
                            repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent ${config.gridSize}px)
                          `,
                          transform: `scale(${scale})`,
                          transformOrigin: 'center',
                          width: `${config.labelWidth}px`,
                          height: `${config.labelHeight}px`,
                          zIndex: 10
                        }}
                      />
                    )}
                    
                    {/* Etiqueta QR */}
                    <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                      <div 
                        ref={labelRef}
                        style={{
                          width: `${config.labelWidth}px`,
                          height: `${config.labelHeight}px`,
                          backgroundColor: '#ffffff',
                          border: `${config.labelBorderWidth}px solid #000000`,
                          borderRadius: `${config.labelBorderRadius}px`,
                          position: 'relative',
                          overflow: 'hidden',
                          boxSizing: 'border-box',
                          padding: `${config.labelPaddingTop}px ${config.labelPaddingRight}px ${config.labelPaddingBottom}px ${config.labelPaddingLeft}px`
                        }}
                      >
                        {/* Código QR */}
                        <div
                          style={{
                            position: 'absolute',
                            top: `${config.qrTopPosition}px`,
                            left: config.qrCenterHorizontally ? '50%' : `${config.qrLeftPosition}px`,
                            transform: config.qrCenterHorizontally ? 'translateX(-50%)' : 'none',
                            width: `${config.qrSize}px`,
                            height: `${config.qrSize}px`,
                            backgroundColor: '#000000'
                          }}
                        />

                        {/* AR + Símbolos */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: `${config.arBottomPosition}px`,
                            left: '50%',
                            transform: `translateX(-50%) translateX(${config.arOffsetX}px) translateY(${config.arOffsetY}px)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: `${config.arSpacing}px`
                          }}
                        >
                          {/* Logo AR */}
                          {config.useImage && (config.imageUrl || uploadedImage) ? (
                            <img
                              src={uploadedImage || config.imageUrl}
                              alt="AR"
                              style={{
                                height: `${config.arHeight}px`,
                                width: 'auto',
                                display: 'block'
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                fontFamily: config.fontFamily,
                                fontSize: `${config.fontSize}px`,
                                fontWeight: config.fontWeight,
                                letterSpacing: `${config.letterSpacing}px`,
                                textTransform: config.textTransform as any,
                                color: '#000000',
                                lineHeight: 1
                              }}
                            >
                              {config.arText}
                            </span>
                          )}

                          {/* Símbolos */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: `${config.checkSpacingVertical}px`,
                              transform: `translateX(${config.tildeOffsetX}px) translateY(${config.tildeOffsetY}px)`
                            }}
                          >
                            {Array.from({ length: config.symbolCount }, (_, i) => {
                              const angle = i === 0 ? config.symbol1Angle : config.symbol2Angle;
                              const size = config.symbolSize / 100;
                              const offsetX = config.useIndividualControl ? (i === 0 ? config.symbol1X : config.symbol2X) : 0;
                              const offsetY = config.useIndividualControl ? (i === 0 ? config.symbol1Y : config.symbol2Y) : 0;
                              
                              return (
                                <div
                                  key={i}
                                  style={{
                                    transform: `rotate(${angle}deg) scale(${size}) translate(${offsetX}px, ${offsetY}px)`,
                                    transformOrigin: 'center'
                                  }}
                                >
                                  <svg
                                    width={config.checkWidth}
                                    height={config.checkHeight}
                                    viewBox={`0 0 ${config.checkWidth} ${config.checkHeight}`}
                                    fill="none"
                                    style={{ display: 'block' }}
                                  >
                                    <path
                                      d="M3 5L6.5 8.5L16 1.5"
                                      stroke={getCurrentColor()}
                                      strokeWidth={config.checkStrokeWidth}
                                      strokeLinecap="square"
                                      strokeLinejoin="miter"
                                    />
                                  </svg>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      {config.useImage ? 'Usando imagen' : `Fuente: ${config.fontFamily}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Tamaño: {config.labelWidth}px × {config.labelHeight}px
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Función para generar código
const generateCode = (): string => {
  const config = loadQRModConfig();
  const getCurrentColor = () => {
    return config.useCMYK 
      ? cmykToRgb(config.cmyk.c, config.cmyk.m, config.cmyk.y, config.cmyk.k)
      : config.checkColor;
  };
  
  return `// Configuración QR generada
const qrConfig = ${JSON.stringify(config, null, 2)};

// Etiqueta QR
<div 
  ref={labelRef}
  style={{
    width: '${config.labelWidth}px',
    height: '${config.labelHeight}px',
    backgroundColor: '#ffffff',
    border: '${config.labelBorderWidth}px solid #000000',
    borderRadius: '${config.labelBorderRadius}px',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box'
  }}
>
  {/* Código QR */}
  <div
    style={{
      position: 'absolute',
      top: '${config.qrTopPosition}px',
      left: '${config.qrCenterHorizontally ? '50%' : config.qrLeftPosition + 'px'}',
      transform: '${config.qrCenterHorizontally ? 'translateX(-50%)' : 'none'}',
      width: '${config.qrSize}px',
      height: '${config.qrSize}px',
      backgroundColor: '#000000'
    }}
  >
    <img src={qrDataUrl} alt="QR" style={{ width: '100%', height: '100%' }} />
  </div>

  {/* AR + Símbolos */}
  <div
    style={{
      position: 'absolute',
      bottom: '${config.arBottomPosition}px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '${config.arSpacing}px'
    }}
  >
    {/* AR */}
    ${config.useImage ? 
      `<img src="${config.imageUrl}" alt="AR" style={{ height: '${config.arHeight}px' }} />` : 
      `<span style={{ 
        fontFamily: '${config.fontFamily}', 
        fontSize: '${config.fontSize}px', 
        fontWeight: '${config.fontWeight}',
        letterSpacing: '${config.letterSpacing}px',
        textTransform: '${config.textTransform}'
      }}>${config.arText}</span>`
    }
    
    {/* Símbolos */}
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '${config.checkSpacingVertical}px',
      transform: 'translate(${config.tildeOffsetX}px, ${config.tildeOffsetY}px)'
    }}>
      ${Array.from({ length: config.symbolCount }, (_, i) => `
      <div style={{ 
        transform: 'rotate(${i === 0 ? config.symbol1Angle : config.symbol2Angle}deg) scale(${config.symbolSize / 100})'
      }}>
        <svg width="${config.checkWidth}" height="${config.checkHeight}" viewBox="0 0 ${config.checkWidth} ${config.checkHeight}">
          <path d="M3 5L6.5 8.5L16 1.5" stroke="${getCurrentColor()}" strokeWidth="${config.checkStrokeWidth}" strokeLinecap="square" />
        </svg>
      </div>`).join('')}
    </div>
  </div>
</div>`;
};

// Función para usar en otros componentes
export const getQRModConfig = (): QRConfig | null => {
  const saved = localStorage.getItem('qrModConfig');
  if (saved) {
    const config = JSON.parse(saved);
    if (config.isActive) {
      return config;
    }
  }
  return null;
};