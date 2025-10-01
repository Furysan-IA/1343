import React, { useState } from 'react';
import { UniversalUploadScreen } from './UniversalUploadScreen';
import { UniversalReviewScreen } from './UniversalReviewScreen';
import { ParsedData, EntityType } from '../../services/universalDataValidation.service';
import { CircleCheck as CheckCircle } from 'lucide-react';

type Step = 'upload' | 'review' | 'complete';

export const UniversalValidationPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [batchId, setBatchId] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [entityType, setEntityType] = useState<EntityType>('client');

  const handleUploadComplete = (id: string, data: ParsedData, type: EntityType) => {
    console.log('Upload complete:', { id, recordCount: data.rows.length, type });
    setBatchId(id);
    setParsedData(data);
    setEntityType(type);
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
          entityType={entityType}
          onComplete={handleReviewComplete}
        />
      )}

      {currentStep === 'complete' && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8">
          <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-lg">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-3">
              {entityType === 'client' ? 'Clientes Procesados' : 'Productos Procesados'}
            </h1>
            <p className="text-slate-600 mb-2">
              Los datos han sido procesados exitosamente
            </p>
            <p className="text-sm text-slate-500 mb-8">
              La información se ha actualizado en la base de datos
            </p>
            <button
              onClick={handleRestart}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Procesar Más Datos
            </button>
          </div>
        </div>
      )}
    </>
  );
};
