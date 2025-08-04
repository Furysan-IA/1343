// QRModTool.tsx - Herramienta mejorada con rangos ampliados y generador de QR de prueba
import React, { useState, useRef, useEffect } from 'react';
import { Wrench, X, Save, Download, Eye, Copy, CheckCircle, AlertCircle, Upload, FileText, RefreshCw, QrCode, TestTube, Maximize2, Minimize2, Maximize, Minimize, Settings } from 'lucide-react';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

interface QRModConfig {
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
  labelScale: number; // Nueva propiedad para escalar toda la etiqueta
}

interface ComponentStatus {
  qrGenerator: boolean;
  qrModal: boolean;
  lastChecked: Date | null;
}

export function QRModTool() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<QRModConfig | null>(null);
  const [config, setConfig] = useState<QRModConfig>({
    qrTop: 3,
    arBottom: 9,
    arSize: 19,
    arGap: 3,
    checkHeight: 10,
    checkOverlap: -0.5,
    fontFamily: 'AR-Monserrat-Arabic',
    fontSize: 16,
    useImage: false,
    imagePath: '/src/assets/images/AR-Monserrat-arabic.png',
    labelScale: 1
  });
  
  const [fontStatus, setFontStatus] = useState<'checking' | 'loaded' | 'error'>('checking');
  const [customFontName, setCustomFontName] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [componentStatus, setComponentStatus] = useState<ComponentStatus>({
    qrGenerator: false,
    qrModal: false,
    lastChecked: null
  });
  const [testQrUrl, setTestQrUrl] = useState('https://argqr.com/products/80587de9-4374-42b4-bed5-1006ac7abcc2');
  const [testQrDataUrl, setTestQrDataUrl] = useState('');
  const [isGeneratingTestQr, setIsGeneratingTestQr] = useState(false);
  
  const labelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkFontStatus();
    checkComponentsStatus();
    // Cargar configuración guardada
    const savedConfig = localStorage.getItem('qr-mod-config');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      setConfig(parsedConfig);
      setOriginalConfig(parsedConfig);
    } else {
      setOriginalConfig(config);
    }
    // Generar QR de prueba inicial
    generateTestQr();
  }, []);

  useEffect(() => {
    generateCode();
  }, [config]);

  useEffect(() => {
    // Revisar estado de componentes cada 2 segundos cuando está abierto
    if (isOpen) {
      const interval = setInterval(checkComponentsStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const generateTestQr = async () => {
    setIsGeneratingTestQr(true);
    try {
      const qrData = await QRCode.toDataURL(testQrUrl, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setTestQrDataUrl(qrData);
    } catch (error) {
      console.error('Error generando QR de prueba:', error);
      toast.error('Error al generar QR de prueba');
    } finally {
      setIsGeneratingTestQr(false);
    }
  };

  const checkFontStatus = async () => {
    try {
      await document.fonts.ready;
      const fontLoaded = await document.fonts.load(`700 ${config.fontSize}px ${config.fontFamily}`);
      setFontStatus(fontLoaded.length > 0 ? 'loaded' : 'error');
    } catch {
      setFontStatus('error');
    }
  };

  const checkComponentsStatus = () => {
    const isApplied = localStorage.getItem('qr-mod-apply') === 'true';
    const savedConfig = localStorage.getItem('qr-mod-config');
    
    setComponentStatus({
      qrGenerator: isApplied && !!savedConfig,
      qrModal: isApplied && !!savedConfig,
      lastChecked: new Date()
    });
  };

  const handleFontUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (!file.name.match(/\.(otf|ttf|woff|woff2)$/i)) {
        toast.error('Por favor sube un archivo de fuente válido (.otf, .ttf, .woff, .woff2)');
        return;
      }

      const fontUrl = URL.createObjectURL(file);
      const fontName = file.name.replace(/\.[^/.]+$/, "");

      const style = document.createElement('style');
      style.innerHTML = `
        @font-face {
          font-family: '${fontName}';
          src: url('${fontUrl}') format('opentype');
          font-weight: 700;
          font-style: normal;
        }
      `;
      document.head.appendChild(style);

      await document.fonts.load(`700 16px "${fontName}"`);

      setCustomFontName(fontName);
      updateConfig('fontFamily', fontName);
      updateConfig('customFontUrl', fontUrl);
      
      toast.success(`Fuente ${fontName} cargada exitosamente`);
      checkFontStatus();
    } catch (error) {
      console.error('Error cargando fuente:', error);
      toast.error('Error al cargar la fuente');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor sube una imagen válida');
        return;
      }

      const imageUrl = URL.createObjectURL(file);
      
      setCustomImageUrl(imageUrl);
      updateConfig('imagePath', imageUrl);
      updateConfig('useImage', true);
      
      toast.success(`Imagen cargada exitosamente`);
    } catch (error) {
      console.error('Error cargando imagen:', error);
      toast.error('Error al cargar la imagen');
    }
  };

  const updateConfig = (key: keyof QRModConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const saveConfig = () => {
    localStorage.setItem('qr-mod-config', JSON.stringify(config));
    setOriginalConfig(config);
    setHasUnsavedChanges(false);
    toast.success('Configuración guardada');
  };

  const applyToComponents = () => {
    localStorage.setItem('qr-mod-config', JSON.stringify(config));
    localStorage.setItem('qr-mod-apply', 'true');
    checkComponentsStatus();
    toast.success('Configuración aplicada. Los componentes usarán estos valores.');
  };

  const resetApplication = () => {
    localStorage.removeItem('qr-mod-apply');
    checkComponentsStatus();
    toast.info('Aplicación de cambios desactivada');
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const shouldSave = confirm('Tienes cambios sin guardar. ¿Deseas guardarlos antes de cerrar?');
      if (shouldSave) {
        saveConfig();
      }
    }
    setIsOpen(false);
    setIsMinimized(false);
    setIsMaximized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const downloadTestLabel = async () => {
    if (!labelRef.current) return;

    try {
      await document.fonts.ready;
      
      const scale = config.labelScale;
      const baseWidth = 94;
      const baseHeight = 113;
      
      const dataUrl = await toPng(labelRef.current, {
        width: baseWidth * scale,
        height: baseHeight * scale,
        pixelRatio: 8,
        quality: 1,
        backgroundColor: '#ffffff',
        includeQueryParams: true,
        cacheBust: true
      });
      
      saveAs(dataUrl, `qr-test-label-${scale}x.png`);
      toast.success(`Etiqueta de prueba descargada (escala ${scale}x)`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al descargar');
    }
  };

  const generateARImage = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 60;
    canvas.height = 30;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${config.fontSize}px "${config.fontFamily}"`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AR', 30, 15);
    
    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, `AR-${config.fontFamily}.png`);
        toast.success('Imagen AR generada y descargada');
      }
    });
  };

  const generateCode = () => {
    const code = `<div 
  ref={labelRef}
  style={{
    width: '94px',
    height: '113px',
    backgroundColor: '#ffffff',
    border: '1px solid #000000',
    borderRadius: '8px',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box'
  }}
>
  {/* Código QR */}
  <div
    style={{
      position: 'absolute',
      top: '${config.qrTop}px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '75px',
      height: '75px'
    }}
  >
    <img
      src={qrDataUrl}
      alt="Código QR"
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        imageRendering: 'crisp-edges'
      }}
    />
  </div>
  
  {/* AR + Tildes */}
  <div
    style={{
      position: 'absolute',
      bottom: '${config.arBottom}px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '${config.arGap}px'
    }}
  >
    {/* Logo AR */}
    ${config.useImage ? `<img
      src="${config.imagePath}"
      alt="AR"
      style={{
        height: '${config.arSize}px',
        width: 'auto',
        display: 'block'
      }}
    />` : `<span
      style={{
        fontFamily: '"${config.fontFamily}", Arial, sans-serif',
        fontSize: '${config.fontSize}px',
        fontWeight: 700,
        color: '#000000',
        height: '${config.arSize}px',
        display: 'flex',
        alignItems: 'center',
        lineHeight: 1
      }}
    >
      AR
    </span>`}
    
    {/* Tildes */}
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0',
        height: '${config.arSize}px'
      }}
    >
      <svg
        width="${config.arSize}"
        height="${config.checkHeight}"
        viewBox="0 0 19 9.5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ 
          display: 'block',
          marginBottom: '${config.checkOverlap}px'
        }}
      >
        <path
          d="M3 5L6.5 8.5L16 1.5"
          stroke={cmykToRgb()}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg
        width="${config.arSize}"
        height="${config.checkHeight}"
        viewBox="0 0 19 9.5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ 
          display: 'block',
          marginTop: '${config.checkOverlap}px'
        }}
      >
        <path
          d="M3 5L6.5 8.5L16 1.5"
          stroke={cmykToRgb()}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  </div>
</div>`;
    setGeneratedCode(code);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success('Código copiado');
  };

  const copyTestUrl = () => {
    navigator.clipboard.writeText(testQrUrl);
    toast.success('URL copiada');
  };

  // Convert CMYK to RGB
  const cmykToRgb = () => {
    const c = 0.47;
    const m = 0.22;
    const y = 0;
    const k = 0.14;
    
    const r = Math.round(255 * (1 - c) * (1 - k));
    const g = Math.round(255 * (1 - m) * (1 - k));
    const b = Math.round(255 * (1 - y) * (1 - k));
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all z-50 group"
        title="Modificar QR"
      >
        <Wrench className="w-6 h-6" />
        {componentStatus.qrGenerator && componentStatus.qrModal && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {/* Panel de herramientas expandido */}
      {isOpen && (
        <div className={`fixed ${isMaximized ? 'inset-0' : 'inset-2 md:inset-auto md:bottom-4 md:left-4'} ${!isMaximized ? 'md:w-[900px] md:max-w-[calc(100vw-32px)] md:h-[calc(100vh-32px)] md:max-h-[900px]' : ''} bg-white rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col transition-all duration-300 ${isMinimized ? 'h-auto' : ''}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
            <div className="flex-1">
              <h3 className="font-semibold flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Modificador de QR - Herramienta de Desarrollo
                {hasUnsavedChanges && (
                  <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full">
                    Cambios sin guardar
                  </span>
                )}
              </h3>
              {!isMinimized && (
                <p className="text-sm text-purple-100 mt-1">
                  Ajusta todos los parámetros del QR en tiempo real desde esta ventana
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMinimize}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                title={isMinimized ? "Maximizar" : "Minimizar"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={toggleMaximize}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                title={isMaximized ? "Restaurar" : "Maximizar"}
              >
                {isMaximized ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
              <button
                onClick={handleClose}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Estado de componentes */}
          <div className="p-3 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Estado de Componentes:</h4>
              <button
                onClick={checkComponentsStatus}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                {componentStatus.qrGenerator ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm">QRGenerator</span>
              </div>
              <div className="flex items-center gap-2">
                {componentStatus.qrModal ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm">QRModal</span>
              </div>
            </div>
            {componentStatus.lastChecked && (
              <p className="text-xs text-gray-500 mt-1">
                Última verificación: {componentStatus.lastChecked.toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Content con tabs - Solo mostrar si no está minimizado */}
          {!isMinimized && (
            <div className="flex-1 overflow-y-auto">
              {/* Tab de configuración principal */}
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vista previa */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Vista Previa</h4>
                    <span className="text-sm text-gray-500">Escala: {config.labelScale}x</span>
                  </div>
                  <div className="flex justify-center p-4 bg-gray-50 rounded">
                    <div style={{ transform: `scale(${config.labelScale})`, transformOrigin: 'center' }}>
                      <div
                        ref={labelRef}
                        style={{
                          width: '94px',
                          height: '113px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #000000',
                          borderRadius: '8px',
                          position: 'relative',
                          overflow: 'hidden',
                          boxSizing: 'border-box'
                        }}
                      >
                        {/* QR real o simulado */}
                        <div
                          style={{
                            position: 'absolute',
                            top: `${config.qrTop}px`,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '75px',
                            height: '75px',
                            backgroundColor: '#ffffff',
                            padding: '2px'
                          }}
                        >
                          {testQrDataUrl ? (
                            <img
                              src={testQrDataUrl}
                              alt="QR de prueba"
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'block',
                                imageRendering: 'crisp-edges'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '100%',
                              height: '100%',
                              background: 'repeating-linear-gradient(45deg, #000, #000 2px, #fff 2px, #fff 4px)'
                            }} />
                          )}
                        </div>
                        
                        {/* AR + Tildes */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: `${config.arBottom}px`,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: `${config.arGap}px`
                          }}
                        >
                          {config.useImage ? (
                            customImageUrl || config.imagePath ? (
                              <img
                                src={customImageUrl || config.imagePath}
                                alt="AR"
                                style={{
                                  height: `${config.arSize}px`,
                                  width: 'auto',
                                  display: 'block'
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.parentElement!.innerHTML = `
                                    <div style="
                                      height: ${config.arSize}px;
                                      padding: 2px 6px;
                                      background: #ddd;
                                      font-size: 12px;
                                      display: flex;
                                      align-items: center;
                                    ">IMG</div>
                                  `;
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  height: `${config.arSize}px`,
                                  width: 'auto',
                                  background: '#ddd',
                                  padding: '2px 6px',
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                IMG
                              </div>
                            )
                          ) : (
                            <span
                              style={{
                                fontFamily: `"${config.fontFamily}", Arial, sans-serif`,
                                fontSize: `${config.fontSize}px`,
                                fontWeight: 700,
                                color: '#000000',
                                height: `${config.arSize}px`,
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              AR
                            </span>
                          )}
                          
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0',
                              height: `${config.arSize}px`
                            }}
                          >
                            <svg
                              width={config.arSize}
                              height={config.checkHeight}
                              viewBox="0 0 19 9.5"
                              fill="none"
                              style={{ 
                                display: 'block',
                                marginBottom: `${config.checkOverlap}px`
                              }}
                            >
                              <path
                                d="M3 5L6.5 8.5L16 1.5"
                                stroke={cmykToRgb()}
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <svg
                              width={config.arSize}
                              height={config.checkHeight}
                              viewBox="0 0 19 9.5"
                              fill="none"
                              style={{ 
                                display: 'block',
                                marginTop: `${config.checkOverlap}px`
                              }}
                            >
                              <path
                                d="M3 5L6.5 8.5L16 1.5"
                                stroke={cmykToRgb()}
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR de prueba con URL personalizada */}
                  <div className="mt-4 p-3 bg-blue-50 rounded">
                    <h5 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <TestTube className="w-4 h-4" />
                      QR de Prueba
                    </h5>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={testQrUrl}
                        onChange={(e) => setTestQrUrl(e.target.value)}
                        className="flex-1 p-2 text-xs border rounded"
                        placeholder="URL para QR de prueba"
                      />
                      <button
                        onClick={copyTestUrl}
                        className="p-2 text-blue-600 hover:text-blue-800"
                        title="Copiar URL"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={generateTestQr}
                      disabled={isGeneratingTestQr}
                      className="w-full text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                    >
                      {isGeneratingTestQr ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4" />
                          Generar QR
                        </>
                      )}
                    </button>
                  </div>

                  {/* Estado de la fuente */}
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {fontStatus === 'loaded' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className="text-sm">
                          Fuente {config.fontFamily}: {fontStatus === 'loaded' ? 'Cargada' : 'No disponible'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Upload className="w-4 h-4" />
                        Cargar Fuente
                      </button>
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                      >
                        <Upload className="w-4 h-4" />
                        Cargar Imagen
                      </button>
                    </div>
                    {customFontName && (
                      <p className="text-xs text-gray-600 mt-2">
                        Fuente personalizada: {customFontName}
                      </p>
                    )}
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
                    {customImageUrl && (
                      <div className="mt-3 flex items-center gap-2">
                        <img 
                          src={customImageUrl} 
                          alt="Custom AR" 
                          className="h-8 w-auto border rounded"
                        />
                        <span className="text-xs text-gray-600">
                          Imagen personalizada cargada
                        </span>
                        <button
                          onClick={() => {
                            setCustomImageUrl('');
                            updateConfig('imagePath', '/src/assets/images/AR-Monserrat-arabic.png');
                          }}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Limpiar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Controles */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Controles de Ajuste
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Ajusta todos los parámetros en tiempo real y ve los cambios instantáneamente
                    </p>
                  </div>
                  
                  {/* Escala de vista previa */}
                  <div className="p-3 bg-purple-50 rounded">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Maximize2 className="w-4 h-4" />
                      Escala de vista previa: {config.labelScale}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.5"
                      value={config.labelScale}
                      onChange={(e) => updateConfig('labelScale', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">QR desde arriba: {config.qrTop}px</label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={config.qrTop}
                      onChange={(e) => updateConfig('qrTop', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">AR desde abajo: {config.arBottom}px</label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={config.arBottom}
                      onChange={(e) => updateConfig('arBottom', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="p-3 bg-yellow-50 rounded">
                    <label className="text-sm font-medium text-yellow-900">
                      Tamaño AR: {config.arSize}px (Rango ampliado)
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="40"
                      value={config.arSize}
                      onChange={(e) => updateConfig('arSize', Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-yellow-700 mt-1">
                      Ahora puedes aumentar hasta 40px para mayor visibilidad
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Espacio AR-Tildes: {config.arGap}px</label>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={config.arGap}
                      onChange={(e) => updateConfig('arGap', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="p-3 bg-yellow-50 rounded">
                    <label className="text-sm font-medium text-yellow-900">
                      Altura tildes: {config.checkHeight}px (Rango ampliado)
                    </label>
                    <input
                      type="range"
                      min="6"
                      max="20"
                      value={config.checkHeight}
                      onChange={(e) => updateConfig('checkHeight', Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-yellow-700 mt-1">
                      Rango extendido hasta 20px para tildes más grandes
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Superposición tildes: {config.checkOverlap}px</label>
                    <input
                      type="range"
                      min="-3"
                      max="3"
                      step="0.5"
                      value={config.checkOverlap}
                      onChange={(e) => updateConfig('checkOverlap', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="p-3 bg-yellow-50 rounded">
                    <label className="text-sm font-medium text-yellow-900">
                      Tamaño de fuente: {config.fontSize}px (Rango ampliado)
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="30"
                      value={config.fontSize}
                      onChange={(e) => updateConfig('fontSize', Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-yellow-700 mt-1">
                      Ahora puedes usar fuentes hasta 30px
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Fuente</label>
                    <select
                      value={config.fontFamily}
                      onChange={(e) => {
                        updateConfig('fontFamily', e.target.value);
                        checkFontStatus();
                      }}
                      className="w-full p-2 border rounded"
                    >
                      <option value="AR-Monserrat-Arabic">AR Montserrat Arabic</option>
                      <option value="Arial">Arial</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Arial Black">Arial Black</option>
                      <option value="Impact">Impact</option>
                      {customFontName && (
                        <option value={customFontName}>{customFontName} (Personalizada)</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.useImage}
                        onChange={(e) => updateConfig('useImage', e.target.checked)}
                        className="mr-2"
                      />
                      Usar imagen en lugar de fuente
                    </label>
                    {config.useImage && (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          value={config.imagePath}
                          onChange={(e) => updateConfig('imagePath', e.target.value)}
                          placeholder="Ruta de la imagen (ej: /images/AR.png)"
                          className="w-full p-2 border rounded text-sm"
                        />
                        <button
                          onClick={() => imageInputRef.current?.click()}
                          className="w-full text-sm bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Cargar imagen personalizada
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Código generado */}
              <div className="mt-6 col-span-full">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Código generado
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={copyCode}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        Copiar código
                      </button>
                      <button
                        onClick={() => {
                          const blob = new Blob([generatedCode], { type: 'text/javascript' });
                          saveAs(blob, 'qr-label-config.jsx');
                          toast.success('Código descargado como archivo JSX');
                        }}
                        className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1 px-3 py-1 rounded hover:bg-green-50 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Descargar JSX
                      </button>
                    </div>
                  </div>
                  <pre className="text-xs bg-white p-4 rounded border overflow-x-auto max-h-64 font-mono">
                    {generatedCode}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Footer con acciones - Siempre visible */}
          <div className={`border-t ${isMinimized ? 'p-3' : 'p-6'} bg-gray-50`}>
            {!isMinimized ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <button
                    onClick={saveConfig}
                    className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Guardar Config
                  </button>
                  <button
                    onClick={downloadTestLabel}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Test PNG
                  </button>
                  <button
                    onClick={generateARImage}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Generar AR
                  </button>
                  <button
                    onClick={applyToComponents}
                    className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aplicar Todo
                  </button>
                  <button
                    onClick={() => {
                      const defaultConfig = {
                        qrTop: 3,
                        arBottom: 9,
                        arSize: 19,
                        arGap: 3,
                        checkHeight: 10,
                        checkOverlap: -0.5,
                        fontFamily: 'AR-Monserrat-Arabic',
                        fontSize: 16,
                        useImage: false,
                        imagePath: '/src/assets/images/AR-Monserrat-arabic.png',
                        labelScale: 1
                      };
                      setConfig(defaultConfig);
                      setHasUnsavedChanges(true);
                      toast.info('Configuración restaurada a valores por defecto');
                    }}
                    className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Restaurar
                  </button>
                </div>
                {componentStatus.qrGenerator && componentStatus.qrModal && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Los cambios están activos en QRGenerator y QRModal
                      <button
                        onClick={resetApplication}
                        className="ml-auto text-xs text-red-600 hover:text-red-800"
                      >
                        Desactivar
                      </button>
                    </p>
                  </div>
                )}
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-700">
                    <strong>Tip:</strong> Los rangos ampliados permiten crear etiquetas más visibles. 
                    Prueba diferentes combinaciones de tamaños para encontrar el balance perfecto.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {hasUnsavedChanges && (
                    <button
                      onClick={saveConfig}
                      className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 text-sm"
                    >
                      <Save className="w-3 h-3" />
                      Guardar
                    </button>
                  )}
                  <span className="text-sm text-gray-600">
                    QR Tool {hasUnsavedChanges ? '(cambios sin guardar)' : '(actualizado)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {componentStatus.qrGenerator && componentStatus.qrModal && (
                    <span className="w-2 h-2 bg-green-500 rounded-full" title="Cambios aplicados"></span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}