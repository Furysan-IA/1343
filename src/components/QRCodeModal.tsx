import React, { useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Download, X, Link as LinkIcon } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import { toPng, toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { getQRModConfig, cmykToRgb } from '../utils/qrModConfig';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrLink: string;
  productName: string;
}

export function QRCodeModal({ isOpen, onClose, qrLink, productName }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputResolution, setOutputResolution] = useState<'web' | 'standard' | 'high' | 'ultra'>('standard');
  const labelRef = useRef<HTMLDivElement>(null);
  const qrModConfig = getQRModConfig();

  // Resolution presets
  const resolutionPresets = {
    web: { 
      label: 'Web/Pantalla (Baja)', 
      pixelRatio: 4, 
      description: 'Ideal para visualización en pantalla',
      fileSize: 'Pequeño (~50KB)'
    },
    standard: { 
      label: 'Impresión Estándar (Media)', 
      pixelRatio: 8, 
      description: 'Recomendado para impresión normal',
      fileSize: 'Medio (~200KB)'
    },
    high: { 
      label: 'Alta Calidad (Alta)', 
      pixelRatio: 16, 
      description: 'Para impresión profesional',
      fileSize: 'Grande (~800KB)'
    },
    ultra: { 
      label: 'Ultra HD (Máxima)', 
      pixelRatio: 24, 
      description: 'Máxima calidad para impresión industrial',
      fileSize: 'Muy grande (~1.8MB)'
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateQRCode();
    }
  }, [isOpen, qrLink]);

  const generateQRCode = async () => {
    setIsGenerating(true);
    try {
      const dataUrl = await QRCode.toDataURL(qrLink, {
        type: 'image/png',
        width: 1000,
        margin: 0,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Error al generar el código QR');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPNG = async () => {
    if (!labelRef.current) return;

    const selectedPreset = resolutionPresets[outputResolution];

    try {
      const dataUrl = await toPng(labelRef.current, {
        width: 94,
        height: 113,
        pixelRatio: selectedPreset.pixelRatio,
        quality: 1,
        backgroundColor: '#ffffff',
        canvasWidth: 94 * selectedPreset.pixelRatio,
        canvasHeight: 113 * selectedPreset.pixelRatio,
        skipAutoScale: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      saveAs(dataUrl, `qr-${productName.toLowerCase().replace(/\s+/g, '-')}-${outputResolution}.png`);
      toast.success(`Etiqueta PNG (${selectedPreset.label}) descargada exitosamente`);
    } catch (error) {
      console.error('Error downloading PNG:', error);
      toast.error('Error al descargar la etiqueta PNG');
    }
  };

  const handleDownloadPDF = async () => {
    if (!labelRef.current) return;

    const selectedPreset = resolutionPresets[outputResolution];

    try {
      const blob = await toBlob(labelRef.current, {
        width: 94,
        height: 113, 
        pixelRatio: selectedPreset.pixelRatio,
        quality: 1,
        backgroundColor: '#ffffff',
        canvasWidth: 94 * selectedPreset.pixelRatio,
        canvasHeight: 113 * selectedPreset.pixelRatio,
        skipAutoScale: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });

      if (!blob) throw new Error('Error generating image');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [25, 30]
      });

      const imgData = URL.createObjectURL(blob);
      pdf.addImage(imgData, 'PNG', 0, 0, 25, 30);
      pdf.save(`qr-${productName.toLowerCase().replace(/\s+/g, '-')}-${outputResolution}.pdf`);
      
      URL.revokeObjectURL(imgData);
      toast.success(`Etiqueta PDF (${selectedPreset.label}) descargada exitosamente`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Error al descargar la etiqueta PDF');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrLink);
      toast.success('URL copiada al portapapeles');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Error al copiar la URL');
    }
  };

  // Convert CMYK to RGB for checkmarks
  // Obtener color actual basado en configuración
  const getCurrentColor = () => {
    if (qrModConfig.useCMYK) {
      return cmykToRgb(qrModConfig.cmyk.c, qrModConfig.cmyk.m, qrModConfig.cmyk.y, qrModConfig.cmyk.k);
    }
    return qrModConfig.checkColor;
  };

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title className="text-lg font-medium text-gray-900">
                    Código QR del Producto
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex flex-col items-center">
                  {isGenerating ? (
                    <div className="w-64 h-64 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                  ) : qrDataUrl && (
                    <>
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
                        {/* Código QR - 20mm × 20mm */}
                        <div
                          style={{
                            position: 'absolute',
                            top: `${qrModConfig.qrTop}px`,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: `${qrModConfig.qrSize}px`,
                            height: `${qrModConfig.qrSize}px`
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
                            bottom: `${qrModConfig.arBottom}px`,
                            left: '50%',
                            transform: `translateX(-50%) translateX(${qrModConfig.arOffsetX}px) translateY(${qrModConfig.arOffsetY}px)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: `${qrModConfig.arGap}px`
                          }}
                        >
                          {/* Logo AR con fuente personalizada o imagen */}
                          {qrModConfig.useImage ? (
                            <img
                              src={qrModConfig.imagePath}
                              alt="AR"
                              style={{
                                height: `${qrModConfig.arSize}px`,
                                width: 'auto',
                                display: 'block'
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                fontFamily: `"${qrModConfig.fontFamily}", Arial, sans-serif`,
                                fontSize: `${qrModConfig.fontSize}px`,
                                fontWeight: qrModConfig.fontWeight,
                                letterSpacing: `${qrModConfig.letterSpacing}px`,
                                textTransform: qrModConfig.textTransform as any,
                                color: '#000000',
                                height: `${qrModConfig.arSize}px`,
                                display: 'flex',
                                alignItems: 'center',
                                lineHeight: 1
                              }}
                            >
                              {qrModConfig.arText}
                            </span>
                          )}
                          
                          {/* Tildes */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: `${qrModConfig.checkSpacingVertical}px`,
                              height: `${qrModConfig.arSize}px`,
                              transform: `translateX(${qrModConfig.tildeOffsetX}px) translateY(${qrModConfig.tildeOffsetY}px)`
                            }}
                          >
                            {Array.from({ length: qrModConfig.symbolCount }, (_, i) => {
                              const angle = i === 0 ? qrModConfig.symbol1Angle : qrModConfig.symbol2Angle;
                              const size = qrModConfig.symbolSize / 100;
                              const offsetX = qrModConfig.useIndividualControl ? (i === 0 ? qrModConfig.symbol1X : qrModConfig.symbol2X) : 0;
                              const offsetY = qrModConfig.useIndividualControl ? (i === 0 ? qrModConfig.symbol1Y : qrModConfig.symbol2Y) : 0;
                              
                              return (
                                <div
                                  key={i}
                                  style={{
                                    transform: `rotate(${angle}deg) scale(${size}) translate(${offsetX}px, ${offsetY}px)`,
                                    transformOrigin: 'center'
                                  }}
                                >
                                  <svg
                                    width={qrModConfig.checkWidth}
                                    height={qrModConfig.checkHeight}
                                    viewBox={`0 0 ${qrModConfig.checkWidth} ${qrModConfig.checkHeight}`}
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    style={{ display: 'block' }}
                                  >
                                    <path
                                      d="M3 5L6.5 8.5L16 1.5"
                                      stroke={getCurrentColor()}
                                      strokeWidth={qrModConfig.checkStrokeWidth}
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

                      <div className="mt-4 w-full">
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <LinkIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <input
                            type="text"
                            readOnly
                            value={qrLink}
                            className="text-sm text-gray-600 bg-transparent flex-1 outline-none"
                            onClick={(e) => e.currentTarget.select()}
                          />
                          <button
                            onClick={copyToClipboard}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>

                      {/* Resolution Selection */}
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Calidad de Exportación</h4>
                        <div className="space-y-2">
                          {Object.entries(resolutionPresets).map(([key, preset]) => (
                            <label
                              key={key}
                              className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-white transition-colors"
                            >
                              <input
                                type="radio"
                                name="resolution"
                                value={key}
                                checked={outputResolution === key}
                                onChange={(e) => setOutputResolution(e.target.value as any)}
                                className="mt-1 w-4 h-4 text-purple-600"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900">
                                    {preset.label}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {preset.fileSize}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {preset.description}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                        
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-xs text-blue-700">
                            <strong>Recomendación:</strong> Use "Impresión Estándar" para la mayoría de casos. 
                            Para QR codes muy pequeños (menos de 15mm) o con problemas de escaneo, use "Alta Calidad".
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-center gap-3">
                        <button
                          onClick={handleDownloadPNG}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Descargar PNG
                        </button>
                        <button
                          onClick={handleDownloadPDF}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Descargar PDF
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}