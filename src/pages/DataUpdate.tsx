import React, { useState } from 'react';
import { Upload, RefreshCw, FileSpreadsheet, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { ProductUpdateService, UpdateStats } from '../services/productUpdate.service';
import { DataMapper } from '../services/dataMapper.service';
import { parseFile } from '../services/universalDataValidation.service';
import toast from 'react-hot-toast';

export default function DataUpdate() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [updateResult, setUpdateResult] = useState<UpdateStats | null>(null);

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

    setIsProcessing(true);
    setProgress(0);
    setProcessingStep('Leyendo archivo Excel...');
    setUpdateResult(null);

    try {
      console.log('🚀 Iniciando actualización de datos preexistentes...');

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
      setProcessingStep('Actualizando productos existentes...');

      const stats = await ProductUpdateService.updateProductsFromExcel(
        mappingResult.products,
        (current, total) => {
          const percent = 60 + Math.round((current / total) * 40);
          setProgress(percent);
          setProcessingStep(`Actualizando ${current} de ${total} productos...`);
        }
      );

      console.log('✅ Actualización completada:', stats);
      setUpdateResult(stats);
      setProgress(100);
      setProcessingStep('¡Actualización completada!');

      if (stats.updated > 0) {
        toast.success(`${stats.updated} productos actualizados exitosamente!`);
      } else {
        toast.info('No se encontraron campos vacíos para actualizar');
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
            <h2 className="text-2xl font-bold text-slate-800 mb-2">🔄 Actualizando Productos</h2>
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

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <RefreshCw className="w-10 h-10 text-blue-600" />
              <h1 className="text-3xl font-bold text-slate-800">
                Actualización de Datos Existentes
              </h1>
            </div>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Esta herramienta actualiza productos que ya existen en la base de datos,
              rellenando únicamente los campos vacíos con los datos del Excel.
            </p>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">📋 ¿Cómo funciona?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Busca cada producto por su <strong>codificación</strong></li>
              <li>• Actualiza <strong>solo campos vacíos</strong> (NULL o vacío)</li>
              <li>• <strong>NO sobrescribe</strong> datos existentes</li>
              <li>• Procesa todos los productos automáticamente</li>
            </ul>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
            <h3 className="font-semibold text-amber-900 mb-2">⚠️ Campos que se pueden actualizar</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-amber-800">
              <div>
                <ul className="space-y-1">
                  <li>• Dirección Legal Empresa</li>
                  <li>• Fabricante</li>
                  <li>• Planta de Fabricación</li>
                  <li>• Laboratorio</li>
                  <li>• Informe de Ensayo</li>
                </ul>
              </div>
              <div>
                <ul className="space-y-1">
                  <li>• OCP Extranjero</li>
                  <li>• Certificado Extranjero</li>
                  <li>• Esquema Certificación</li>
                  <li>• Y todos los demás campos...</li>
                </ul>
              </div>
            </div>
          </div>

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
                  {isProcessing ? 'Actualizando...' : 'Actualizar Productos Existentes'}
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
