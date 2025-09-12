// QRModTool.tsx - Herramienta avanzada de configuración QR con pestañas mejoradas
import React, { useState, useRef, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  Wrench, X, Save, Download, Eye, Copy, CheckCircle, AlertCircle, Upload, 
  FileText, RefreshCw, Maximize2, ImageIcon, Grid3x3, Square, Move, Type, 
  Check, Settings, Ruler, FileType, Palette, ZoomIn, ZoomOut
} from 'lucide-react';

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
  zoom: number;
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
  gridSize: 1,
  zoom: 200
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
    toastEl.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-[60] text-sm';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  },
  error: (message: string) => {
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-[60] text-sm';
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
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<QRConfig>(loadQRModConfig);
  const [activeTab, setActiveTab] = useState('etiqueta');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Generar QR de ejemplo
    const exampleUrl = 'https://argqr.com/products/PROD-2025-001';
    setQrDataUrl(generateQRDataUrl(exampleUrl));
  }, []);

  const tabs = [
    { id: 'etiqueta', label: 'Etiqueta', icon: Square },
    { id: 'qr', label: 'QR', icon: Grid3x3 },
    { id: 'ar', label: 'AR', icon: Type },
    { id: 'simbolos', label: 'Símbolos', icon: Check },
    { id: 'fuente', label: 'Fuente', icon: FileType },
    { id: 'colores', label: 'Colores', icon: Palette },
    { id: 'general', label: 'General', icon: Settings }
  ];

  const handleConfigChange = (key: keyof QRConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    saveQRModConfig(newConfig);
  };

  const handleSave = () => {
    saveQRModConfig(config);
    toast.success('Configuración guardada');
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    saveQRModConfig(defaultConfig);
    toast.success('Configuración restablecida');
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'qr-config.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Configuración exportada');
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);
        setConfig({ ...defaultConfig, ...importedConfig });
        saveQRModConfig({ ...defaultConfig, ...importedConfig });
        toast.success('Configuración importada');
      } catch (error) {
        toast.error('Error al importar configuración');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const getCurrentColor = () => {
    return config.useCMYK 
      ? cmykToRgb(config.cmyk.c, config.cmyk.m, config.cmyk.y, config.cmyk.k)
      : config.checkColor;
  };

  // Botón flotante cuando está cerrado
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-40 w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
        title="Abrir QR Mod Tool"
      >
        <Wrench className="w-6 h-6" />
        {config.isActive && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
        )}
      </button>
    );
  }

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-7xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Settings className="w-6 h-6 text-white" />
                      <h2 className="text-xl font-bold text-white">QR Mod Tool</h2>
                      {config.isActive && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500 rounded-full">
                          <CheckCircle className="w-4 h-4 text-white" />
                          <span className="text-sm text-white font-medium">Activo</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 text-white transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Guardar
                      </button>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Contenido principal */}
                <div className="flex h-[80vh]">
                  {/* Panel izquierdo - Configuración */}
                  <div className="w-1/2 border-r border-gray-200 flex flex-col">
                    {/* Tabs */}
                    <div className="border-b border-gray-200 bg-gray-50">
                      <div className="flex overflow-x-auto">
                        {tabs.map((tab) => {
                          const Icon = tab.icon;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                                activeTab === tab.id
                                  ? 'border-purple-600 text-purple-600 bg-white'
                                  : 'border-transparent text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Contenido de pestañas */}
                    <div className="flex-1 overflow-y-auto p-6">
                      {activeTab === 'etiqueta' && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Square className="w-5 h-5" />
                            Configuración de Etiqueta
                          </h3>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ancho (px)
                              </label>
                              <input
                                type="number"
                                value={config.labelWidth}
                                onChange={(e) => handleConfigChange('labelWidth', Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Alto (px)
                              </label>
                              <input
                                type="number"
                                value={config.labelHeight}
                                onChange={(e) => handleConfigChange('labelHeight', Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Radio de borde (px)
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="20"
                                value={config.labelBorderRadius}
                                onChange={(e) => handleConfigChange('labelBorderRadius', Number(e.target.value))}
                                className="w-full"
                              />
                              <span className="text-sm text-gray-500">{config.labelBorderRadius}px</span>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Grosor de borde (px)
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="5"
                                step="0.5"
                                value={config.labelBorderWidth}
                                onChange={(e) => handleConfigChange('labelBorderWidth', Number(e.target.value))}
                                className="w-full"
                              />
                              <span className="text-sm text-gray-500">{config.labelBorderWidth}px</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Padding (px)
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                              <input
                                type="number"
                                placeholder="Top"
                                value={config.labelPaddingTop}
                                onChange={(e) => handleConfigChange('labelPaddingTop', Number(e.target.value))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <input
                                type="number"
                                placeholder="Right"
                                value={config.labelPaddingRight}
                                onChange={(e) => handleConfigChange('labelPaddingRight', Number(e.target.value))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <input
                                type="number"
                                placeholder="Bottom"
                                value={config.labelPaddingBottom}
                                onChange={(e) => handleConfigChange('labelPaddingBottom', Number(e.target.value))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <input
                                type="number"
                                placeholder="Left"
                                value={config.labelPaddingLeft}
                                onChange={(e) => handleConfigChange('labelPaddingLeft', Number(e.target.value))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'qr' && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Grid3x3 className="w-5 h-5" />
                            Configuración del QR
                          </h3>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tamaño del QR (px)
                            </label>
                            <input
                              type="range"
                              min="50"
                              max="120"
                              value={config.qrSize}
                              onChange={(e) => handleConfigChange('qrSize', Number(e.target.value))}
                              className="w-full"
                            />
                            <span className="text-sm text-gray-500">{config.qrSize}px</span>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Posición desde arriba (px)
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="50"
                              step="0.5"
                              value={config.qrTopPosition}
                              onChange={(e) => handleConfigChange('qrTopPosition', Number(e.target.value))}
                              className="w-full"
                            />
                            <span className="text-sm text-gray-500">{config.qrTopPosition}px</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="qrCenter"
                              checked={config.qrCenterHorizontally}
                              onChange={(e) => handleConfigChange('qrCenterHorizontally', e.target.checked)}
                              className="w-4 h-4 text-purple-600"
                            />
                            <label htmlFor="qrCenter" className="text-sm font-medium text-gray-700">
                              Centrar horizontalmente
                            </label>
                          </div>

                          {!config.qrCenterHorizontally && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Posición desde la izquierda (px)
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="50"
                                step="0.5"
                                value={config.qrLeftPosition}
                                onChange={(e) => handleConfigChange('qrLeftPosition', Number(e.target.value))}
                                className="w-full"
                              />
                              <span className="text-sm text-gray-500">{config.qrLeftPosition}px</span>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'ar' && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Type className="w-5 h-5" />
                            Configuración AR
                          </h3>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Texto AR
                            </label>
                            <input
                              type="text"
                              value={config.arText}
                              onChange={(e) => handleConfigChange('arText', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Posición desde abajo (px)
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="30"
                              step="0.5"
                              value={config.arBottomPosition}
                              onChange={(e) => handleConfigChange('arBottomPosition', Number(e.target.value))}
                              className="w-full"
                            />
                            <span className="text-sm text-gray-500">{config.arBottomPosition}px</span>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Altura (px)
                            </label>
                            <input
                              type="range"
                              min="10"
                              max="40"
                              value={config.arHeight}
                              onChange={(e) => handleConfigChange('arHeight', Number(e.target.value))}
                              className="w-full"
                            />
                            <span className="text-sm text-gray-500">{config.arHeight}px</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Desplazamiento X (px)
                              </label>
                              <input
                                type="range"
                                min="-20"
                                max="20"
                                step="0.5"
                                value={config.arOffsetX}
                                onChange={(e) => handleConfigChange('arOffsetX', Number(e.target.value))}
                                className="w-full"
                              />
                              <span className="text-sm text-gray-500">{config.arOffsetX}px</span>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Desplazamiento Y (px)
                              </label>
                              <input
                                type="range"
                                min="-20"
                                max="20"
                                step="0.5"
                                value={config.arOffsetY}
                                onChange={(e) => handleConfigChange('arOffsetY', Number(e.target.value))}
                                className="w-full"
                              />
                              <span className="text-sm text-gray-500">{config.arOffsetY}px</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Espaciado con símbolos (px)
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              step="0.5"
                              value={config.arSpacing}
                              onChange={(e) => handleConfigChange('arSpacing', Number(e.target.value))}
                              className="w-full"
                            />
                            <span className="text-sm text-gray-500">{config.arSpacing}px</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="useImage"
                              checked={config.useImage}
                              onChange={(e) => handleConfigChange('useImage', e.target.checked)}
                              className="w-4 h-4 text-purple-600"
                            />
                            <label htmlFor="useImage" className="text-sm font-medium text-gray-700">
                              Usar imagen en lugar de texto
                            </label>
                          </div>

                          {config.useImage && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                URL de la imagen
                              </label>
                              <input
                                type="text"
                                value={config.imageUrl}
                                onChange={(e) => handleConfigChange('imageUrl', e.target.value)}
                                placeholder="https://ejemplo.com/imagen.png"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'simbolos' && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Check className="w-5 h-5" />
                            Configuración de Símbolos
                          </h3>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Cantidad de símbolos
                            </label>
                            <select
                              value={config.symbolCount}
                              onChange={(e) => handleConfigChange('symbolCount', Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                              <option value={1}>1 símbolo</option>
                              <option value={2}>2 símbolos</option>
                              <option value={3}>3 símbolos</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ancho (px)
                              </label>
                              <input
                                type="range"
                                min="10"
                                max="30"
                                value={config.checkWidth}
                                onChange={(e) => handleConfigChange('checkWidth', Number(e.target.value))}
                                className="w-full"
                              />
                              <span className="text-sm text-gray-500">{config.checkWidth}px</span>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Alto (px)
                              </label>
                              <input
                                type="range"
                                min="5"
                                max="20"
                                step="0.5"
                                value={config.checkHeight}
                                onChange={(e) => handleConfigChange('checkHeight', Number(e.target.value))}
                                className="w-full"
                              />
                              <span className="text-sm text-gray-500">{config.checkHeight}px</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Grosor del trazo (px)
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="5"
                              step="0.1"
                              value={config.checkStrokeWidth}
                              onChange={(e) => handleConfigChange('checkStrokeWidth', Number(e.target.value))}
                              className="w-full"
                            />
                            <span className="text-sm text-gray-500">{config.checkStrokeWidth}px</span>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Espaciado vertical (px)
                            </label>
                            <input
                              type="range"
                              min="-5"
                              max="5"
                              step="0.5"
                              value={config.checkSpacingVertical}
                              onChange={(e) => handleConfigChange('checkSpacingVertical', Number(e.target.value))}
                              className="w-full"
                            />
                            <span className="text-sm text-gray-500">{config.checkSpacingVertical}px</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ángulo símbolo 1 (°)
                              </label>
                              <input
                                type="range"
                                min="-45"
                                max="45"
                                value={config.symbol1Angle}
                                onChange={(e) => handleConfigChange('symbol1Angle', Number(e.target.value))}
                                className="w-full"
                              />
                              <span className="text-sm text-gray-500">{config.symbol1Angle}°</span>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ángulo símbolo 2 (°)
                              </label>
                              <input
                                type="range"
                                min="-45"
                                max="45"
                                value={config.symbol2Angle}
                                onChange={(e) => handleConfigChange('symbol2Angle', Number(e.target.value))}
                                className="w-full"
                              />
                              <span className="text-sm text-gray-500">{config.symbol2Angle}°</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tamaño de símbolos (%)
                            </label>
                            <input
                              type="range"
                              min="50"
                              max="150"
                              value={config.symbolSize}
                              onChange={(e) => handleConfigChange('symbolSize', Number(e.target.value))}
                              className="w-full"
                            />
                            <span className="text-sm text-gray-500">{config.symbolSize}%</span>
                          </div>
                        </div>
                      )}

                      {activeTab === 'fuente' && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <FileType className="w-5 h-5" />
                            Configuración de Fuente
                          </h3>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Familia de fuente
                            </label>
                            <select
                              value={config.fontFamily}
                              onChange={(e) => handleConfigChange('fontFamily', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="Montserrat-Arabic">Montserrat Arabic</option>
                              <option value="Arial">Arial</option>
                              <option value="Helvetica">Helvetica</option>
                              <option value="Times New Roman">Times New Roman</option>
                              <option value="Georgia">Georgia</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tamaño de fuente (px)
                            </label>
                            <input
                              type="range"
                              min="8"
                              max="24"
                              value={config.fontSize}
                              onChange={(e) => handleConfigChange('fontSize', Number(e.target.value))}
                              className="w-full"
                            />
                            <span className="text-sm text-gray-500">{config.fontSize}px</span>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Peso de fuente
                            </label>
                            <select
                              value={config.fontWeight}
                              onChange={(e) => handleConfigChange('fontWeight', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="normal">Normal</option>
                              <option value="bold">Negrita</option>
                              <option value="lighter">Ligera</option>
                              <option value="bolder">Más negrita</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Espaciado entre letras (px)
                            </label>
                            <input
                              type="range"
                              min="-2"
                              max="5"
                              step="0.1"
                              value={config.letterSpacing}
                              onChange={(e) => handleConfigChange('letterSpacing', Number(e.target.value))}
                              className="w-full"
                            />
                            <span className="text-sm text-gray-500">{config.letterSpacing}px</span>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Transformación de texto
                            </label>
                            <select
                              value={config.textTransform}
                              onChange={(e) => handleConfigChange('textTransform', e.target.value)}
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
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Palette className="w-5 h-5" />
                            Configuración de Colores
                          </h3>
                          
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="useCMYK"
                              checked={config.useCMYK}
                              onChange={(e) => handleConfigChange('useCMYK', e.target.checked)}
                              className="w-4 h-4 text-purple-600"
                            />
                            <label htmlFor="useCMYK" className="text-sm font-medium text-gray-700">
                              Usar sistema CMYK oficial argentino
                            </label>
                          </div>

                          {config.useCMYK ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-medium text-blue-900 mb-3">Valores CMYK Oficiales</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-blue-700 mb-1">
                                    Cyan (%)
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={config.cmyk.c}
                                    onChange={(e) => handleConfigChange('cmyk', { ...config.cmyk, c: Number(e.target.value) })}
                                    className="w-full"
                                  />
                                  <span className="text-sm text-blue-600">{config.cmyk.c}%</span>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-blue-700 mb-1">
                                    Magenta (%)
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={config.cmyk.m}
                                    onChange={(e) => handleConfigChange('cmyk', { ...config.cmyk, m: Number(e.target.value) })}
                                    className="w-full"
                                  />
                                  <span className="text-sm text-blue-600">{config.cmyk.m}%</span>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-blue-700 mb-1">
                                    Yellow (%)
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={config.cmyk.y}
                                    onChange={(e) => handleConfigChange('cmyk', { ...config.cmyk, y: Number(e.target.value) })}
                                    className="w-full"
                                  />
                                  <span className="text-sm text-blue-600">{config.cmyk.y}%</span>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-blue-700 mb-1">
                                    Key/Negro (%)
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={config.cmyk.k}
                                    onChange={(e) => handleConfigChange('cmyk', { ...config.cmyk, k: Number(e.target.value) })}
                                    className="w-full"
                                  />
                                  <span className="text-sm text-blue-600">{config.cmyk.k}%</span>
                                </div>
                              </div>
                              <div className="mt-4 p-3 bg-white rounded border">
                                <p className="text-sm text-gray-700">
                                  Color resultante: 
                                  <span 
                                    className="inline-block w-6 h-6 rounded ml-2 border border-gray-300"
                                    style={{ backgroundColor: getCurrentColor() }}
                                  ></span>
                                  <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                                    {getCurrentColor()}
                                  </code>
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Color personalizado
                              </label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="color"
                                  value={config.checkColor}
                                  onChange={(e) => handleConfigChange('checkColor', e.target.value)}
                                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={config.checkColor}
                                  onChange={(e) => handleConfigChange('checkColor', e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'general' && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Configuración General
                          </h3>
                          
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="isActive"
                              checked={config.isActive}
                              onChange={(e) => handleConfigChange('isActive', e.target.checked)}
                              className="w-4 h-4 text-purple-600"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                              Aplicar configuración a componentes
                            </label>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="showGrid"
                              checked={config.showGrid}
                              onChange={(e) => handleConfigChange('showGrid', e.target.checked)}
                              className="w-4 h-4 text-purple-600"
                            />
                            <label htmlFor="showGrid" className="text-sm font-medium text-gray-700">
                              Mostrar cuadrícula de medición
                            </label>
                          </div>

                          <div className="space-y-4">
                            <button
                              onClick={handleReset}
                              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Restablecer configuración
                            </button>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={handleExport}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Exportar
                              </button>
                              <button
                                onClick={handleImport}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                              >
                                <Upload className="w-4 h-4" />
                                Importar
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Panel derecho - Vista previa */}
                  <div className="w-1/2 bg-gray-50 flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-white">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Vista Previa</h3>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600">Zoom:</span>
                          <button
                            onClick={() => handleConfigChange('zoom', Math.max(100, config.zoom - 50))}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <ZoomOut className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium text-gray-900 min-w-[60px] text-center">
                            {config.zoom}%
                          </span>
                          <button
                            onClick={() => handleConfigChange('zoom', Math.min(500, config.zoom + 50))}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
                      <div 
                        style={{
                          transform: `scale(${config.zoom / 100})`,
                          transformOrigin: 'center'
                        }}
                      >
                        {/* Vista previa de la etiqueta QR */}
                        <div
                          style={{
                            width: `${config.labelWidth}px`,
                            height: `${config.labelHeight}px`,
                            backgroundColor: '#ffffff',
                            border: `${config.labelBorderWidth}px solid #000000`,
                            borderRadius: `${config.labelBorderRadius}px`,
                            position: 'relative',
                            overflow: 'hidden',
                            boxSizing: 'border-box',
                            padding: `${config.labelPaddingTop}px ${config.labelPaddingRight}px ${config.labelPaddingBottom}px ${config.labelPaddingLeft}px`,
                            backgroundImage: config.showGrid ? 
                              `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)` : 
                              'none',
                            backgroundSize: config.showGrid ? `${config.gridSize}px ${config.gridSize}px` : 'auto'
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
                              height: `${config.qrSize}px`
                            }}
                          >
                            {qrDataUrl && (
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
                            )}
                          </div>
                          
                          {/* AR + Tildes */}
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
                            {config.useImage && config.imageUrl ? (
                              <img
                                src={config.imageUrl}
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
                                  fontFamily: `"${config.fontFamily}", Arial, sans-serif`,
                                  fontSize: `${config.fontSize}px`,
                                  fontWeight: config.fontWeight,
                                  letterSpacing: `${config.letterSpacing}px`,
                                  textTransform: config.textTransform as any,
                                  color: '#000000',
                                  height: `${config.arHeight}px`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  lineHeight: 1
                                }}
                              >
                                {config.arText}
                              </span>
                            )}
                            
                            {/* Tildes */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: `${config.checkSpacingVertical}px`,
                                height: `${config.arHeight}px`,
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
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer con acciones */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        Configuración: {config.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                      <span className="text-sm text-gray-600">
                        Dimensiones: {config.labelWidth}×{config.labelHeight}px
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Exportar Config
                      </button>
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Restablecer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Input oculto para importar archivos */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
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

// Funciones auxiliares
const saveQRModConfig = (config: QRConfig) => {
  localStorage.setItem('qrModConfig', JSON.stringify(config));
};

const loadQRModConfig = (): QRConfig => {
  const saved = localStorage.getItem('qrModConfig');
  if (saved) {
    return { ...defaultConfig, ...JSON.parse(saved) };
  }
  return defaultConfig;
};

const handleSave = (config: QRConfig) => {
  saveQRModConfig(config);
  toast.success('Configuración guardada');
};

const handleReset = (setConfig: (config: QRConfig) => void) => {
  setConfig(defaultConfig);
  saveQRModConfig(defaultConfig);
  toast.success('Configuración restablecida');
};

const handleExport = (config: QRConfig) => {
  const dataStr = JSON.stringify(config, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'qr-config.json';
  link.click();
  URL.revokeObjectURL(url);
  toast.success('Configuración exportada');
};

const handleImport = (fileInputRef: React.RefObject<HTMLInputElement>) => {
  fileInputRef.current?.click();
};