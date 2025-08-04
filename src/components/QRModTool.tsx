// QRModTool.tsx - Herramienta avanzada de configuración QR con pestañas
import React, { useState, useRef, useEffect } from 'react';
import { Wrench, X, Save, Download, Eye, Copy, CheckCircle, AlertCircle, Upload, FileText, RefreshCw, Maximize2, ImageIcon, Grid3x3, Square, Move, Type, Check, Settings, Ruler } from 'lucide-react';

// Tipos
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
  
  // Tildes
  checkWidth: number;
  checkHeight: number;
  checkStrokeWidth: number;
  checkSpacingVertical: number;
  tildeOffsetX: number;
  tildeOffsetY: number;
  
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
  
  // Tildes
  checkWidth: 19,
  checkHeight: 9.5,
  checkStrokeWidth: 2.2,
  checkSpacingVertical: -0.5,
  tildeOffsetX: 0,
  tildeOffsetY: 0,
  
  // General
  isActive: true,
  showGrid: false,
  gridSize: 1
};

// Función auxiliar para CMYK a RGB
const cmykToRgb = () => '#0ac5ff';

// Sistema de notificaciones simple
const toast = {
  success: (message: string) => {
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  },
  error: (message: string) => {
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  }
};

// Generador de QR simple (placeholder)
const generateQRDataUrl = (text: string): string => {
  // Creamos un QR placeholder con SVG
  const size = 200;
  const modules = 25;
  const moduleSize = size / modules;
  
  let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;
  svg += '<rect width="100%" height="100%" fill="white"/>';
  
  // Patrón simple de QR (no es un QR real, solo visual)
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (
        // Esquinas de posición
        (row < 7 && col < 7) ||
        (row < 7 && col >= modules - 7) ||
        (row >= modules - 7 && col < 7) ||
        // Patrón aleatorio para el centro
        (row >= 7 && row < modules - 7 && col >= 7 && col < modules - 7 && Math.random() > 0.5)
      ) {
        const x = col * moduleSize;
        const y = row * moduleSize;
        svg += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }
  
  svg += '</svg>';
  
  // Convertir SVG a data URL
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
  const [customFonts, setCustomFonts] = useState<string[]>(['Arial', 'Montserrat-Arabic']);
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

  // Tabs configuration
  const tabs = [
    { id: 'label', label: 'Etiqueta', icon: Square },
    { id: 'qr', label: 'Código QR', icon: Grid3x3 },
    { id: 'ar', label: 'Logo AR', icon: Type },
    { id: 'tildes', label: 'Tildes', icon: Check },
    { id: 'general', label: 'General', icon: Settings }
  ];

  // Generar QR de prueba
  useEffect(() => {
    const qrUrl = generateQRDataUrl('https://ejemplo.com?id=TEST123');
    setQrDataUrl(qrUrl);
  }, []);

  // Cargar fuente personalizada si existe
  useEffect(() => {
    if (config.fontFamily && config.fontFamily !== 'Arial' && fontUrl) {
      const style = document.createElement('style');
      style.textContent = `
        @font-face {
          font-family: '${config.fontFamily}';
          src: url('${fontUrl}');
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [config.fontFamily, fontUrl]);

  // Verificar estado de componentes
  const checkComponentsStatus = () => {
    const savedConfig = localStorage.getItem('qrModConfig');
    const status = {
      qrGenerator: !!savedConfig && config.isActive,
      qrModal: !!savedConfig && config.isActive,
      lastCheck: new Date()
    };
    setComponentsStatus(status);
  };

  useEffect(() => {
    checkComponentsStatus();
    const interval = setInterval(checkComponentsStatus, 2000);
    return () => clearInterval(interval);
  }, [config.isActive]);

  // Actualizar configuración
  const updateConfig = (key: keyof QRConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
  };

  // Guardar configuración
  const handleSave = () => {
    saveQRModConfig(config);
    toast.success('Configuración guardada');
    checkComponentsStatus();
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
        toast.success(`Fuente "${fontName}" cargada`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Cargar imagen AR
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  // Descargar PNG de prueba
  const downloadTestPNG = async () => {
    if (labelRef.current) {
      try {
        // Crear canvas para capturar el elemento
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Configurar tamaño del canvas
        const scale = 8; // Para alta calidad
        canvas.width = config.labelWidth * scale;
        canvas.height = config.labelHeight * scale;
        
        // Fondo blanco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar borde
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = config.labelBorderWidth * scale;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar QR (placeholder)
        const qrX = config.qrCenterHorizontally 
          ? (canvas.width - config.qrSize * scale) / 2 
          : config.qrLeftPosition * scale;
        const qrY = config.qrTopPosition * scale;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(qrX, qrY, config.qrSize * scale, config.qrSize * scale);
        
        // Dibujar texto AR o imagen
        const arX = canvas.width / 2 + config.arOffsetX * scale;
        const arY = canvas.height - config.arBottomPosition * scale + config.arOffsetY * scale;
        
        if (config.useImage && (config.imageUrl || uploadedImage)) {
          // Si hay imagen, dibujar un rectángulo placeholder
          ctx.fillStyle = '#cccccc';
          ctx.fillRect(arX - 20, arY - config.arHeight * scale / 2, 40, config.arHeight * scale);
        } else {
          // Dibujar texto AR
          ctx.fillStyle = '#000000';
          ctx.font = `bold ${config.fontSize * scale}px ${config.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('AR', arX, arY);
        }
        
        // Dibujar tildes (checkmarks simplificados)
        const tildeX = arX + config.arSpacing * scale + config.tildeOffsetX * scale;
        const tildeY = arY + config.tildeOffsetY * scale;
        
        ctx.strokeStyle = cmykToRgb();
        ctx.lineWidth = config.checkStrokeWidth * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Primera tilde
        ctx.beginPath();
        ctx.moveTo(tildeX - 8 * scale, tildeY - config.checkSpacingVertical * scale);
        ctx.lineTo(tildeX - 2 * scale, tildeY + 3 * scale - config.checkSpacingVertical * scale);
        ctx.lineTo(tildeX + 8 * scale, tildeY - 5 * scale - config.checkSpacingVertical * scale);
        ctx.stroke();
        
        // Segunda tilde
        ctx.beginPath();
        ctx.moveTo(tildeX - 8 * scale, tildeY + config.checkSpacingVertical * scale);
        ctx.lineTo(tildeX - 2 * scale, tildeY + 3 * scale + config.checkSpacingVertical * scale);
        ctx.lineTo(tildeX + 8 * scale, tildeY - 5 * scale + config.checkSpacingVertical * scale);
        ctx.stroke();
        
        // Convertir canvas a blob y descargar
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'etiqueta-qr-test.png';
            a.click();
            URL.revokeObjectURL(url);
            toast.success('PNG descargado');
          }
        });
      } catch (error) {
        console.error('Error:', error);
        toast.error('Error al descargar PNG');
      }
    }
  };

  // Generar imagen AR desde texto
  const generateARImage = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 200;
    canvas.height = 80;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${config.fontSize * 3}px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AR', canvas.width / 2, canvas.height / 2);

    const imageData = canvas.toDataURL('image/png');
    setUploadedImage(imageData);
    updateConfig('imageUrl', imageData);
    updateConfig('useImage', true);
    toast.success('Imagen AR generada');
  };

  // Aplicar a componentes
  const applyToComponents = () => {
    handleSave();
    window.dispatchEvent(new Event('qrModConfigUpdated'));
    toast.success('Configuración aplicada a los componentes');
  };

  // Copiar código
  const copyCode = () => {
    const code = generateCode();
    navigator.clipboard.writeText(code);
    toast.success('Código copiado');
  };

  // Generar código
  const generateCode = () => {
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
    boxSizing: 'border-box',
    padding: '${config.labelPaddingTop}px ${config.labelPaddingRight}px ${config.labelPaddingBottom}px ${config.labelPaddingLeft}px'
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
      height: '${config.qrSize}px'
    }}
  >
    <img src={qrDataUrl} alt="QR" style={{ width: '100%', height: '100%' }} />
  </div>

  {/* AR + Tildes */}
  <div
    style={{
      position: 'absolute',
      bottom: '${config.arBottomPosition}px',
      left: '50%',
      transform: 'translateX(-50%) translateX(${config.arOffsetX}px) translateY(${config.arOffsetY}px)',
      display: 'flex',
      alignItems: 'center',
      gap: '${config.arSpacing}px'
    }}
  >
    {/* AR */}
    ${config.useImage ? `<img src="${config.imageUrl}" alt="AR" style={{ height: '${config.arHeight}px' }} />` : 
    `<span style={{ fontFamily: '${config.fontFamily}', fontSize: '${config.fontSize}px', fontWeight: 'bold' }}>AR</span>`}
    
    {/* Tildes */}
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '${config.checkSpacingVertical}px',
      transform: 'translateX(${config.tildeOffsetX}px) translateY(${config.tildeOffsetY}px)'
    }}>
      {[0, 1].map(i => (
        <svg key={i} width="${config.checkWidth}" height="${config.checkHeight}" viewBox="0 0 ${config.checkWidth} ${config.checkHeight}">
          <path d="M3 5L6.5 8.5L16 1.5" stroke="${cmykToRgb()}" strokeWidth="${config.checkStrokeWidth}" />
        </svg>
      ))}
    </div>
  </div>
</div>`;
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
              <label className="text-sm text-gray-600">Espacio AR-Tildes: {config.arSpacing}px</label>
              <input
                type="range"
                min="0"
                max="20"
                value={config.arSpacing}
                onChange={(e) => updateConfig('arSpacing', Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Fuente y Estilo</h4>
              
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
              
              {!config.useImage && (
                <>
                  <div className="mb-3">
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
                </>
              )}
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 p-2 rounded text-sm flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Cargar Fuente
                </button>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 p-2 rounded text-sm flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Cargar Imagen
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".otf,.ttf,.woff,.woff2"
                onChange={handleFontUpload}
                className="hidden"
              />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {!config.useImage && (
                <button
                  onClick={generateARImage}
                  className="w-full mt-2 bg-blue-100 hover:bg-blue-200 p-2 rounded text-sm"
                >
                  Generar Imagen AR desde Fuente
                </button>
              )}
            </div>
          </div>
        );
        
      case 'tildes':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Configuración de Tildes
            </h3>
            
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
        );
        
      case 'general':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuración General
            </h3>
            
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Estado de Componentes</h4>
                <button
                  onClick={checkComponentsStatus}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Actualizar estado"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${componentsStatus.qrGenerator ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>QRGenerator: {componentsStatus.qrGenerator ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${componentsStatus.qrModal ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>QRModal: {componentsStatus.qrModal ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>
              
              {componentsStatus.lastCheck && (
                <p className="text-xs text-gray-500 mt-2">
                  Última verificación: {componentsStatus.lastCheck.toLocaleTimeString()}
                </p>
              )}
            </div>
            
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
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  -
                </button>
                <span className="min-w-[60px] text-center">{scale * 100}%</span>
                <button
                  onClick={() => setScale(Math.min(5, scale + 0.5))}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
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
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Configurador QR Avanzado
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 hover:bg-blue-800 rounded transition-colors"
                  title="Pantalla completa"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-blue-800 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex h-[calc(100%-4rem)]">
              {/* Sidebar with tabs */}
              <div className="w-64 bg-gray-100 border-r overflow-y-auto">
                <nav className="p-4">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full text-left p-3 mb-2 rounded-lg flex items-center gap-3 transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
                
                {/* Actions */}
                <div className="p-4 border-t">
                  <button
                    onClick={handleSave}
                    className="w-full mb-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Guardar
                  </button>
                  <button
                    onClick={applyToComponents}
                    className="w-full mb-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aplicar
                  </button>
                  <button
                    onClick={downloadTestPNG}
                    className="w-full mb-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Test PNG
                  </button>
                  <button
                    onClick={copyCode}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar Código
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
                                fontWeight: 'bold',
                                color: '#000000',
                                lineHeight: 1
                              }}
                            >
                              AR
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
                              transform: `translateX(${config.tildeOffsetX}px) translateY(${config.tildeOffsetY}px)`
                            }}
                          >
                            {[0, 1].map((i) => (
                              <svg
                                key={i}
                                width={config.checkWidth}
                                height={config.checkHeight}
                                viewBox={`0 0 ${config.checkWidth} ${config.checkHeight}`}
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                style={{ display: 'block' }}
                              >
                                <path
                                  d="M3 5L6.5 8.5L16 1.5"
                                  stroke={cmykToRgb()}
                                  strokeWidth={config.checkStrokeWidth}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ))}
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
                    <p className="text-xs text-gray-500">
                      ({(config.labelWidth / 3.78).toFixed(1)}mm × {(config.labelHeight / 3.78).toFixed(1)}mm)
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