// QRModTool.tsx - Herramienta flotante para modificar configuración QR
import React, { useState, useRef, useEffect } from 'react';
import { Wrench, X, Save, Download, Eye, Copy, CheckCircle, AlertCircle } from 'lucide-react';
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
  const [generatedCode, setGeneratedCode] = useState('');
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkFontStatus();
    // Cargar configuración guardada
    const savedConfig = localStorage.getItem('qr-mod-config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  useEffect(() => {
    generateCode();
  }, [config]);

  const checkFontStatus = async () => {
    try {
      await document.fonts.ready;
      const fontLoaded = await document.fonts.load(`700 ${config.fontSize}px ${config.fontFamily}`);
      setFontStatus(fontLoaded.length > 0 ? 'loaded' : 'error');
    } catch {
      setFontStatus('error');
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
    toast.success('Configuración aplicada. Recarga la página para ver los cambios.');
  };

  const downloadTestLabel = async () => {
    if (!labelRef.current) return;

    try {
      const dataUrl = await toPng(labelRef.current, {
        width: 94,
        height: 113,
        pixelRatio: 8,
        quality: 1,
        backgroundColor: '#ffffff'
      });
      
      saveAs(dataUrl, 'qr-test-label.png');
      toast.success('Etiqueta de prueba descargada');
    } catch (error) {
      toast.error('Error al descargar');
    }
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
        className="fixed bottom-4 left-4 p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all z-50"
        title="Modificar QR"
      >
        <Wrench className="w-6 h-6" />
      </button>

      {/* Panel de herramientas */}
      {isOpen && (
        <div className="fixed bottom-20 left-4 w-96 max-h-[80vh] bg-white rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-purple-600 text-white">
            <h3 className="font-semibold flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Modificador de QR
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-purple-700 p-1 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Vista previa */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Vista Previa</h4>
              <div className="flex justify-center p-4 bg-gray-50 rounded">
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
            <div className="mb-4 p-3 bg-gray-50 rounded">
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

            {/* Controles */}
            <div className="space-y-3">
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
                <label className="text-sm font-medium">Fuente</label>
                <select
                  value={config.fontFamily}
                  onChange={(e) => updateConfig('fontFamily', e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="AR-Monserrat-Arabic">AR Montserrat Arabic</option>
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={config.useImage}
                    onChange={(e) => updateConfig('useImage', e.target.checked)}
                    className="mr-2"
                  />
                  Usar imagen en lugar de fuente
                </label>
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
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-40">
                {generatedCode}
              </pre>
            </div>
          </div>

          {/* Footer con acciones */}
          <div className="border-t p-4 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={saveConfig}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
              <button
                onClick={downloadTestLabel}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Test PNG
              </button>
            </div>
            <button
              onClick={applyToComponents}
              className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Aplicar a Componentes
            </button>
          </div>
        </div>
      )}
    </>
  );
}