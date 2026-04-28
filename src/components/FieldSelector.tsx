import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckSquare, Square, Lock } from 'lucide-react';

interface FieldConfig {
  key: string;
  label: string;
  locked?: boolean;
}

interface FieldCategory {
  name: string;
  icon: string;
  fields: FieldConfig[];
}

const FIELD_CATEGORIES: FieldCategory[] = [
  {
    name: 'Información General',
    icon: '📋',
    fields: [
      { key: 'titular', label: 'Titular' },
      { key: 'tipo_certificacion', label: 'Tipo de Certificación' },
      { key: 'estado', label: 'Estado' },
      { key: 'direccion_legal_empresa', label: 'Dirección Legal Empresa' },
      { key: 'en_proceso_renovacion', label: 'En Proceso de Renovación' }
    ]
  },
  {
    name: 'Fabricación',
    icon: '🏭',
    fields: [
      { key: 'fabricante', label: 'Fabricante' },
      { key: 'planta_fabricacion', label: 'Planta de Fabricación' },
      { key: 'origen', label: 'Origen' },
      { key: 'producto', label: 'Producto' },
      { key: 'marca', label: 'Marca' },
      { key: 'modelo', label: 'Modelo' }
    ]
  },
  {
    name: 'Certificación',
    icon: '🎖️',
    fields: [
      { key: 'ocp_extranjero', label: 'OCP Extranjero' },
      { key: 'n_certificado_extranjero', label: 'N° Certificado Extranjero' },
      { key: 'esquema_certificacion', label: 'Esquema de Certificación' },
      { key: 'organismo_certificacion', label: 'Organismo de Certificación' },
      { key: 'disposicion_convenio', label: 'Disposición/Convenio' }
    ]
  },
  {
    name: 'Técnico',
    icon: '🔬',
    fields: [
      { key: 'caracteristicas_tecnicas', label: 'Características Técnicas' },
      { key: 'normas_aplicacion', label: 'Normas de Aplicación' },
      { key: 'informe_ensayo_nro', label: 'Informe de Ensayo N°' },
      { key: 'laboratorio', label: 'Laboratorio' }
    ]
  },
  {
    name: 'Fechas',
    icon: '📅',
    fields: [
      { key: 'fecha_emision', label: 'Fecha de Emisión' },
      { key: 'vencimiento', label: 'Vencimiento' },
      { key: 'fecha_emision_certificado_extranjero', label: 'Fecha Emisión Cert. Extranjero' },
      { key: 'fecha_cancelacion', label: 'Fecha de Cancelación' },
      { key: 'fecha_proxima_vigilancia', label: 'Fecha Próxima Vigilancia' }
    ]
  },
  {
    name: 'Rubros y Clasificación',
    icon: '🏷️',
    fields: [
      { key: 'cod_rubro', label: 'Código de Rubro' },
      { key: 'cod_subrubro', label: 'Código de Subrubro' },
      { key: 'nombre_subrubro', label: 'Nombre de Subrubro' }
    ]
  },
  {
    name: 'Otros',
    icon: '📝',
    fields: [
      { key: 'motivo_cancelacion', label: 'Motivo de Cancelación' },
      { key: 'dias_para_vencer', label: 'Días para Vencer' }
    ]
  }
];

const LOCKED_FIELDS = ['codificacion', 'cuit', 'uuid', 'created_at', 'updated_at'];

interface FieldSelectorProps {
  selectedFields: string[];
  onChange: (fields: string[]) => void;
  className?: string;
}

export function FieldSelector({ selectedFields, onChange, className = '' }: FieldSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(FIELD_CATEGORIES.map(c => c.name))
  );

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleField = (fieldKey: string) => {
    if (LOCKED_FIELDS.includes(fieldKey)) return;

    const newSelected = selectedFields.includes(fieldKey)
      ? selectedFields.filter(f => f !== fieldKey)
      : [...selectedFields, fieldKey];

    onChange(newSelected);
  };

  const selectAllInCategory = (category: FieldCategory) => {
    const categoryFieldKeys = category.fields
      .filter(f => !f.locked && !LOCKED_FIELDS.includes(f.key))
      .map(f => f.key);

    const allSelected = categoryFieldKeys.every(key => selectedFields.includes(key));

    if (allSelected) {
      onChange(selectedFields.filter(key => !categoryFieldKeys.includes(key)));
    } else {
      const newSelected = [...new Set([...selectedFields, ...categoryFieldKeys])];
      onChange(newSelected);
    }
  };

  const selectAll = () => {
    const allFields = FIELD_CATEGORIES.flatMap(cat =>
      cat.fields
        .filter(f => !f.locked && !LOCKED_FIELDS.includes(f.key))
        .map(f => f.key)
    );
    onChange(allFields);
  };

  const deselectAll = () => {
    onChange([]);
  };

  const getTotalSelectableFields = () => {
    return FIELD_CATEGORIES.reduce((total, cat) => {
      return total + cat.fields.filter(f => !f.locked && !LOCKED_FIELDS.includes(f.key)).length;
    }, 0);
  };

  const isCategoryFullySelected = (category: FieldCategory) => {
    const selectableFields = category.fields.filter(
      f => !f.locked && !LOCKED_FIELDS.includes(f.key)
    );
    return selectableFields.length > 0 && selectableFields.every(f => selectedFields.includes(f.key));
  };

  return (
    <div className={`bg-white border-2 border-slate-200 rounded-xl overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <h3 className="text-lg font-semibold mb-2">Seleccionar Campos a Actualizar</h3>
        <div className="flex items-center justify-between">
          <p className="text-sm text-blue-100">
            {selectedFields.length} de {getTotalSelectableFields()} campos seleccionados
          </p>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
            >
              Seleccionar Todo
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
            >
              Deseleccionar Todo
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {FIELD_CATEGORIES.map((category) => {
          const isExpanded = expandedCategories.has(category.name);
          const isFullySelected = isCategoryFullySelected(category);

          return (
            <div key={category.name} className="border-b border-slate-200 last:border-b-0">
              <div
                className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                onClick={() => toggleCategory(category.name)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  )}
                  <span className="text-xl">{category.icon}</span>
                  <span className="font-semibold text-slate-800">{category.name}</span>
                  <span className="text-xs text-slate-500">
                    ({category.fields.filter(f => selectedFields.includes(f.key)).length}/
                    {category.fields.filter(f => !f.locked && !LOCKED_FIELDS.includes(f.key)).length})
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAllInCategory(category);
                  }}
                  className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                >
                  {isFullySelected ? 'Deseleccionar' : 'Seleccionar'} Todo
                </button>
              </div>

              {isExpanded && (
                <div className="p-3 bg-white space-y-2">
                  {category.fields.map((field) => {
                    const isLocked = field.locked || LOCKED_FIELDS.includes(field.key);
                    const isSelected = selectedFields.includes(field.key);

                    return (
                      <div
                        key={field.key}
                        onClick={() => !isLocked && toggleField(field.key)}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                          isLocked
                            ? 'bg-slate-100 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-blue-50 border-2 border-blue-300 cursor-pointer hover:bg-blue-100'
                            : 'border-2 border-slate-200 cursor-pointer hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {isLocked ? (
                          <Lock className="w-4 h-4 text-slate-400" />
                        ) : isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                        <span className={`text-sm ${isLocked ? 'text-slate-500' : 'text-slate-700'}`}>
                          {field.label}
                        </span>
                        {isLocked && (
                          <span className="ml-auto text-xs text-slate-400 italic">Bloqueado</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 border-t-2 border-amber-200 p-3">
        <p className="text-xs text-amber-800 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Los campos bloqueados (codificación, CUIT, UUID) no pueden ser modificados por seguridad
        </p>
      </div>
    </div>
  );
}
