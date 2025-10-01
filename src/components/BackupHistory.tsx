import React, { useState, useEffect } from 'react';
import { Database, RotateCcw, Trash2, X, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Clock, Users, Package } from 'lucide-react';
import { getBackupHistory, restoreFromSnapshot, deleteSnapshot, BackupSnapshot } from '../services/backup.service';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface BackupHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupHistory: React.FC<BackupHistoryProps> = ({ isOpen, onClose }) => {
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen]);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const data = await getBackupHistory();
      setBackups(data);
    } catch (error: any) {
      toast.error('Error al cargar historial de backups');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (snapshotId: string) => {
    setRestoring(snapshotId);
    try {
      const result = await restoreFromSnapshot(snapshotId);

      if (result.success) {
        toast.success(
          `Restauración exitosa: ${result.clients_restored} clientes, ${result.products_restored} productos`
        );
      } else {
        toast.error(`Restauración parcial: ${result.errors.length} errores`);
      }

      setShowConfirmRestore(null);
      loadBackups();
    } catch (error: any) {
      toast.error(error.message || 'Error al restaurar backup');
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (snapshotId: string) => {
    try {
      const success = await deleteSnapshot(snapshotId);
      if (success) {
        toast.success('Backup eliminado');
        setShowConfirmDelete(null);
        loadBackups();
      } else {
        toast.error('Error al eliminar backup');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar backup');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Historial de Backups</h2>
              <p className="text-sm text-blue-100">
                Restaura versiones anteriores de tus datos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-blue-700 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                No hay backups disponibles
              </h3>
              <p className="text-slate-500">
                Los backups se crean automáticamente antes de procesar certificados
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Database className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-slate-900">
                          {backup.metadata.filename || 'Sin nombre'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(new Date(backup.created_at), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowConfirmRestore(backup.id)}
                        disabled={restoring === backup.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:bg-slate-400"
                      >
                        <RotateCcw className="w-4 h-4" />
                        {restoring === backup.id ? 'Restaurando...' : 'Restaurar'}
                      </button>

                      <button
                        onClick={() => setShowConfirmDelete(backup.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Clientes</p>
                        <p className="text-lg font-bold text-slate-900">
                          {backup.total_clients_backed_up}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Productos</p>
                        <p className="text-lg font-bold text-slate-900">
                          {backup.total_products_backed_up}
                        </p>
                      </div>
                    </div>
                  </div>

                  {backup.metadata.description && (
                    <p className="text-sm text-slate-500 mt-3">
                      {backup.metadata.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {showConfirmRestore && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Confirmar Restauración</h3>
                  <p className="text-sm text-slate-600">Esta acción sobrescribirá los datos actuales</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-900">
                  <strong>Advertencia:</strong> Los datos actuales de los clientes y productos
                  afectados se reemplazarán con la versión del backup. Esta operación no se puede deshacer.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirmRestore(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleRestore(showConfirmRestore)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Confirmar Restauración
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Eliminar Backup</h3>
                  <p className="text-sm text-slate-600">Esta acción no se puede deshacer</p>
                </div>
              </div>

              <p className="text-slate-700 mb-6">
                ¿Estás seguro que quieres eliminar este backup? No podrás restaurar estos datos después.
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirmDelete(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(showConfirmDelete)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
