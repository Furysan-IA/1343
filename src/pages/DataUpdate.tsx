import React, { useState } from 'react';
import { Upload, RefreshCw, FileSpreadsheet, CheckCircle, AlertCircle, XCircle, Settings, History } from 'lucide-react';
import { ProductUpdateService, UpdateStats } from '../services/productUpdate.service';
import { DataMapper } from '../services/dataMapper.service';
import { parseFile } from '../services/universalDataValidation.service';
import { FieldSelector } from '../components/FieldSelector';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

type UpdateMode = 'fill_empty' | 'selective';

export default function DataUpdate() {
  const navigate = useNavigate();
  const [updateMode, setUpdateMode] = useState<UpdateMode>('fill_empty');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [updateResult, setUpdateResult] = useState<UpdateStats | null>(null);

  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [overwriteMode, setOverwriteMode] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.xlsx')) {
      setSelectedFile(file);
      setUpdateResult(null);
    } else {
      toast.error('Por favor selecciona un archivo Excel (.xlsx)');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUpdateResult(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedFile) return;

    if (updateMode === 'selective' && selectedFields.length === 0) {
      toast.error('Debes seleccionar al menos un campo para actualizar');
      return;
    }

    if (updateMode === 'selective' && overwriteMode) {
      setShowConfirmModal(true);
      return;
    }

    executeUpdate();
  };

  const executeUpdate = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);
    setProcessingStep('Leyendo archivo Excel...');
    setUpdateResult(null);

    try {
      console.log('🚀 Iniciando actualización de datos...');

      setProgress(20);
      const parsedData = await parseFile(selectedFile);
      console.log('✅ Archivo parseado:', parsedData.rows.length, 'filas');

      setProgress(40);
      setProcessingStep('Mapeando datos...');
      const mappingResult = DataMapper.mapData(parsedData.rows, parsedData.headers);
      console.log('✅ Datos mapeados:', mappingResult.products.length, 'productos');

      if (mappingResult.products.length === 0) {
        toast.error('No se encontraron productos en el archivo');
        setIsProcessing(false);
        return;
      }

      setProgress(60);
      setProcessingStep('Actualizando productos...');

      let stats: UpdateStats;

      if (updateMode === 'fill_empty') {
        stats = await ProductUpdateService.updateProductsFromExcel(
          mappingResult.products,
          (current, total) => {
            const percent = 60 + Math.round((current / total) * 40);
            setProgress(percent);
            setProcessingStep(`Actualizando ${current} de ${total} productos...`);
          }
        );
      } else {
        stats = await ProductUpdateService.updateProductsSelective(
          mappingResult.products,
          {
            allowedFields: selectedFields,
            overwriteMode: overwriteMode,
            sourceFile: selectedFile.name
          },
          (current, total) => {
            const percent = 60 + Math.round((current / total) * 40);
            setProgress(percent);
            setProcessingStep(`Actualizando ${current} de ${total} productos...`);
          }
        );
      }

      console.log('✅ Actualización completada:', stats);
      setUpdateResult(stats);
      setProgress(100);
      setProcessingStep('¡Actualización completada!');

      if (stats.updated > 0) {
        toast.success(`${stats.updated} productos actualizados exitosamente!`);
      } else {
        toast.info('No se encontraron productos para actualizar');
      }

      setIsProcessing(false);
      setSelectedFile(null);

    } catch (error) {
      console.error('❌ Error en actualización:', error);
      toast.error('Error al actualizar productos');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 text-center max-w-md">
            <RefreshCw className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Actualizando Productos</h2>
            <p className="text-slate-600 mb-2">{processingStep}</p>
            <div className="mt-4 w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-slate-700 font-medium mt-2">{progress}%</p>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executeUpdate}
        title="Confirmar Sobrescritura de Datos"
        message="Estás a punto de sobrescribir datos existentes. Esta acción modificará información que ya existe en la base de datos."
        confirmText="Sí, Sobrescribir"
        cancelText="Cancelar"
        type="warning"
        details={[
          `Se actualizarán ${selectedFields.length} campos en cada producto`,
          'Los valores antiguos serán reemplazados por los nuevos del Excel',
          'Se guardará un registro de auditoría completo de los cambios'
        ]}
      />

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-10 h-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-800">
              Actualización de Datos
            </h1>
          </div>
          <button
            onClick={() => navigate('/audit-history')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <History className="w-5 h-5" />
            Ver Historial
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Modo de Actualización
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => setUpdateMode('fill_empty')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  updateMode === 'fill_empty'
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-slate-800">Solo Completar Vacíos</h4>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    updateMode === 'fill_empty' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                  }`}>
                    {updateMode === 'fill_empty' && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  Actualiza únicamente los campos que están vacíos (NULL o vacío).
                  No sobrescribe datos existentes.
                </p>
              </button>

              <button
                onClick={() => setUpdateMode('selective')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  updateMode === 'selective'
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-slate-800">Actualización Personalizada</h4>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    updateMode === 'selective' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                  }`}>
                    {updateMode === 'selective' && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  Selecciona qué campos actualizar con opción de sobrescribir datos existentes.
                </p>
              </button>
            </div>
          </div>

          {updateMode === 'selective' && (
            <div className="space-y-6">
              <FieldSelector
                selectedFields={selectedFields}
                onChange={setSelectedFields}
              />

              <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteMode}
                    onChange={(e) => setOverwriteMode(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-slate-800">Sobrescribir datos existentes</span>
                    <p className="text-sm text-slate-600 mt-1">
                      Si está activado, los valores del Excel reemplazarán los datos existentes en los campos seleccionados.
                      Si está desactivado, solo se completarán campos vacíos.
                    </p>
                  </div>
                </label>

                {overwriteMode && (
                  <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
                    <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Los datos existentes serán sobrescritos. Se guardará un registro de auditoría completo.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {updateMode === 'fill_empty' && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Cómo funciona</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Busca cada producto por su codificación</li>
                <li>• Actualiza solo campos vacíos (NULL o vacío)</li>
                <li>• NO sobrescribe datos existentes</li>
                <li>• Procesa todos los campos automáticamente</li>
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-4 border-dashed rounded-xl p-12 text-center transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
              }`}
            >
              <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                Arrastra tu archivo Excel aquí
              </h3>
              <p className="text-slate-500 mb-4">o haz clic para seleccionar</p>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Seleccionar Archivo
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <FileSpreadsheet className="w-12 h-12 text-green-600" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 text-lg">{selectedFile.name}</h3>
                    <p className="text-sm text-slate-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setUpdateResult(null);
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpdate}
                  disabled={isProcessing}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} />
                  {isProcessing ? 'Actualizando...' : 'Actualizar Productos'}
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setUpdateResult(null);
                  }}
                  disabled={isProcessing}
                  className="px-6 py-4 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {updateResult && (
            <div className="mt-8 space-y-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <CheckCircle className="w-8 h-8" />
                  Actualización Completada
                </h2>
                <p className="text-green-50">Los productos han sido procesados correctamente</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-blue-600 font-medium mb-1">Total Procesados</p>
                  <p className="text-3xl font-bold text-blue-900">{updateResult.totalProcessed}</p>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-600 font-medium mb-1">Actualizados</p>
                  <p className="text-3xl font-bold text-green-900">{updateResult.updated}</p>
                </div>

                <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-slate-600 font-medium mb-1">Sin Cambios</p>
                  <p className="text-3xl font-bold text-slate-900">{updateResult.unchanged}</p>
                </div>

                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-orange-600 font-medium mb-1">No Encontrados</p>
                  <p className="text-3xl font-bold text-orange-900">{updateResult.notFound}</p>
                </div>
              </div>

              {updateResult.fieldBreakdown && Object.keys(updateResult.fieldBreakdown).length > 0 && (
                <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-6">
                  <h3 className="font-semibold text-slate-800 mb-4">Campos Actualizados</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(updateResult.fieldBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([field, count]) => (
                        <div key={field} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-sm text-slate-700 font-medium">{field}</span>
                          <span className="text-sm text-blue-600 font-bold">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {updateResult.errors.length > 0 && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Errores Encontrados ({updateResult.errors.length})
                  </h3>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {updateResult.errors.map((error, idx) => (
                      <div key={idx} className="bg-white rounded p-2 text-sm text-red-800">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setUpdateResult(null);
                  setSelectedFile(null);
                }}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Actualizar Más Productos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
