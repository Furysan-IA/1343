import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, Database } from 'lucide-react';
import { parseUnifiedFile, UnifiedRecord } from '../../services/unifiedDataLoad.service';
import { createBatch } from '../../services/universalDataValidation.service';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../../components/Common/LoadingSpinner';

interface UnifiedUploadScreenProps {
  onDataParsed: (data: UnifiedRecord[], batchId: string) => void;
}

export const UnifiedUploadScreen: React.FC<UnifiedUploadScreenProps> = ({ onDataParsed }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      toast.error(`Formato inválido. Use: ${validExtensions.join(', ')}`);
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Archivo muy grande. Máximo 50MB');
      return;
    }

    setSelectedFile(file);
    toast.success('Archivo seleccionado');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo primero');
      return;
    }

    setIsUploading(true);

    try {
      console.log('Parsing unified file...');
      const records = await parseUnifiedFile(selectedFile);

      if (records.length === 0) {
        toast.error('El archivo no contiene registros válidos');
        setIsUploading(false);
        return;
      }

      console.log(`Parsed ${records.length} records. Creating batch...`);

      const batchId = await createBatch(
        {
          filename: selectedFile.name,
          fileSize: selectedFile.size,
          totalRecords: records.length
        },
        'product'
      );

      console.log(`Batch created: ${batchId}`);

      toast.success(`${records.length} registros parseados exitosamente`);
      onDataParsed(records, batchId);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'Error al procesar el archivo');
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Carga de Datos Unificada
              </h1>
              <p className="text-slate-600 text-sm">
                Carga clientes y productos desde un único archivo Excel
              </p>
            </div>
          </div>

          {/* Info Alert */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-400 mr-3" />
              <div>
                <p className="text-sm text-blue-700">
                  <strong>Sistema Automático:</strong> El archivo debe contener columnas de clientes
                  (CUIT, razón social, dirección, email) y productos (codificación, producto, marca, etc.).
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  <strong>Protección de Datos:</strong> Los productos existentes mantendrán sus QR,
                  certificados y configuraciones. Solo se actualizarán los datos del certificado.
                </p>
              </div>
            </div>
          </div>

          {/* Required Fields */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">
                ✅ Campos de Cliente (Requeridos)
              </h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• CUIT</li>
                <li>• Razón Social</li>
                <li>• Dirección</li>
                <li>• Email</li>
              </ul>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                ✅ Campos de Producto (Requeridos)
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Codificación</li>
                <li>• Producto</li>
                <li>• Fecha de Emisión</li>
                <li>• Vencimiento</li>
              </ul>
            </div>
          </div>

          {/* Upload Area */}
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center transition-colors
                ${isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
                }
              `}
            >
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-700 font-medium mb-2">
                Arrastra tu archivo aquí
              </p>
              <p className="text-slate-500 text-sm mb-4">
                o haz clic para seleccionar
              </p>
              <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                Seleccionar Archivo
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="text-slate-400 text-xs mt-4">
                Formatos: .xlsx, .xls, .csv | Máx 50MB
              </p>
            </div>
          ) : (
            <div className="border-2 border-green-300 bg-green-50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FileText className="w-10 h-10 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">{selectedFile.name}</p>
                    <p className="text-sm text-green-700">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    disabled={isUploading}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <LoadingSpinner />
                        Procesando...
                      </>
                    ) : (
                      'Subir y Procesar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-slate-800 mb-2">💡 Notas Importantes:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• El sistema detecta automáticamente clientes y productos en el mismo archivo</li>
              <li>• Los clientes se procesan primero, luego los productos</li>
              <li>• Clientes existentes se actualizan con la nueva información</li>
              <li>• Productos existentes actualizan solo datos del certificado (NO QR ni paths)</li>
              <li>• Nuevos clientes y productos se insertan automáticamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
