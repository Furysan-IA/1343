import React, { useState } from 'react';
import { CertificateUploadScreen } from './CertificateUploadScreen';
import { CertificateReviewScreen } from './CertificateReviewScreen';
import { ConfirmationScreen } from './ConfirmationScreen';
import { CertificateSkipReport } from '../../components/CertificateSkipReport';
import { ParsedCertificates } from '../../services/certificateProcessing.service';
import { DualMatchResult } from '../../services/dualTableUpdate.service';

type Step = 'upload' | 'review' | 'confirm' | 'complete';

export const DataValidation: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [batchId, setBatchId] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedCertificates | null>(null);
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [analyses, setAnalyses] = useState<DualMatchResult[]>([]);
  const [showSkipReport, setShowSkipReport] = useState(false);

  const handleUploadComplete = (id: string, data: ParsedCertificates, refDate: Date) => {
    setBatchId(id);
    setParsedData(data);
    setReferenceDate(refDate);
    setCurrentStep('review');
  };

  const handleAnalysisComplete = (results: DualMatchResult[]) => {
    setAnalyses(results);
  };

  const handleReadyToConfirm = () => {
    setCurrentStep('confirm');
  };

  const handleCancelConfirmation = () => {
    setCurrentStep('review');
  };

  const handleProcessingComplete = () => {
    setCurrentStep('complete');
  };

  const handleViewSkippedReport = () => {
    setShowSkipReport(true);
  };

  const handleRestart = () => {
    setBatchId('');
    setParsedData(null);
    setCurrentStep('upload');
  };

  return (
    <>
      {currentStep === 'upload' && (
        <CertificateUploadScreen onUploadComplete={handleUploadComplete} />
      )}

      {currentStep === 'review' && parsedData && (
        <CertificateReviewScreen
          parsedData={parsedData}
          batchId={batchId}
          referenceDate={referenceDate}
          onReadyToConfirm={handleReadyToConfirm}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}

      {currentStep === 'confirm' && parsedData && (
        <ConfirmationScreen
          analyses={analyses}
          batchId={batchId}
          filename={parsedData.metadata.filename}
          onCancel={handleCancelConfirmation}
          onComplete={handleProcessingComplete}
          onViewSkippedReport={handleViewSkippedReport}
        />
      )}

      <CertificateSkipReport
        isOpen={showSkipReport}
        onClose={() => setShowSkipReport(false)}
        batchId={batchId}
        filename={parsedData?.metadata.filename || ''}
        totalInFile={(parsedData?.metadata.totalRecords || 0) + (parsedData?.metadata.totalRejected || 0)}
      />

      {currentStep === 'complete' && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8">
          <div className="bg-white rounded-xl shadow-lg p-12 text-center max-w-lg">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-3">
              Certificados Procesados
            </h1>
            <p className="text-slate-600 mb-2">
              Los certificados han sido procesados exitosamente
            </p>
            <p className="text-sm text-slate-500 mb-8">
              Los datos de clientes y productos se han actualizado en sus respectivas tablas
            </p>
            <button
              onClick={handleRestart}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Procesar Más Certificados
            </button>
          </div>
        </div>
      )}
    </>
  );
};
