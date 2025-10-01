import React, { useState, useEffect } from 'react';
import { CheckCircle, UserPlus, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { EntityType, UniversalRecord, ParsedData, detectDuplicates, insertRecords, updateBatchStatus } from '../../services/universalDataValidation.service';
import toast from 'react-hot-toast';

interface UniversalReviewScreenProps {
  parsedData: ParsedData;
  batchId: string;
  entityType: EntityType;
  onComplete: () => void;
}

export const UniversalReviewScreen: React.FC<UniversalReviewScreenProps> = ({
  parsedData,
  batchId,
  entityType,
  onComplete
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [exactMatches, setExactMatches] = useState<Map<string, any>>(new Map());
  const [newRecords, setNewRecords] = useState<UniversalRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    analyzeRecords();
  }, []);

  const analyzeRecords = async () => {
    setIsAnalyzing(true);
    try {
      const result = await detectDuplicates(parsedData.rows, entityType);
      setExactMatches(result.exactMatches);
      setNewRecords(result.newRecords);
      toast.success('Análisis completo!');
    } catch (error: any) {
      toast.error(error.message || 'Error al analizar registros');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedRecords);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedRecords(newSelection);
  };

  const handleSelectAll = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, newRecords.length);
    const newSelection = new Set(selectedRecords);

    for (let i = startIndex; i < endIndex; i++) {
      newSelection.add(i);
    }

    setSelectedRecords(newSelection);
  };

  const handleAddSelected = async () => {
    if (selectedRecords.size === 0) return;

    setIsProcessing(true);
    try {
      const recordsToAdd = Array.from(selectedRecords).map(i => newRecords[i]);
      const result = await insertRecords(recordsToAdd, batchId, entityType);

      if (result.success) {
        toast.success(`${result.insertedCount} registros agregados exitosamente`);

        const remainingRecords = newRecords.filter((_, i) => !selectedRecords.has(i));
        setNewRecords(remainingRecords);
        setSelectedRecords(new Set());

        if (currentPage > 1 && remainingRecords.length <= (currentPage - 1) * itemsPerPage) {
          setCurrentPage(currentPage - 1);
        }
      } else {
        toast.error('Algunos registros fallaron al agregarse');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar registros');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddAll = async () => {
    setIsProcessing(true);
    try {
      const result = await insertRecords(newRecords, batchId, entityType);

      if (result.success) {
        toast.success(`${result.insertedCount} registros agregados exitosamente`);
        setNewRecords([]);
      } else {
        toast.error('Algunos registros fallaron al agregarse');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar registros');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = async () => {
    try {
      await updateBatchStatus(batchId, {
        status: 'completed',
        processed_records: parsedData.rows.length,
        new_records: parsedData.rows.length - newRecords.length,
        updated_records: exactMatches.size
      });
      onComplete();
    } catch (error: any) {
      toast.error('Error al finalizar el proceso');
    }
  };

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Analizando registros para duplicados...</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(newRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPageRecords = newRecords.slice(startIndex, startIndex + itemsPerPage);
  const keyField = entityType === 'client' ? 'razon_social' : 'producto';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-6">
            Revisar Resultados - {entityType === 'client' ? 'Clientes' : 'Productos'}
          </h1>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold text-green-900">Coincidencias Exactas</h3>
              </div>
              <p className="text-3xl font-bold text-green-700">
                {exactMatches.size}
              </p>
              <p className="text-sm text-green-600 mt-1">Se actualizarán automáticamente</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                {entityType === 'client' ? (
                  <UserPlus className="w-6 h-6 text-blue-600" />
                ) : (
                  <Package className="w-6 h-6 text-blue-600" />
                )}
                <h3 className="font-semibold text-blue-900">
                  Nuevos {entityType === 'client' ? 'Clientes' : 'Productos'}
                </h3>
              </div>
              <p className="text-3xl font-bold text-blue-700">
                {newRecords.length}
              </p>
              <p className="text-sm text-blue-600 mt-1">Listos para agregar</p>
            </div>
          </div>

          {newRecords.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-800">
                  Nuevos Registros por Agregar
                </h2>

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleSelectAll}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    Seleccionar Página
                  </button>

                  <button
                    onClick={handleAddSelected}
                    disabled={selectedRecords.size === 0 || isProcessing}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-slate-400"
                  >
                    Agregar Seleccionados ({selectedRecords.size})
                  </button>

                  <button
                    onClick={handleAddAll}
                    disabled={isProcessing}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-slate-400"
                  >
                    Agregar Todos
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 mb-6">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left w-12">
                        <input type="checkbox" className="rounded" />
                      </th>
                      {entityType === 'client' ? (
                        <>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">CUIT</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Razón Social</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Dirección</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Codificación</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Producto</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Marca</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Modelo</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentPageRecords.map((record, idx) => {
                      const globalIndex = startIndex + idx;
                      return (
                        <tr key={globalIndex} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedRecords.has(globalIndex)}
                              onChange={() => toggleSelection(globalIndex)}
                              className="rounded"
                            />
                          </td>
                          {entityType === 'client' ? (
                            <>
                              <td className="px-4 py-3 text-sm text-slate-900">{record.cuit}</td>
                              <td className="px-4 py-3 text-sm text-slate-900 font-medium">{record.razon_social}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{record.email}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{record.direccion}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-sm text-slate-900">{record.codificacion}</td>
                              <td className="px-4 py-3 text-sm text-slate-900 font-medium">{record.producto}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{record.marca}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{record.modelo}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, newRecords.length)} de {newRecords.length}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-sm text-slate-600">
                      Página {currentPage} de {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end pt-6 border-t mt-8">
            <button
              onClick={handleFinish}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Completar Procesamiento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
