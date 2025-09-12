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

export function QRModTool() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [config, setConfig] = useState<QRConfig>(loadQRModConfig);
  const [activeTab, setActiveTab] = useState('etiqueta');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [zoom, setZoom] = useState(200);
  const labelRef = useRef<HTMLDivElement>(null);

  // Generar QR de ejemplo
  useEffect(() => {
    const url = generateQRDataUrl('https://argqr.com/products/DEMO-001');
    setQrDataUrl(url);
  }, []);

  // Pestañas de configuración
  const tabs = [
    { id: 'etiqueta', label: 'Etiqueta', icon: Square },
    { id: 'qr', label: 'QR', icon: Grid3x3 },
    { id: 'ar', label: 'AR', icon: Type },
    { id: 'simbolos', label: 'Símbolos', icon: Check },
    { id: 'fuente', label: 'Fuente', icon: FileType },
    { id: 'colores', label: 'Colores', icon: Palette },
    { id: 'general', label: 'General', icon: Settings }
  ];

  // Si no es visible, mostrar solo el botón flotante
  if (!isVisible) {
    return (
      <button
        onClick={() => {
          setIsVisible(true);
          setIsMinimized(false);
        }}
        className="fixed bottom-4 left-4 z-50 w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
        title="Abrir QR Mod Tool"
      >
        <Wrench className="w-6 h-6" />
      </button>
    );
  }

  // Si está visible pero minimizado, mostrar barra de título
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200">
        <div className="flex items-center justify-between p-3 bg-purple-600 text-white rounded-lg">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <span className="font-medium">QR Mod Tool</span>
            {config.isActive && (
              <div className="w-2 h-2 bg-green-400 rounded-full" title="Configuración activa" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 hover:bg-purple-700 rounded"
              title="Expandir"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-purple-700 rounded"
              title="Cerrar QR Mod Tool"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const updateConfig = (updates: Partial<QRConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    saveQRModConfig(newConfig);
  };

  const getCurrentColor = () => {
    return config.useCMYK 
      ? cmykToRgb(config.cmyk.c, config.cmyk.m, config.cmyk.y, config.cmyk.k)
      : config.checkColor;
  };

  const resetToDefaults = () => {
    setConfig(defaultConfig);
    saveQRModConfig(defaultConfig);
    toast.success('Configuración restablecida');
  };

  const exportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'qr-config.json';
    link.click();
    toast.success('Configuración exportada');
  };

  const importConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setConfig({ ...defaultConfig, ...imported });
          saveQRModConfig({ ...defaultConfig, ...imported });
          toast.success('Configuración importada');
        } catch (error) {
          toast.error('Error al importar configuración');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Contenido completo del QRModTool
  return (
    <div className="fixed inset-4 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col max-w-7xl mx-auto">
      {/* Header con controles */}
      <div className="flex items-center justify-between p-4 bg-purple-600 text-white rounded-t-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6" />
          <h2 className="text-xl font-bold">QR Mod Tool</h2>
          {config.isActive && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full" />
              <span className="text-sm">Activo</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportConfig}
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
            title="Exportar configuración"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={importConfig}
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
            title="Importar configuración"
          >
            <Upload className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
            title="Minimizar"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
            title="Cerrar QR Mod Tool"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar con pestañas */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Configuración</h3>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Controles generales */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.isActive}
                    onChange={(e) => updateConfig({ isActive: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Aplicar configuración</span>
                </label>

                <button
                  onClick={resetToDefaults}
                  className="w-full px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors"
                >
                  Restablecer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Área de contenido */}
        <div className="flex-1 flex">
          {/* Panel de configuración */}
          <div className="w-80 p-6 overflow-y-auto border-r border-gray-200">
            {activeTab === 'etiqueta' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Square className="w-5 h-5" />
                  Configuración de Etiqueta
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ancho (px)
                    </label>
                    <input
                      type="number"
                      value={config.labelWidth}
                      onChange={(e) => updateConfig({ labelWidth: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alto (px)
                    </label>
                    <input
                      type="number"
                      value={config.labelHeight}
                      onChange={(e) => updateConfig({ labelHeight: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Radio de borde: {config.labelBorderRadius}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={config.labelBorderRadius}
                    onChange={(e) => updateConfig({ labelBorderRadius: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grosor de borde: {config.labelBorderWidth}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={config.labelBorderWidth}
                    onChange={(e) => updateConfig({ labelBorderWidth: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Padding Top
                    </label>
                    <input
                      type="number"
                      value={config.labelPaddingTop}
                      onChange={(e) => updateConfig({ labelPaddingTop: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Padding Bottom
                    </label>
                    <input
                      type="number"
                      value={config.labelPaddingBottom}
                      onChange={(e) => updateConfig({ labelPaddingBottom: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Padding Left
                    </label>
                    <input
                      type="number"
                      value={config.labelPaddingLeft}
                      onChange={(e) => updateConfig({ labelPaddingLeft: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Padding Right
                    </label>
                    <input
                      type="number"
                      value={config.labelPaddingRight}
                      onChange={(e) => updateConfig({ labelPaddingRight: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'qr' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Grid3x3 className="w-5 h-5" />
                  Configuración del QR
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tamaño QR: {config.qrSize}px
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="120"
                    value={config.qrSize}
                    onChange={(e) => updateConfig({ qrSize: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Posición desde arriba: {config.qrTopPosition}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={config.qrTopPosition}
                    onChange={(e) => updateConfig({ qrTopPosition: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={config.qrCenterHorizontally}
                      onChange={(e) => updateConfig({ qrCenterHorizontally: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Centrar horizontalmente</span>
                  </label>
                </div>

                {!config.qrCenterHorizontally && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Posición desde izquierda: {config.qrLeftPosition}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="0.5"
                      value={config.qrLeftPosition}
                      onChange={(e) => updateConfig({ qrLeftPosition: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ar' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Type className="w-5 h-5" />
                  Configuración AR
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texto AR
                  </label>
                  <input
                    type="text"
                    value={config.arText}
                    onChange={(e) => updateConfig({ arText: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Posición desde abajo: {config.arBottomPosition}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.5"
                    value={config.arBottomPosition}
                    onChange={(e) => updateConfig({ arBottomPosition: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Altura AR: {config.arHeight}px
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    value={config.arHeight}
                    onChange={(e) => updateConfig({ arHeight: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Offset X: {config.arOffsetX}px
                    </label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="0.5"
                      value={config.arOffsetX}
                      onChange={(e) => updateConfig({ arOffsetX: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Offset Y: {config.arOffsetY}px
                    </label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="0.5"
                      value={config.arOffsetY}
                      onChange={(e) => updateConfig({ arOffsetY: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Espaciado con símbolos: {config.arSpacing}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={config.arSpacing}
                    onChange={(e) => updateConfig({ arSpacing: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={config.useImage}
                      onChange={(e) => updateConfig({ useImage: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Usar imagen en lugar de texto</span>
                  </label>
                </div>

                {config.useImage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL de imagen
                    </label>
                    <input
                      type="text"
                      value={config.imageUrl}
                      onChange={(e) => updateConfig({ imageUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="https://ejemplo.com/imagen.png"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'simbolos' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  Configuración de Símbolos
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad de símbolos: {config.symbolCount}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    value={config.symbolCount}
                    onChange={(e) => updateConfig({ symbolCount: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ancho: {config.checkWidth}px
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="30"
                      step="0.5"
                      value={config.checkWidth}
                      onChange={(e) => updateConfig({ checkWidth: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alto: {config.checkHeight}px
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="20"
                      step="0.5"
                      value={config.checkHeight}
                      onChange={(e) => updateConfig({ checkHeight: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grosor del trazo: {config.checkStrokeWidth}px
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.1"
                    value={config.checkStrokeWidth}
                    onChange={(e) => updateConfig({ checkStrokeWidth: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Espaciado vertical: {config.checkSpacingVertical}px
                  </label>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.1"
                    value={config.checkSpacingVertical}
                    onChange={(e) => updateConfig({ checkSpacingVertical: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Offset X: {config.tildeOffsetX}px
                    </label>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.5"
                      value={config.tildeOffsetX}
                      onChange={(e) => updateConfig({ tildeOffsetX: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Offset Y: {config.tildeOffsetY}px
                    </label>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.5"
                      value={config.tildeOffsetY}
                      onChange={(e) => updateConfig({ tildeOffsetY: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tamaño general: {config.symbolSize}%
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={config.symbolSize}
                    onChange={(e) => updateConfig({ symbolSize: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ángulo Símbolo 1: {config.symbol1Angle}°
                    </label>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={config.symbol1Angle}
                      onChange={(e) => updateConfig({ symbol1Angle: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ángulo Símbolo 2: {config.symbol2Angle}°
                    </label>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={config.symbol2Angle}
                      onChange={(e) => updateConfig({ symbol2Angle: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fuente' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileType className="w-5 h-5" />
                  Configuración de Fuente
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Familia de fuente
                  </label>
                  <select
                    value={config.fontFamily}
                    onChange={(e) => updateConfig({ fontFamily: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Montserrat-Arabic">Montserrat-Arabic</option>
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tamaño de fuente: {config.fontSize}px
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="24"
                    value={config.fontSize}
                    onChange={(e) => updateConfig({ fontSize: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso de fuente
                  </label>
                  <select
                    value={config.fontWeight}
                    onChange={(e) => updateConfig({ fontWeight: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Negrita</option>
                    <option value="lighter">Ligera</option>
                    <option value="bolder">Más negrita</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Espaciado de letras: {config.letterSpacing}px
                  </label>
                  <input
                    type="range"
                    min="-2"
                    max="5"
                    step="0.1"
                    value={config.letterSpacing}
                    onChange={(e) => updateConfig({ letterSpacing: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transformación de texto
                  </label>
                  <select
                    value={config.textTransform}
                    onChange={(e) => updateConfig({ textTransform: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="none">Normal</option>
                    <option value="uppercase">MAYÚSCULAS</option>
                    <option value="lowercase">minúsculas</option>
                    <option value="capitalize">Capitalizar</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'colores' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Configuración de Colores
                </h3>

                <div>
                  <label className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      checked={config.useCMYK}
                      onChange={(e) => updateConfig({ useCMYK: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Usar colores CMYK oficiales</span>
                  </label>
                </div>

                {config.useCMYK ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cyan: {config.cmyk.c}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={config.cmyk.c}
                        onChange={(e) => updateConfig({ 
                          cmyk: { ...config.cmyk, c: Number(e.target.value) }
                        })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Magenta: {config.cmyk.m}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={config.cmyk.m}
                        onChange={(e) => updateConfig({ 
                          cmyk: { ...config.cmyk, m: Number(e.target.value) }
                        })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Yellow: {config.cmyk.y}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={config.cmyk.y}
                        onChange={(e) => updateConfig({ 
                          cmyk: { ...config.cmyk, y: Number(e.target.value) }
                        })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Key (Negro): {config.cmyk.k}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={config.cmyk.k}
                        onChange={(e) => updateConfig({ 
                          cmyk: { ...config.cmyk, k: Number(e.target.value) }
                        })}
                        className="w-full"
                      />
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Vista previa:</p>
                      <div 
                        className="w-full h-8 rounded mt-2 border"
                        style={{ backgroundColor: getCurrentColor() }}
                      />
                      <p className="text-xs text-gray-500 mt-1">{getCurrentColor()}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color personalizado
                    </label>
                    <input
                      type="color"
                      value={config.checkColor}
                      onChange={(e) => updateConfig({ checkColor: e.target.value })}
                      className="w-full h-10 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'general' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuración General
                </h3>

                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={config.showGrid}
                      onChange={(e) => updateConfig({ showGrid: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Mostrar cuadrícula</span>
                  </label>
                </div>

                {config.showGrid && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tamaño de cuadrícula: {config.gridSize}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={config.gridSize}
                      onChange={(e) => updateConfig({ gridSize: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Acciones</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const code = generateCode();
                        navigator.clipboard.writeText(code);
                        toast.success('Código copiado al portapapeles');
                      }}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar código
                    </button>
                    <button
                      onClick={exportConfig}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Exportar config
                    </button>
                    <button
                      onClick={importConfig}
                      className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Importar config
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Vista previa */}
          <div className="flex-1 p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Vista Previa</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Zoom:</label>
                <input
                  type="range"
                  min="100"
                  max="500"
                  step="25"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-gray-600 w-12">{zoom}%</span>
              </div>
            </div>

            <div className="flex items-center justify-center min-h-96 bg-white rounded-lg border-2 border-dashed border-gray-300 relative">
              {config.showGrid && (
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #000 1px, transparent 1px),
                      linear-gradient(to bottom, #000 1px, transparent 1px)
                    `,
                    backgroundSize: `${config.gridSize * (zoom / 100)}px ${config.gridSize * (zoom / 100)}px`
                  }}
                />
              )}
              
              <div 
                ref={labelRef}
                style={{
                  width: `${config.labelWidth * (zoom / 100)}px`,
                  height: `${config.labelHeight * (zoom / 100)}px`,
                  backgroundColor: '#ffffff',
                  border: `${config.labelBorderWidth * (zoom / 100)}px solid #000000`,
                  borderRadius: `${config.labelBorderRadius * (zoom / 100)}px`,
                  position: 'relative',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                  padding: `${config.labelPaddingTop * (zoom / 100)}px ${config.labelPaddingRight * (zoom / 100)}px ${config.labelPaddingBottom * (zoom / 100)}px ${config.labelPaddingLeft * (zoom / 100)}px`
                }}
              >
                {/* Código QR */}
                <div
                  style={{
                    position: 'absolute',
                    top: `${config.qrTopPosition * (zoom / 100)}px`,
                    left: config.qrCenterHorizontally ? '50%' : `${config.qrLeftPosition * (zoom / 100)}px`,
                    transform: config.qrCenterHorizontally ? 'translateX(-50%)' : 'none',
                    width: `${config.qrSize * (zoom / 100)}px`,
                    height: `${config.qrSize * (zoom / 100)}px`
                  }}
                >
                  <img
                    src={qrDataUrl}
                    alt="Código QR"
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      imageRendering: 'pixelated'
                    }}
                  />
                </div>
                
                {/* AR + Símbolos */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: `${config.arBottomPosition * (zoom / 100)}px`,
                    left: '50%',
                    transform: `translateX(-50%) translateX(${config.arOffsetX * (zoom / 100)}px) translateY(${config.arOffsetY * (zoom / 100)}px)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: `${config.arSpacing * (zoom / 100)}px`
                  }}
                >
                  {/* Logo AR */}
                  {config.useImage && config.imageUrl ? (
                    <img
                      src={config.imageUrl}
                      alt="AR"
                      style={{
                        height: `${config.arHeight * (zoom / 100)}px`,
                        width: 'auto',
                        display: 'block'
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontFamily: `"${config.fontFamily}", Arial, sans-serif`,
                        fontSize: `${config.fontSize * (zoom / 100)}px`,
                        fontWeight: config.fontWeight,
                        letterSpacing: `${config.letterSpacing * (zoom / 100)}px`,
                        textTransform: config.textTransform as any,
                        color: '#000000',
                        height: `${config.arHeight * (zoom / 100)}px`,
                        display: 'flex',
                        alignItems: 'center',
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
                      gap: `${config.checkSpacingVertical * (zoom / 100)}px`,
                      height: `${config.arHeight * (zoom / 100)}px`,
                      transform: `translateX(${config.tildeOffsetX * (zoom / 100)}px) translateY(${config.tildeOffsetY * (zoom / 100)}px)`
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
                            transform: `rotate(${angle}deg) scale(${size}) translate(${offsetX * (zoom / 100)}px, ${offsetY * (zoom / 100)}px)`,
                            transformOrigin: 'center'
                          }}
                        >
                          <svg
                            width={config.checkWidth * (zoom / 100)}
                            height={config.checkHeight * (zoom / 100)}
                            viewBox={`0 0 ${config.checkWidth} ${config.checkHeight}`}
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ display: 'block' }}
                          >
                            <path
                              d="M3 5L6.5 8.5L16 1.5"
                              stroke={getCurrentColor()}
                              strokeWidth={config.checkStrokeWidth}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Información de la vista previa */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Dimensiones reales:</strong> {config.labelWidth}×{config.labelHeight}px 
                  ({(config.labelWidth * 0.264583).toFixed(1)}×{(config.labelHeight * 0.264583).toFixed(1)}mm)
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Vista previa al {zoom}% del tamaño real
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer con acciones principales */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded border"
              style={{ backgroundColor: getCurrentColor() }}
            />
            <span className="text-sm text-gray-600">Color actual: {getCurrentColor()}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              updateConfig({ isActive: !config.isActive });
              toast.success(config.isActive ? 'Configuración desactivada' : 'Configuración activada');
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              config.isActive
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
            }`}
          >
            {config.isActive ? 'Desactivar' : 'Activar'}
          </button>
          
          <button
            onClick={() => {
              saveQRModConfig(config);
              toast.success('Configuración guardada');
            }}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

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