import { useState, useCallback } from 'react';
import { UploadOrchestrator } from '@/services/uploadOrchestrator.service';
import { UploadProgress, UploadResult, ValidatedData, MappingResult } from '@/types/upload.types';

export function useUploadOrchestrator(userId: string) {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [validatedData, setValidatedData] = useState<(ValidatedData & { mappingResult: MappingResult }) | null>(null);

  const validateFile = useCallback(async (file: File) => {
    setProgress(null);
    setResult(null);
    setValidatedData(null);

    const orchestrator = new UploadOrchestrator(userId, setProgress);

    try {
      const validated = await orchestrator.validateOnly(file);
      setValidatedData(validated);
      return validated;
    } catch (error) {
      console.error('Error en validación:', error);
      throw error;
    }
  }, [userId]);

  const processFile = useCallback(async (
    file: File,
    approvedChanges: {
      newClients: number[];
      updatedClients: number[];
      newProducts: string[];
      updatedProducts: string[];
    }
  ) => {
    setProgress(null);
    setResult(null);

    const orchestrator = new UploadOrchestrator(userId, setProgress);

    try {
      const uploadResult = await orchestrator.processUpload(file, approvedChanges);
      setResult(uploadResult);
      return uploadResult;
    } catch (error) {
      console.error('Error en procesamiento:', error);
      throw error;
    }
  }, [userId]);

  return {
    progress,
    result,
    validatedData,
    validateFile,
    processFile
  };
}
