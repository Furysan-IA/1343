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
  const [outputResolution, setOutputResolution] = useState<'baja' | 'media' | 'alta' | 'ultra'>('media');
  const [isDownloading, setIsDownloading] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);
  const qrModConfig = getQRModConfig();

  const resolutionPresets = {
    baja: {
      label: 'Baja',
      pixelRatio: 4,
      description: 'Web y pantalla',
      pixels: '~376x452 px',
      icon: 'S',
    },
    media: {
      label: 'Media',
      pixelRatio: 8,
      description: 'Impresion estandar',
      pixels: '~752x904 px',
      icon: 'M',
    },
    alta: {
      label: 'Alta',
      pixelRatio: 16,
      description: 'Impresion profesional',
      pixels: '~1504x1808 px',
      icon: 'L',
    },
    ultra: {
      label: 'Ultra',
      pixelRatio: 24,
      description: 'Maxima calidad',
      pixels: '~2256x2712 px',
      icon: 'XL',
    },
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

  const renderHighResImage = async (): Promise<string> => {
    if (!labelRef.current) throw new Error('Label ref not available');
    const selectedPreset = resolutionPresets[outputResolution];
    const targetWidth = qrModConfig.labelWidth * selectedPreset.pixelRatio;
    const targetHeight = qrModConfig.labelHeight * selectedPreset.pixelRatio;

    const safePixelRatio = Math.min(selectedPreset.pixelRatio, 4);

    const baseDataUrl = await toPng(labelRef.current, {
      width: qrModConfig.labelWidth,
      height: qrModConfig.labelHeight,
      pixelRatio: safePixelRatio,
      quality: 1,
      backgroundColor: '#ffffff',
      canvasWidth: qrModConfig.labelWidth * safePixelRatio,
      canvasHeight: qrModConfig.labelHeight * safePixelRatio,
      skipAutoScale: true,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left'
      }
    });

    if (selectedPreset.pixelRatio <= 4) return baseDataUrl;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load base image'));
      img.src = baseDataUrl;
    });
  };

  const handleDownloadPNG = async () => {
    if (!labelRef.current || isDownloading) return;
    setIsDownloading(true);
    const selectedPreset = resolutionPresets[outputResolution];

    try {
      const dataUrl = await renderHighResImage();
      saveAs(dataUrl, `qr-${productName.toLowerCase().replace(/\s+/g, '-')}-${outputResolution}.png`);
      toast.success(`Etiqueta PNG (${selectedPreset.label}) descargada exitosamente`);
    } catch (error) {
      console.error('Error downloading PNG:', error);
      toast.error('Error al descargar la etiqueta PNG');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!labelRef.current || isDownloading) return;
    setIsDownloading(true);
    const selectedPreset = resolutionPresets[outputResolution];

    try {
      const dataUrl = await renderHighResImage();

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [qrModConfig.labelWidth * 0.264583, qrModConfig.labelHeight * 0.264583]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, qrModConfig.labelWidth * 0.264583, qrModConfig.labelHeight * 0.264583);
      pdf.save(`qr-${productName.toLowerCase().replace(/\s+/g, '-')}-${outputResolution}.pdf`);
      toast.success(`Etiqueta PDF (${selectedPreset.label}) descargada exitosamente`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Error al descargar la etiqueta PDF');
    } finally {
      setIsDownloading(false);
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
                          width: `${qrModConfig.labelWidth}px`,
                          height: `${qrModConfig.labelHeight}px`,
                          backgroundColor: '#ffffff',
                          border: `${qrModConfig.labelBorderWidth}px solid #000000`,
                          borderRadius: `${qrModConfig.labelBorderRadius}px`,
                          position: 'relative',
                          overflow: 'hidden',
                          boxSizing: 'border-box',
                          padding: `${qrModConfig.labelPaddingTop}px ${qrModConfig.labelPaddingRight}px ${qrModConfig.labelPaddingBottom}px ${qrModConfig.labelPaddingLeft}px`
                        }}
                      >
                        {/* Código QR - 20mm × 20mm */}
                        <div
                          style={{
                            position: 'absolute',
                            top: `${qrModConfig.qrTop}px`,
                            left: qrModConfig.qrCenterHorizontally ? '50%' : `${qrModConfig.qrLeft}px`,
                            transform: qrModConfig.qrCenterHorizontally ? 'translateX(-50%)' : 'none',
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

                      {/* Quality Selection */}
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Calidad de imagen</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {(Object.entries(resolutionPresets) as [string, typeof resolutionPresets.baja][]).map(([key, preset]) => {
                            const isSelected = outputResolution === key;
                            return (
                              <button
                                key={key}
                                onClick={() => setOutputResolution(key as any)}
                                className={`relative p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-50 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                                  isSelected ? 'text-blue-600' : 'text-gray-400'
                                }`}>
                                  {preset.icon}
                                </div>
                                <div className={`text-sm font-semibold ${
                                  isSelected ? 'text-blue-900' : 'text-gray-700'
                                }`}>
                                  {preset.label}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {preset.description}
                                </div>
                                <div className={`text-xs mt-1 font-mono ${
                                  isSelected ? 'text-blue-600' : 'text-gray-400'
                                }`}>
                                  {preset.pixels}
                                </div>
                                {isSelected && (
                                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Download Buttons */}
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          onClick={handleDownloadPNG}
                          disabled={isDownloading}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {isDownloading ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          PNG
                        </button>
                        <button
                          onClick={handleDownloadPDF}
                          disabled={isDownloading}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-500 disabled:cursor-wait text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {isDownloading ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          PDF
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