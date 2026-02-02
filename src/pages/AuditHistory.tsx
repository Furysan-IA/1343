import React, { useState, useEffect } from 'react';
import { History, Search, Filter, Download, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { AuditService, AuditLogEntry } from '../services/audit.service';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export function AuditHistory() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'fill_empty' | 'overwrite'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAuditHistory();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [searchTerm, filterType, auditLogs]);

  const loadAuditHistory = async () => {
    setLoading(true);
    try {
      const logs = await AuditService.getAuditHistory();
      setAuditLogs(logs);
    } catch (error) {
      console.error('Error loading audit history:', error);
      toast.error('Error al cargar el historial de auditoría');
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...auditLogs];

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.codificacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source_file?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.update_type === filterType);
    }

    setFilteredLogs(filtered);
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const exportToExcel = async () => {
    try {
      const data = filteredLogs.map(log => ({
        Codificacion: log.codificacion,
        'Tipo Actualización': log.update_type === 'fill_empty' ? 'Completar Vacíos' : 'Sobrescribir',
        'Campos Actualizados': log.fields_updated.join(', '),
        'Cantidad Campos': log.fields_count,
        'Archivo Origen': log.source_file || 'N/A',
        'Fecha': log.updated_at ? format(new Date(log.updated_at), 'dd/MM/yyyy HH:mm:ss') : 'N/A'
      }));

      console.log('Exportando', data.length, 'registros');
      toast.success(`Se exportaron ${data.length} registros`);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar datos');
    }
  };

  const getUpdateTypeColor = (type: 'fill_empty' | 'overwrite') => {
    return type === 'fill_empty'
      ? 'bg-blue-100 text-blue-800 border-blue-300'
      : 'bg-amber-100 text-amber-800 border-amber-300';
  };

  const getUpdateTypeLabel = (type: 'fill_empty' | 'overwrite') => {
    return type === 'fill_empty' ? 'Completar Vacíos' : 'Sobrescribir';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History className="w-10 h-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-800">Historial de Auditoría</h1>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por codificación o archivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors appearance-none"
              >
                <option value="all">Todos los tipos</option>
                <option value="fill_empty">Solo Completar Vacíos</option>
                <option value="overwrite">Solo Sobrescritura</option>
              </select>
            </div>

            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              <Download className="w-5 h-5" />
              Exportar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b-2 border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Codificación</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Tipo</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Campos</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Archivo</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Fecha</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No se encontraron registros de auditoría
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-semibold text-slate-800">
                            {log.codificacion}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getUpdateTypeColor(log.update_type)}`}>
                            {getUpdateTypeLabel(log.update_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700 font-medium">
                            {log.fields_count} {log.fields_count === 1 ? 'campo' : 'campos'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {log.source_file || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4" />
                            {log.updated_at
                              ? format(new Date(log.updated_at), 'dd/MM/yyyy HH:mm')
                              : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleRow(log.id!)}
                            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            {expandedRows.has(log.id!) ? (
                              <ChevronUp className="w-5 h-5 text-slate-600" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-600" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {expandedRows.has(log.id!) && (
                        <tr className="bg-slate-50">
                          <td colSpan={6} className="px-6 py-6">
                            <div className="grid md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-semibold text-slate-800 mb-3">Campos Actualizados</h4>
                                <div className="space-y-2">
                                  {log.fields_updated.map((field, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200">
                                      <span className="text-sm font-mono text-slate-700">{field}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-800 mb-3">Cambios Realizados</h4>
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                  {Object.entries(log.new_values).map(([field, newValue]) => {
                                    const oldValue = log.old_values[field];
                                    return (
                                      <div key={field} className="bg-white p-3 rounded-lg border border-slate-200">
                                        <div className="text-xs font-semibold text-slate-600 mb-2">{field}</div>
                                        <div className="space-y-1">
                                          <div className="flex items-start gap-2">
                                            <span className="text-xs text-red-600 font-medium">Anterior:</span>
                                            <span className="text-xs text-slate-700 flex-1">
                                              {oldValue === null || oldValue === '' ? '(vacío)' : String(oldValue)}
                                            </span>
                                          </div>
                                          <div className="flex items-start gap-2">
                                            <span className="text-xs text-green-600 font-medium">Nuevo:</span>
                                            <span className="text-xs text-slate-700 flex-1">{String(newValue)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredLogs.length > 0 && (
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Mostrando {filteredLogs.length} de {auditLogs.length} registros
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
