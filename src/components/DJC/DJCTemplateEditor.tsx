import React, { useState, useEffect } from 'react';
import { Save, Download, Upload, FileText, Palette, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  template_json: any;
  is_default: boolean;
  created_at: string;
}

const DJCTemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMetadata | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('djc_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTemplates(data || []);

      const localTemplates = JSON.parse(localStorage.getItem('djc_templates') || '[]');
      if (localTemplates.length > 0 && (!data || data.length === 0)) {
        setTemplates(localTemplates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      const localTemplates = JSON.parse(localStorage.getItem('djc_templates') || '[]');
      setTemplates(localTemplates);
    }
  };

  const createNewTemplate = () => {
    const newTemplate: TemplateMetadata = {
      id: `template-${Date.now()}`,
      name: 'Nueva Plantilla',
      description: 'Plantilla personalizada',
      template_json: {
        pageMargin: 15,
        headerColor: '#374151',
        labelColor: '#F3F4F6',
        fontSize: 9
      },
      is_default: false,
      created_at: new Date().toISOString()
    };
    setSelectedTemplate(newTemplate);
    setTemplateName(newTemplate.name);
    setTemplateDescription(newTemplate.description);
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) {
      toast.error('No hay plantilla seleccionada');
      return;
    }

    if (!templateName.trim()) {
      toast.error('El nombre de la plantilla es obligatorio');
      return;
    }

    setLoading(true);

    try {
      const templateToSave = {
        ...selectedTemplate,
        name: templateName,
        description: templateDescription,
        template_json: selectedTemplate.template_json
      };

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('djc_templates')
          .upsert({
            id: templateToSave.id,
            name: templateToSave.name,
            description: templateToSave.description,
            template_json: templateToSave.template_json,
            user_id: user.id,
            is_default: false
          })
          .select()
          .single();

        if (error) throw error;

        toast.success('Plantilla guardada en la base de datos');
        await loadTemplates();
      } else {
        const localTemplates = JSON.parse(localStorage.getItem('djc_templates') || '[]');
        const existingIndex = localTemplates.findIndex((t: any) => t.id === templateToSave.id);

        if (existingIndex >= 0) {
          localTemplates[existingIndex] = templateToSave;
        } else {
          localTemplates.push(templateToSave);
        }

        localStorage.setItem('djc_templates', JSON.stringify(localTemplates));
        toast.success('Plantilla guardada localmente');
        await loadTemplates();
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Error al guardar la plantilla');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('djc_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast.success('Plantilla eliminada');
      await loadTemplates();

      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error('Error deleting template:', error);

      const localTemplates = JSON.parse(localStorage.getItem('djc_templates') || '[]');
      const filtered = localTemplates.filter((t: any) => t.id !== templateId);
      localStorage.setItem('djc_templates', JSON.stringify(filtered));

      toast.success('Plantilla eliminada localmente');
      await loadTemplates();
    }
  };

  const exportTemplate = () => {
    if (!selectedTemplate) {
      toast.error('No hay plantilla seleccionada');
      return;
    }

    const dataStr = JSON.stringify(selectedTemplate, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plantilla_${selectedTemplate.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Plantilla exportada');
  };

  const importTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        imported.id = `template-${Date.now()}`;
        setSelectedTemplate(imported);
        setTemplateName(imported.name);
        setTemplateDescription(imported.description);
        toast.success('Plantilla importada correctamente');
      } catch (error) {
        toast.error('Error al importar la plantilla');
      }
    };
    reader.readAsText(file);
  };

  const selectTemplate = (template: TemplateMetadata) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Editor de Plantillas DJC
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona plantillas personalizadas para la generación de DJC
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createNewTemplate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nueva Plantilla
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Plantillas Disponibles</h2>

              {templates.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No hay plantillas guardadas.
                  <br />
                  Crea una nueva plantilla para comenzar.
                </p>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => selectTemplate(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm text-gray-800">
                            {template.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {template.description}
                          </p>
                          {template.is_default && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              Por defecto
                            </span>
                          )}
                        </div>
                        {!template.is_default && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTemplate(template.id);
                            }}
                            className="p-1 hover:bg-red-50 rounded text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedTemplate ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Configuración de Plantilla</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Plantilla
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre de la plantilla"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Descripción de la plantilla"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Margen de Página (mm)
                      </label>
                      <input
                        type="number"
                        value={selectedTemplate.template_json.pageMargin || 15}
                        onChange={(e) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            template_json: {
                              ...selectedTemplate.template_json,
                              pageMargin: Number(e.target.value)
                            }
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="5"
                        max="30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tamaño de Fuente
                      </label>
                      <input
                        type="number"
                        value={selectedTemplate.template_json.fontSize || 9}
                        onChange={(e) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            template_json: {
                              ...selectedTemplate.template_json,
                              fontSize: Number(e.target.value)
                            }
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="7"
                        max="14"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Palette className="h-4 w-4 inline mr-1" />
                        Color de Encabezado
                      </label>
                      <input
                        type="color"
                        value={selectedTemplate.template_json.headerColor || '#374151'}
                        onChange={(e) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            template_json: {
                              ...selectedTemplate.template_json,
                              headerColor: e.target.value
                            }
                          })
                        }
                        className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Palette className="h-4 w-4 inline mr-1" />
                        Color de Etiquetas
                      </label>
                      <input
                        type="color"
                        value={selectedTemplate.template_json.labelColor || '#F3F4F6'}
                        onChange={(e) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            template_json: {
                              ...selectedTemplate.template_json,
                              labelColor: e.target.value
                            }
                          })
                        }
                        className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={saveTemplate}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? 'Guardando...' : 'Guardar Plantilla'}
                  </button>

                  <button
                    onClick={exportTemplate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exportar
                  </button>

                  <label className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    Importar
                    <input
                      type="file"
                      accept=".json"
                      onChange={importTemplate}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Nota:</strong> Esta es una versión simplificada del editor de plantillas.
                    Las plantillas guardadas se utilizarán en la generación de DJC con formato personalizado.
                    Por defecto, se utiliza el formato estándar con encabezados grises.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Selecciona una plantilla existente o crea una nueva para comenzar
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DJCTemplateEditor;
