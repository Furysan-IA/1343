import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  FileText,
  Package,
  Users,
  PlusCircle,
  RefreshCw
} from 'lucide-react';
import {
  ProductComparison,
  ClientComparison,
  FieldChange,
  DetailedAnalysisResult
} from '../types/changeAnalysis.types';

interface ChangesPreviewPanelProps {
  analysis: DetailedAnalysisResult;
}

type FilterType = 'all' | 'new' | 'updates' | 'warnings';
type ViewType = 'products' | 'clients';

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const colors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[severity as keyof typeof colors]}`}>
      {severity.toUpperCase()}
    </span>
  );
};

const ChangeRow: React.FC<{ change: FieldChange }> = ({ change }) => {
  const getSeverityColor = () => {
    switch (change.severity) {
      case 'critical': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  if (!change.willChange) {
    return null;
  }

  return (
    <div className={`border-l-4 ${getSeverityColor()} p-3 mb-2 rounded`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="font-medium text-sm text-slate-700 mb-1">
            {change.fieldLabel}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Actual: </span>
              <span className="text-slate-700 font-mono bg-white px-2 py-1 rounded">
                {change.currentValue || '(vacío)'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Nuevo: </span>
              <span className="text-green-700 font-mono bg-white px-2 py-1 rounded font-medium">
                {change.newValue || '(vacío)'}
              </span>
            </div>
          </div>
        </div>
        <SeverityBadge severity={change.severity} />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; count: number; icon: React.ReactNode; color: string }> = ({ title, count, icon, color }) => {
  return (
    <div className={`${color} rounded-lg p-4 flex items-center justify-between`}>
      <div>
        <div className="text-sm font-medium opacity-90 mb-1">{title}</div>
        <div className="text-3xl font-bold">{count}</div>
      </div>
      <div className="opacity-80">
        {icon}
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ product: ProductComparison }> = ({ product }) => {
  const [expanded, setExpanded] = useState(false);

  const getChangeTypeColor = () => {
    if (product.changeType === 'new') return 'border-green-400 bg-green-50';
    if (product.hasConflicts) return 'border-red-400 bg-red-50';
    return 'border-amber-400 bg-amber-50';
  };

  const getChangeTypeIcon = () => {
    if (product.changeType === 'new') return <PlusCircle className="w-5 h-5 text-green-700" />;
    if (product.hasConflicts) return <AlertTriangle className="w-5 h-5 text-red-700" />;
    return <RefreshCw className="w-5 h-5 text-amber-700" />;
  };

  return (
    <div className={`border-2 ${getChangeTypeColor()} rounded-lg mb-3 overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
      <div
        className="p-4 cursor-pointer hover:bg-white/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {getChangeTypeIcon()}
            <div>
              <div className="font-bold text-slate-900 text-base">
                {product.codificacion}
              </div>
              <div className="text-sm text-slate-600">
                {product.productName}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {product.changeType === 'new' ? (
              <span className="px-3 py-1 rounded-full text-sm font-bold text-white bg-green-600 shadow-sm">
                NUEVO
              </span>
            ) : (
              <>
                <span className="px-3 py-1 rounded-full text-sm font-semibold text-slate-700 bg-white border-2 border-slate-300">
                  {product.changes.length} cambios
                </span>
                <SeverityBadge severity={product.impactLevel} />
              </>
            )}
            {product.changeType !== 'new' && (
              expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>

        {product.warnings.length > 0 && (
          <div className="mt-2 flex items-start gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              {product.warnings.map((warning, idx) => (
                <div key={idx}>{warning}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {expanded && product.changes.length > 0 && (
        <div className="border-t-2 border-slate-200 p-4 bg-white">
          <div className="text-sm font-medium text-slate-700 mb-3">
            Cambios detallados:
          </div>
          {product.changes.map((change, idx) => (
            <ChangeRow key={idx} change={change} />
          ))}
        </div>
      )}
    </div>
  );
};

const ClientCard: React.FC<{ client: ClientComparison }> = ({ client }) => {
  const [expanded, setExpanded] = useState(false);

  const getChangeTypeColor = () => {
    if (client.changeType === 'new') return 'border-green-400 bg-green-50';
    return 'border-amber-400 bg-amber-50';
  };

  const getChangeTypeIcon = () => {
    if (client.changeType === 'new') return <PlusCircle className="w-5 h-5 text-green-700" />;
    return <RefreshCw className="w-5 h-5 text-amber-700" />;
  };

  return (
    <div className={`border-2 ${getChangeTypeColor()} rounded-lg mb-3 overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
      <div
        className="p-4 cursor-pointer hover:bg-white/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {getChangeTypeIcon()}
            <div>
              <div className="font-bold text-slate-900 text-base">
                CUIT: {client.cuit}
              </div>
              <div className="text-sm text-slate-600">
                {client.clientName}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {client.changeType === 'new' ? (
              <span className="px-3 py-1 rounded-full text-sm font-bold text-white bg-green-600 shadow-sm">
                NUEVO
              </span>
            ) : (
              <>
                <span className="px-3 py-1 rounded-full text-sm font-semibold text-slate-700 bg-white border-2 border-slate-300">
                  {client.changes.length} cambios
                </span>
                <SeverityBadge severity={client.impactLevel} />
              </>
            )}
            {client.changeType !== 'new' && (
              expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {expanded && client.changes.length > 0 && (
        <div className="border-t-2 border-slate-200 p-4 bg-white">
          <div className="text-sm font-medium text-slate-700 mb-3">
            Cambios detallados:
          </div>
          {client.changes.map((change, idx) => (
            <ChangeRow key={idx} change={change} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ChangesPreviewPanel: React.FC<ChangesPreviewPanelProps> = ({ analysis }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [viewType, setViewType] = useState<ViewType>('products');

  const filterProducts = () => {
    let products: ProductComparison[] = [];

    switch (filterType) {
      case 'new':
        products = analysis.products.new;
        break;
      case 'updates':
        products = analysis.products.updates;
        break;
      case 'warnings':
        products = [...analysis.products.new, ...analysis.products.updates].filter(p => p.hasConflicts);
        break;
      default:
        products = [...analysis.products.new, ...analysis.products.updates];
    }

    if (searchTerm) {
      products = products.filter(p =>
        p.codificacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.productName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return products;
  };

  const filterClients = () => {
    let clients: ClientComparison[] = [];

    switch (filterType) {
      case 'new':
        clients = analysis.clients.new;
        break;
      case 'updates':
        clients = analysis.clients.updates;
        break;
      default:
        clients = [...analysis.clients.new, ...analysis.clients.updates];
    }

    if (searchTerm) {
      clients = clients.filter(c =>
        c.cuit.toString().includes(searchTerm) ||
        c.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return clients;
  };

  const filteredProducts = filterProducts();
  const filteredClients = filterClients();

  const productStats = {
    new: analysis.products.new.length,
    updates: analysis.products.updates.length,
    total: analysis.products.new.length + analysis.products.updates.length,
    warnings: [...analysis.products.new, ...analysis.products.updates].filter(p => p.hasConflicts).length
  };

  const clientStats = {
    new: analysis.clients.new.length,
    updates: analysis.clients.updates.length,
    total: analysis.clients.new.length + analysis.clients.updates.length
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">
          Pre-visualización de Cambios
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewType('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewType === 'products'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            Productos
          </button>
          <button
            onClick={() => setViewType('clients')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              viewType === 'clients'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Clientes
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {viewType === 'products' ? (
          <>
            <StatCard
              title="Total"
              count={productStats.total}
              icon={<Package className="w-10 h-10" />}
              color="bg-slate-100 text-slate-800"
            />
            <StatCard
              title="Productos Nuevos"
              count={productStats.new}
              icon={<PlusCircle className="w-10 h-10" />}
              color="bg-green-100 text-green-800"
            />
            <StatCard
              title="Actualizaciones"
              count={productStats.updates}
              icon={<RefreshCw className="w-10 h-10" />}
              color="bg-amber-100 text-amber-800"
            />
            <StatCard
              title="Advertencias"
              count={productStats.warnings}
              icon={<AlertTriangle className="w-10 h-10" />}
              color="bg-red-100 text-red-800"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Total"
              count={clientStats.total}
              icon={<Users className="w-10 h-10" />}
              color="bg-slate-100 text-slate-800"
            />
            <StatCard
              title="Clientes Nuevos"
              count={clientStats.new}
              icon={<PlusCircle className="w-10 h-10" />}
              color="bg-green-100 text-green-800"
            />
            <StatCard
              title="Actualizaciones"
              count={clientStats.updates}
              icon={<RefreshCw className="w-10 h-10" />}
              color="bg-amber-100 text-amber-800"
            />
            <div className="bg-blue-100 text-blue-800 rounded-lg p-4 flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm font-medium opacity-90 mb-1">Cambios Totales</div>
                <div className="text-3xl font-bold">
                  {[...analysis.clients.new, ...analysis.clients.updates].reduce((sum, c) => sum + c.changes.length, 0)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, nombre o CUIT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-5 py-3 rounded-lg font-bold transition-all shadow-sm hover:shadow-md ${
              filterType === 'all'
                ? 'bg-slate-800 text-white scale-105'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todos
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              filterType === 'all' ? 'bg-white text-slate-800' : 'bg-slate-300 text-slate-700'
            }`}>
              {viewType === 'products' ? productStats.total : clientStats.total}
            </span>
          </button>
          <button
            onClick={() => setFilterType('new')}
            className={`px-5 py-3 rounded-lg font-bold transition-all shadow-sm hover:shadow-md ${
              filterType === 'new'
                ? 'bg-green-600 text-white scale-105'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4 inline mr-1 mb-0.5" />
            Nuevos
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
              filterType === 'new' ? 'bg-white text-green-700' : 'bg-green-200 text-green-800'
            }`}>
              {viewType === 'products' ? productStats.new : clientStats.new}
            </span>
          </button>
          <button
            onClick={() => setFilterType('updates')}
            className={`px-5 py-3 rounded-lg font-bold transition-all shadow-sm hover:shadow-md ${
              filterType === 'updates'
                ? 'bg-amber-600 text-white scale-105'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <RefreshCw className="w-4 h-4 inline mr-1 mb-0.5" />
            Actualizaciones
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
              filterType === 'updates' ? 'bg-white text-amber-700' : 'bg-amber-200 text-amber-800'
            }`}>
              {viewType === 'products' ? productStats.updates : clientStats.updates}
            </span>
          </button>
          {viewType === 'products' && (
            <button
              onClick={() => setFilterType('warnings')}
              className={`px-5 py-3 rounded-lg font-bold transition-all shadow-sm hover:shadow-md ${
                filterType === 'warnings'
                  ? 'bg-red-600 text-white scale-105'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-1 mb-0.5" />
              Advertencias
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                filterType === 'warnings' ? 'bg-white text-red-700' : 'bg-red-200 text-red-800'
              }`}>
                {productStats.warnings}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {viewType === 'products' ? (
          filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductCard key={product.codificacion} product={product} />
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <XCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              No se encontraron productos con los filtros seleccionados
            </div>
          )
        ) : (
          filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <ClientCard key={client.cuit} client={client} />
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <XCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              No se encontraron clientes con los filtros seleccionados
            </div>
          )
        )}
      </div>
    </div>
  );
};
