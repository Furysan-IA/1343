import React, { useState } from 'react';
import { UnifiedUploadScreen } from './UnifiedUploadScreen';
import { UnifiedReviewScreen } from './UnifiedReviewScreen';
import { UnifiedRecord } from '../../services/unifiedDataLoad.service';
import { CircleCheck as CheckCircle } from 'lucide-react';

type Step = 'upload' | 'review' | 'complete';

export const UniversalValidationPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [batchId, setBatchId] = useState<string>('');
  const [records, setRecords] = useState<UnifiedRecord[]>([]);

  const handleDataParsed = (parsedRecords: UnifiedRecord[], id: string) => {
    console.log('Data parsed:', { id, recordCount: parsedRecords.length });
    setRecords(parsedRecords);
    setBatchId(id);
    setCurrentStep('review');
  };

  const handleReviewComplete = () => {
    console.log('Review complete');
    setCurrentStep('complete');
  };

  const handleRestart = () => {
    console.log('Restarting validation flow');
    setBatchId('');
    setRecords([]);
    setCurrentStep('upload');
  };

  return (
    <>
      {currentStep === 'upload' && (
        <UnifiedUploadScreen onDataParsed={handleDataParsed} />
      )}

      {currentStep === 'review' && records.length > 0 && (
        <UnifiedReviewScreen
          records={records}
          batchId={batchId}
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
              Datos Procesados Exitosamente
            </h1>
            <p className="text-slate-600 mb-2">
              Clientes y productos han sido actualizados
            </p>
            <p className="text-sm text-slate-500 mb-8">
              La información se ha sincronizado en la base de datos
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
