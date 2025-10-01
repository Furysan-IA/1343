import React, { useState } from 'react';
import { UniversalUploadScreen } from './UniversalUploadScreen';
import { UniversalReviewScreen } from './UniversalReviewScreen';
import { ParsedData, DuplicateCheckResult, createBatch } from '../../services/universalDataValidation.service';
import { CircleCheck as CheckCircle, CircleAlert as AlertCircle, FileText, CircleCheck as Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

type Step = 'upload' | 'review' | 'complete';

export const UniversalValidationPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [batchId, setBatchId] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);

  // Estado para el modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [pendingUploadData, setPendingUploadData] = useState<{
    id: string;
    data: ParsedData;
    stats: DuplicateCheckResult['stats'];
    filename: string;
    fileSize: number;
  } | null>(null);

  const handleUploadReadyForConfirmation = (
    id: string,
    data: ParsedData,
    stats: DuplicateCheckResult['stats'],
    metadata: { filename: string; fileSize: number }
  ) => {
    console.log('🎯 Upload ready for confirmation:', { id, recordCount: data.rows.length, stats });
    setPendingUploadData({ id, data, stats, filename: metadata.filename, fileSize: metadata.fileSize });
    setShowConfirmModal(true);
  };

  const handleConfirmUpload = async () => {
    console.log('✅ User confirmed upload, creating batch and proceeding to review');
    if (!pendingUploadData) return;

    try {
      setIsCreatingBatch(true);

      // Crear el batch AHORA que el usuario confirmó
      console.log('📦 Creating batch...');
      const realBatchId = await createBatch({
        filename: pendingUploadData.filename,
        fileSize: pendingUploadData.fileSize,
        totalRecords: pendingUploadData.stats.activeRecords
      });

      console.log('✅ Batch created successfully:', realBatchId);

      // Guardar datos y navegar a la pantalla de revisión
      setBatchId(realBatchId);
      setParsedData(pendingUploadData.data);
      setShowConfirmModal(false);
      setPendingUploadData(null);
      setIsCreatingBatch(false);
      setCurrentStep('review');
    } catch (error: any) {
      console.error('❌ Error creating batch:', error);
      toast.error('Error al crear el batch: ' + error.message);
      setIsCreatingBatch(false);
      // No cerrar el modal, dar oportunidad de reintentar
    }
  };

  const handleCancelUpload = () => {
    console.log('❌ User cancelled upload');
    setShowConfirmModal(false);
    setPendingUploadData(null);
  };

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
        <UniversalUploadScreen
          onUploadComplete={handleUploadComplete}
          onReadyForConfirmation={handleUploadReadyForConfirmation}
        />
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

      {/* Modal de Confirmación - Renderizado en el nivel superior para evitar desmontaje */}
      {showConfirmModal && pendingUploadData && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            style={{ zIndex: 1000000 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                    <CheckCircle className="w-8 h-8" />
                    Análisis Completado
                  </h2>
                  <p className="text-green-50 text-sm">
                    El archivo ha sido procesado exitosamente
                  </p>
                </div>
                <button
                  onClick={handleCancelUpload}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Estadísticas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-slate-600" />
                    <p className="text-xs font-medium text-slate-600">Total Filas</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    {pendingUploadData.stats.totalInFile.toLocaleString()}
                  </p>
                </div>

                <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="w-5 h-5 text-red-600" />
                    <p className="text-xs font-medium text-red-600">Con "Baja"</p>
                  </div>
                  <p className="text-2xl font-bold text-red-800">
                    {pendingUploadData.stats.withBaja.toLocaleString()}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-5 h-5 text-blue-600" />
                    <p className="text-xs font-medium text-blue-600">Activos</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-800">
                    {pendingUploadData.stats.activeRecords.toLocaleString()}
                  </p>
                </div>

                <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-xs font-medium text-green-600">Nuevos</p>
                  </div>
                  <p className="text-2xl font-bold text-green-800">
                    {pendingUploadData.stats.newRecordsCount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Mensaje Informativo */}
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ Todos los certificados están listos para ser cargados en el sistema.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-6 flex gap-3 justify-end border-t border-slate-200">
              <button
                onClick={handleCancelUpload}
                disabled={isCreatingBatch}
                className="px-6 py-2.5 bg-white border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={isCreatingBatch}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreatingBatch ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creando...
                  </>
                ) : (
                  'Continuar'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
