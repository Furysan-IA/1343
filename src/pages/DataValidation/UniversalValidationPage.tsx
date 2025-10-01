import React, { useState } from 'react';
import { UniversalUploadScreen } from './UniversalUploadScreen';
import { UniversalReviewScreen } from './UniversalReviewScreen';
import { ParsedData } from '../../services/universalDataValidation.service';
import { CircleCheck as CheckCircle } from 'lucide-react';

type Step = 'upload' | 'review' | 'complete';

export const UniversalValidationPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [batchId, setBatchId] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);

  const handleUploadComplete = (id: string, data: ParsedData) => {
    console.log('Upload complete:', { id, recordCount: data.rows.length });
    setBatchId(id);
    setParsedData(data);
    setCurrentStep('review');
  };

  const handleReviewComplete = () => {
    console.log('Review complete');
    setCurrentStep('complete');
  };

  const handleRestart = () => {
    console.log('Restarting validation flow');
    setBatchId('');
    setParsedData(null);
    setCurrentStep('upload');
  };

  return (
    <>
      {currentStep === 'upload' && (
        <UniversalUploadScreen onUploadComplete={handleUploadComplete} />
      )}

      {currentStep === 'review' && parsedData && (
        <UniversalReviewScreen
          parsedData={parsedData}
          batchId={batchId}
          onComplete={handleReviewComplete}
        />
      )}

      {currentStep === 'complete' && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-12 text-center max-w-lg transform transition-all duration-500 scale-100">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-once">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-slate-800 mb-4">
              ✅ Datos Procesados!
            </h1>
            <p className="text-lg text-slate-600 mb-3 font-medium">
              La información se actualizó correctamente
            </p>
            <p className="text-sm text-slate-500 mb-8">
              Clientes y productos han sido sincronizados en la base de datos
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                Los cambios ya están disponibles en el sistema
              </p>
            </div>
            <button
              onClick={handleRestart}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Cargar Más Datos
            </button>
          </div>
        </div>
      )}
    </>
  );
};
