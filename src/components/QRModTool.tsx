// QRModTool.tsx - Herramienta mejorada con cargador de fuentes e imágenes
import React, { useState, useRef, useEffect } from 'react';
import { Wrench, X, Save, Download, Eye, Copy, CheckCircle, AlertCircle, Upload, FileText, RefreshCw } from 'lucide-react';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
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
}

interface ComponentStatus {
  qrGenerator: boolean;
  qrModal: boolean;
  lastChecked: Date | null;
}

export function QRModTool() {
  const [isOpen, setIsOpen] = useState(false);
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
    imagePath: '/src/assets/images/AR-Monserrat-arabic.png'
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
  const labelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkFontStatus();
    checkComponentsStatus();
    // Cargar configuración guardada
    const savedConfig = localStorage.getItem('qr-mod-config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
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
    
    // Simular verificación de componentes (en realidad necesitarías una forma de verificar si los componentes están usando la config)
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
      // Verificar tipo de archivo
      if (!file.name.match(/\.(otf|ttf|woff|woff2)$/i)) {
        toast.error('Por favor sube un archivo de fuente válido (.otf, .ttf, .woff, .woff2)');
        return;
      }

      // Crear URL del archivo
      const fontUrl = URL.createObjectURL(file);
      const fontName = file.name.replace(/\.[^/.]+$/, ""); // Quitar extensión

      // Crear @font-face dinámicamente
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

      // Cargar la fuente
      await document.fonts.load(`700 16px "${fontName}"`);

      // Actualizar configuración
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
      // Verificar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor sube una imagen válida');
        return;
      }

      // Crear URL del archivo
      const imageUrl = URL.createObjectURL(file);
      
      // Actualizar configuración
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
  };

  const saveConfig = () => {
    localStorage.setItem('qr-mod-config', JSON.stringify(config));
    toast.success('Configuración guardada');
  };

  const applyToComponents = () => {
    // Guardar en localStorage para que los componentes lo lean
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

  const downloadTestLabel = async () => {
    if (!labelRef.current) return;

    try {
      // Esperar a que las fuentes se carguen
      await document.fonts.ready;
      
      const dataUrl = await toPng(labelRef.current, {
        width: 94,
        height: 113,
        pixelRatio: 8,
        quality: 1,
        backgroundColor: '#ffffff',
        includeQueryParams: true,
        cacheBust: true
      });
      
      saveAs(dataUrl, 'qr-test-label.png');
      toast.success('Etiqueta de prueba descargada');
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
        imageRendering: 'pixelated'
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
        <div className="fixed inset-4 md:inset-auto md:bottom-20 md:left-4 md:w-[600px] md:max-h-[90vh] bg-white rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-purple-600 text-white">
            <h3 className="font-semibold flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Modificador de QR - Herramienta de Desarrollo
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-purple-700 p-1 rounded"
            >
              <X className="w-5 h-5" />
            </button>
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vista previa */}
              <div>
                <h4 className="font-medium mb-2">Vista Previa</h4>
                <div className="flex justify-center p-4 bg-gray-50 rounded">
                  <div className="transform scale-150">
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
                      {/* QR simulado */}
                      <div
                        style={{
                          position: 'absolute',
                          top: `${config.qrTop}px`,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '75px',
                          height: '75px',
                          background: 'repeating-linear-gradient(45deg, #000, #000 2px, #fff 2px, #fff 4px)'
                        }}
                      />
                      
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
                                // Si la imagen falla, mostrar placeholder
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
              <div className="space-y-3">
                <h4 className="font-medium mb-2">Controles de Ajuste</h4>
                
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

                <div>
                  <label className="text-sm font-medium">Tamaño AR: {config.arSize}px</label>
                  <input
                    type="range"
                    min="14"
                    max="26"
                    value={config.arSize}
                    onChange={(e) => updateConfig('arSize', Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Espacio AR-Tildes: {config.arGap}px</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={config.arGap}
                    onChange={(e) => updateConfig('arGap', Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Altura tildes: {config.checkHeight}px</label>
                  <input
                    type="range"
                    min="8"
                    max="14"
                    value={config.checkHeight}
                    onChange={(e) => updateConfig('checkHeight', Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Superposición tildes: {config.checkOverlap}px</label>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.5"
                    value={config.checkOverlap}
                    onChange={(e) => updateConfig('checkOverlap', Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Tamaño de fuente: {config.fontSize}px</label>
                  <input
                    type="range"
                    min="12"
                    max="20"
                    value={config.fontSize}
                    onChange={(e) => updateConfig('fontSize', Number(e.target.value))}
                    className="w-full"
                  />
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
                      {customImageUrl && (
                        <button
                          onClick={() => {
                            setCustomImageUrl('');
                            updateConfig('imagePath', '/src/assets/images/AR-Monserrat-arabic.png');
                          }}
                          className="w-full text-sm text-red-600 hover:text-red-800"
                        >
                          Limpiar imagen personalizada
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Código generado */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Código generado</h4>
                <button
                  onClick={copyCode}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </button>
              </div>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-48 border">
                {generatedCode}
              </pre>
            </div>
          </div>

          {/* Footer con acciones */}
          <div className="border-t p-4 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={saveConfig}
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 text-sm"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
              <button
                onClick={downloadTestLabel}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Test PNG
              </button>
              <button
                onClick={generateARImage}
                className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center gap-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                Generar AR
              </button>
              <button
                onClick={applyToComponents}
                className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center justify-center gap-2 text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Aplicar
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
          </div>
        </div>
      )}
    </>
  );
}