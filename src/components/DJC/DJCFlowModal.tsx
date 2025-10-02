import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Eye, Download, Check, Loader as Loader2, CircleAlert as AlertCircle } from 'lucide-react';
import { djcManagementService, type DJCGenerationData } from '../../services/djcManagement.service';
import { formatCuit } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface DJCFlowModalProps {
  product: any;
  onClose: () => void;
  onSuccess: () => void;
}

const RESOLUTIONS = [
  'Res. SIYC N° 236/24',
  'Res. SIYC N° 17/2025',
  'Res. SIYC N° 16/2025',
  'Resolución 92/98',
  'Resolución 220/95',
  'Resolución 243/96',
  'Resolución 276/99',
  'Resolución 555/03',
  'Resolución 574/08',
  'Resolución 2555/14'
];

type Step = 'source' | 'representative' | 'resolution' | 'link' | 'preview' | 'generating';

export const DJCFlowModal: React.FC<DJCFlowModalProps> = ({ product, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState<Step>('source');
  const [sourceType, setSourceType] = useState<'client' | 'product'>('product');
  const [client, setClient] = useState<any>(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const [representante, setRepresentante] = useState({
    nombre: '',
    domicilio: '',
    cuit: ''
  });
  const [selectedResolution, setSelectedResolution] = useState('');
  const [customLink, setCustomLink] = useState('');
  const [useCustomLink, setUseCustomLink] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (sourceType === 'client' && !client && !loadingClient) {
      loadClient();
    }
  }, [sourceType]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  const loadClient = async () => {
    setLoadingClient(true);
    try {
      const clientData = await djcManagementService.getClientByCuit(product.cuit);
      setClient(clientData);
      if (!clientData) {
        toast.error('No se encontró cliente asociado. Cambiando a certificados del producto.');
        setSourceType('product');
      }
    } catch (error: any) {
      console.error('Error loading client:', error);
      toast.error('Error al cargar cliente');
      setSourceType('product');
    } finally {
      setLoadingClient(false);
    }
  };

  const canProceedFromRepresentative = () => {
    return true;
  };

  const canProceedFromResolution = () => {
    return selectedResolution !== '';
  };

  const handleNext = () => {
    if (currentStep === 'source') {
      setCurrentStep('representative');
    } else if (currentStep === 'representative' && canProceedFromRepresentative()) {
      setCurrentStep('resolution');
    } else if (currentStep === 'resolution' && canProceedFromResolution()) {
      setCurrentStep('link');
    } else if (currentStep === 'link') {
      generatePreview();
    }
  };

  const handleBack = () => {
    if (currentStep === 'representative') {
      setCurrentStep('source');
    } else if (currentStep === 'resolution') {
      setCurrentStep('representative');
    } else if (currentStep === 'link') {
      setCurrentStep('resolution');
    } else if (currentStep === 'preview') {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setCurrentStep('link');
    }
  };

  const generatePreview = () => {
    try {
      const data: DJCGenerationData = {
        product,
        client: sourceType === 'client' ? client : undefined,
        resolucion: selectedResolution,
        representante: representante.nombre ? representante : undefined,
        customLink: useCustomLink ? customLink : undefined,
        sourceType
      };

      const pdfBlob = djcManagementService.generatePreviewPDF(data);
      const url = URL.createObjectURL(pdfBlob);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(url);
      setCurrentStep('preview');
    } catch (error: any) {
      console.error('Error generating preview:', error);
      toast.error('Error al generar vista previa');
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setCurrentStep('generating');

    try {
      const data: DJCGenerationData = {
        product,
        client: sourceType === 'client' ? client : undefined,
        resolucion: selectedResolution,
        representante: representante.nombre ? representante : undefined,
        customLink: useCustomLink ? customLink : undefined,
        sourceType
      };

      const result = await djcManagementService.generateAndSaveDJC(data);

      if (result.success) {
        toast.success('DJC generada exitosamente');
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Error al generar DJC');
        setCurrentStep('preview');
      }
    } catch (error: any) {
      console.error('Error generating DJC:', error);
      toast.error('Error al generar DJC');
      setCurrentStep('preview');
    } finally {
      setGenerating(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'source', label: 'Fuente' },
      { key: 'representative', label: 'Representante' },
      { key: 'resolution', label: 'Resolución' },
      { key: 'link', label: 'Enlace' },
      { key: 'preview', label: 'Vista Previa' }
    ];

    const currentIndex = steps.findIndex(s => s.key === currentStep);

    return (
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  index < currentIndex
                    ? 'bg-green-500 text-white'
                    : index === currentIndex
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {index < currentIndex ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="text-xs mt-1 text-gray-600">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderSourceStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Fuente de Certificados</h3>

      <div className="space-y-3">
        <button
          onClick={() => setSourceType('product')}
          className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
            sourceType === 'product'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="font-medium text-gray-900">Certificados del Producto</div>
          <div className="text-sm text-gray-600 mt-1">
            Usar certificados asociados directamente al producto
          </div>
        </button>

        <button
          onClick={() => setSourceType('client')}
          className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
            sourceType === 'client'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="font-medium text-gray-900">Certificados del Cliente</div>
          <div className="text-sm text-gray-600 mt-1">
            Usar certificados del cliente asociado al producto
          </div>
        </button>
      </div>

      {sourceType === 'client' && loadingClient && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Cargando datos del cliente...</span>
        </div>
      )}

      {sourceType === 'client' && !loadingClient && client && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">Cliente Encontrado:</h4>
          <p className="text-green-800">{client.razon_social}</p>
          <p className="text-sm text-green-700">CUIT: {formatCuit(String(client.cuit))}</p>
        </div>
      )}
    </div>
  );

  const renderRepresentativeStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos del Representante Autorizado</h3>
      <p className="text-sm text-gray-600 mb-4">
        Complete los datos del representante autorizado. Estos campos son opcionales.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre Completo
        </label>
        <input
          type="text"
          value={representante.nombre}
          onChange={(e) => setRepresentante({ ...representante, nombre: e.target.value })}
          className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="Nombre del representante"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Domicilio
        </label>
        <input
          type="text"
          value={representante.domicilio}
          onChange={(e) => setRepresentante({ ...representante, domicilio: e.target.value })}
          className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="Domicilio del representante"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          CUIT
        </label>
        <input
          type="text"
          value={representante.cuit}
          onChange={(e) => setRepresentante({ ...representante, cuit: e.target.value })}
          className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="XX-XXXXXXXX-X"
        />
      </div>
    </div>
  );

  const renderResolutionStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Resolución Aplicable</h3>

      <div className="space-y-2">
        {RESOLUTIONS.map((resolution) => (
          <button
            key={resolution}
            onClick={() => setSelectedResolution(resolution)}
            className={`w-full p-3 border-2 rounded-lg text-left transition-colors ${
              selectedResolution === resolution
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-gray-900">{resolution}</div>
          </button>
        ))}
      </div>

      {!selectedResolution && (
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">Debe seleccionar una resolución para continuar</span>
        </div>
      )}
    </div>
  );

  const renderLinkStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Enlace Personalizado (Opcional)</h3>

      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="useCustomLink"
            checked={useCustomLink}
            onChange={(e) => setUseCustomLink(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="useCustomLink" className="ml-2 text-sm text-gray-700">
            El cliente tiene su propio enlace
          </label>
        </div>

        {useCustomLink && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enlace Personalizado
            </label>
            <input
              type="url"
              value={customLink}
              onChange={(e) => setCustomLink(e.target.value)}
              className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://ejemplo.com/producto"
            />
            <p className="text-xs text-gray-500 mt-1">
              Si el cliente proporciona su propio enlace, ingréselo aquí
            </p>
          </div>
        )}

        {!useCustomLink && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Enlace Generado Automáticamente:</h4>
            <p className="text-sm text-blue-800 font-mono break-all">
              {window.location.origin}/qr/{product.codificacion}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa del DJC</h3>

      {previewUrl && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <iframe
            src={previewUrl}
            className="w-full h-[500px]"
            title="Vista Previa DJC"
          />
        </div>
      )}
    </div>
  );

  const renderGeneratingStep = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Generando DJC...</h3>
      <p className="text-sm text-gray-600">Por favor espere mientras se genera el documento</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Generar Declaración Jurada de Conformidad</h2>
            <p className="text-sm text-gray-600 mt-1">Producto: {product.codificacion}</p>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {currentStep !== 'generating' && renderStepIndicator()}

          {currentStep === 'source' && renderSourceStep()}
          {currentStep === 'representative' && renderRepresentativeStep()}
          {currentStep === 'resolution' && renderResolutionStep()}
          {currentStep === 'link' && renderLinkStep()}
          {currentStep === 'preview' && renderPreviewStep()}
          {currentStep === 'generating' && renderGeneratingStep()}
        </div>

        {currentStep !== 'generating' && (
          <div className="p-6 border-t flex gap-4">
            {currentStep !== 'source' && currentStep !== 'preview' && (
              <button
                onClick={handleBack}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="h-5 w-5" />
                Atrás
              </button>
            )}

            {currentStep === 'preview' && (
              <button
                onClick={handleBack}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Editar
              </button>
            )}

            <div className="flex-1" />

            {currentStep !== 'preview' ? (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 'resolution' && !canProceedFromResolution()) ||
                  (currentStep === 'source' && sourceType === 'client' && loadingClient)
                }
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                Siguiente
                <ChevronRight className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="h-5 w-5" />
                Confirmar y Generar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
