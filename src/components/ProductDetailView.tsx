// ProductDetailView.tsx - Versión actualizada con esquema de base de datos
import { useState, useEffect } from 'react';
import { supabase, Database } from '../lib/supabase';
import { QRGenerator } from './QRGenerator';
import { qrConfigService } from '../services/qrConfig.service';
import { 
  X, Edit2, Save, Upload, FileText, QrCode, Award, 
  Calendar, AlertCircle, CheckCircle, Clock, Download,
  Eye, Package, Factory, Shield, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Product {
  codificacion: string;
  cuit: number;
  titular: string | null;
  tipo_certificacion: string | null;
  estado: string | null;
  en_proceso_renovacion: string | null;
  direccion_legal_empresa: string | null;
  fabricante: string | null;
  planta_fabricacion: string | null;
  origen: string | null;
  producto: string | null;
  marca: string | null;
  modelo: string | null;
  caracteristicas_tecnicas: string | null;
  normas_aplicacion: string | null;
  informe_ensayo_nro: string | null;
  laboratorio: string | null;
  ocp_extranjero: string | null;
  n_certificado_extranjero: string | null;
  fecha_emision_certificado_extranjero: string | null;
  disposicion_convenio: string | null;
  cod_rubro: number | null;
  cod_subrubro: number | null;
  nombre_subrubro: string | null;
  fecha_emision: string | null;
  vencimiento: string | null;
  fecha_cancelacion: string | null;
  motivo_cancelacion: string | null;
  dias_para_vencer: number | null;
  djc_status: string;
  certificado_status: string;
  enviado_cliente: string;
  certificado_path: string | null;
  djc_path: string | null;
  qr_path: string | null;
  qr_link: string | null;
  qr_status: string | null;
  qr_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ProductDetailViewProps {
  product: Product;
  onClose: () => void;
  onUpdate: () => void;
}

export function ProductDetailView({ product, onClose, onUpdate }: ProductDetailViewProps) {
  const [editMode, setEditMode] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Product>(product);
  const [originalProduct, setOriginalProduct] = useState<Product>(product);
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [shouldRegenerateQR, setShouldRegenerateQR] = useState(false);

  // Detectar si se deben regenerar los QR cuando cambian datos relevantes
  useEffect(() => {
    const checkQRRegeneration = async () => {
      const needsRegeneration = await qrConfigService.regenerateQRIfNeeded(
        editedProduct, 
        originalProduct
      );
      setShouldRegenerateQR(needsRegeneration);
    };

    if (editMode) {
      checkQRRegeneration();
    }
  }, [editedProduct, originalProduct, editMode]);

  const tabs = [
    { id: 'general', label: 'Información General', icon: Package },
    { id: 'fabricacion', label: 'Fabricación', icon: Factory },
    { id: 'certificacion', label: 'Certificación', icon: Shield },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'qr', label: 'Código QR', icon: QrCode }
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      // Verificar si cambiaron datos relevantes para el QR
      const relevantFields = ['titular', 'producto', 'marca', 'modelo'];
      const hasRelevantChanges = relevantFields.some(
        field => editedProduct[field as keyof Product] !== originalProduct[field as keyof Product]
      );

      // Si hay cambios relevantes y tiene QR, marcar para regeneración
      if (hasRelevantChanges && editedProduct.qr_path) {
        editedProduct.qr_status = 'Pendiente regeneración';
      }

      const { error } = await supabase
        .from('products')
        .update({
          ...editedProduct,
          updated_at: new Date().toISOString()
        })
        .eq('codificacion', product.codificacion);

      if (error) throw error;

      // Si se cambió información relevante, mostrar notificación
      if (hasRelevantChanges && editedProduct.qr_path) {
        toast.warning(
          'Los datos del producto han cambiado. Considere regenerar el código QR.',
          { duration: 5000 }
        );
      }

      toast.success('Producto actualizado correctamente');
      setEditMode(false);
      setOriginalProduct(editedProduct);
      onUpdate();
    } catch (error: any) {
      toast.error(`Error al actualizar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (field: 'certificado_path' | 'djc_path') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploadingFile(field);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${field}_${product.codificacion}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        setEditedProduct(prev => ({ ...prev, [field]: publicUrl }));
        
        // Auto-guardar después de subir
        const { error: updateError } = await supabase
          .from('products')
          .update({ [field]: publicUrl })
          .eq('codificacion', product.codificacion);

        if (updateError) throw updateError;

        toast.success('Archivo subido correctamente');
        onUpdate();
      } catch (error: any) {
        toast.error(`Error al subir archivo: ${error.message}`);
      } finally {
        setUploadingFile(null);
      }
    };
    
    input.click();
  };

  const getProductStatus = () => {
    if (!editedProduct.vencimiento) {
      return { status: 'Sin vencimiento', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    }

    const now = new Date();
    const vencimiento = new Date(editedProduct.vencimiento);
    
    if (vencimiento < now) {
      return { status: 'Vencido', color: 'text-red-600', bgColor: 'bg-red-50' };
    }

    const diasParaVencer = Math.ceil((vencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasParaVencer <= 30) {
      return { status: `Vence en ${diasParaVencer} días`, color: 'text-orange-600', bgColor: 'bg-orange-50' };
    }

    return { status: 'Vigente', color: 'text-green-600', bgColor: 'bg-green-50' };
  };

  const getMissingFields = (tabId: string): string[] => {
    const fieldsByTab: Record<string, (keyof Product)[]> = {
      general: ['producto', 'marca', 'modelo', 'origen', 'titular'],
      fabricacion: ['fabricante', 'planta_fabricacion', 'direccion_legal_empresa'],
      certificacion: ['normas_aplicacion', 'informe_ensayo_nro', 'fecha_emision', 'vencimiento'],
      documentos: []
    };

    const fields = fieldsByTab[tabId] || [];
    return fields.filter(field => !editedProduct[field]);
  };

  const status = getProductStatus();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Ficha del Producto</h2>
              <p className="text-purple-100">Código: {product.codificacion}</p>
              <div className="mt-2">
                <span className={`px-3 py-1 rounded-full text-sm ${status.bgColor} ${status.color}`}>
                  {status.status}
                </span>
                {editedProduct.qr_status === 'Pendiente regeneración' && (
                  <span className="ml-2 px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-600">
                    QR pendiente regeneración
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar
                    </>
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const missingCount = getMissingFields(tab.id).length;
              const Icon = tab.icon;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600 bg-purple-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {missingCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                      {missingCount}
                    </span>
                  )}
                  {tab.id === 'qr' && shouldRegenerateQR && (
                    <RefreshCw className="w-4 h-4 text-orange-600 ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Producto *
                </label>
                <input
                  type="text"
                  value={editedProduct.producto || ''}
                  onChange={(e) => setEditedProduct(prev => ({ ...prev, producto: e.target.value }))}
                  disabled={!editMode}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    !editedProduct.producto ? 'border-red-300' : 'border-gray-300'
                  } ${editMode ? 'focus:ring-2 focus:ring-purple-500' : 'bg-gray-50'}`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca *
                </label>
                <input
                  type="text"
                  value={editedProduct.marca || ''}
                  onChange={(e) => setEditedProduct(prev => ({ ...prev, marca: e.target.value }))}
                  disabled={!editMode}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    !editedProduct.marca ? 'border-red-300' : 'border-gray-300'
                  } ${editMode ? 'focus:ring-2 focus:ring-purple-500' : 'bg-gray-50'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo
                </label>
                <input
                  type="text"
                  value={editedProduct.modelo || ''}
                  onChange={(e) => setEditedProduct(prev => ({ ...prev, modelo: e.target.value }))}
                  disabled={!editMode}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    editMode ? 'border-gray-300 focus:ring-2 focus:ring-purple-500' : 'border-gray-300 bg-gray-50'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Origen *
                </label>
                <input
                  type="text"
                  value={editedProduct.origen || ''}
                  onChange={(e) => setEditedProduct(prev => ({ ...prev, origen: e.target.value }))}
                  disabled={!editMode}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    !editedProduct.origen ? 'border-red-300' : 'border-gray-300'
                  } ${editMode ? 'focus:ring-2 focus:ring-purple-500' : 'bg-gray-50'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titular *
                </label>
                <input
                  type="text"
                  value={editedProduct.titular || ''}
                  onChange={(e) => setEditedProduct(prev => ({ ...prev, titular: e.target.value }))}
                  disabled={!editMode}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    !editedProduct.titular ? 'border-red-300' : 'border-gray-300'
                  } ${editMode ? 'focus:ring-2 focus:ring-purple-500' : 'bg-gray-50'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CUIT
                </label>
                <input
                  type="number"
                  value={editedProduct.cuit || ''}
                  onChange={(e) => setEditedProduct(prev => ({ ...prev, cuit: Number(e.target.value) }))}
                  disabled={!editMode}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    editMode ? 'border-gray-300 focus:ring-2 focus:ring-purple-500' : 'border-gray-300 bg-gray-50'
                  }`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Características Técnicas
                </label>
                <textarea
                  value={editedProduct.caracteristicas_tecnicas || ''}
                  onChange={(e) => setEditedProduct(prev => ({ ...prev, caracteristicas_tecnicas: e.target.value }))}
                  disabled={!editMode}
                  rows={3}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    editMode ? 'border-gray-300 focus:ring-2 focus:ring-purple-500' : 'border-gray-300 bg-gray-50'
                  }`}
                />
              </div>
            </div>
          )}

          {activeTab === 'fabricacion' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fabricante *
                </label>
                <input
                  type="text"
                  value={editedProduct.fabricante || ''}
                  onChange={(e) => setEditedProduct(prev => ({ ...prev, fabricante: e.target.value }))}
                  disabled={!editMode}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    !editedProduct.fabricante ? 'border-red-300' : 'border-gray-300'
                  } ${editMode ? 'focus:ring-2 focus:ring-purple-500' : 'bg-gray-50'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Planta de Fabricación *
                </label>
                <input
                  type="text"
                  value={editedProduct.planta_fabricacion || ''}
                  onChange={(e) => setEditedProduct(prev => ({ ...prev, planta_fabricacion: e.target.value }))}
                  disabled={!editMode}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    !editedProduct.planta_fabricacion ? 'border-red-300' : 'border-gray-300'
                  } ${editMode ? 'focus:ring-2 focus:ring-purple-500' : 'bg-gray-50'}`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección Legal de la Empresa *
                </label>
                <input
                  type="text"
                  value={editedProduct.direccion_legal_empresa || ''}
                  onChange={(e) => setEditedProduct(prev => ({ ...prev, direccion_legal_empresa: e.target.value }))}
                  disabled={!editMode}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    !editedProduct.direccion_legal_empresa ? 'border-red-300' : 'border-gray-300'
                  } ${editMode ? 'focus:ring-2 focus:ring-purple-500' : 'bg-gray-50'}`}
                />
              </div>
            </div>
          )}

          {activeTab === 'certificacion' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Normas de Aplicación *
                </label>
                <textarea
                  value={editedProduct.normas_aplicacion || ''}
                  onChange={(e) => setEditedProduct(prev => ({ ...prev, normas_aplicacion: e.target.value }))}
                  disabled={!editMode}
                  rows={2}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    !editedProduct.normas_aplicacion ? 'border-red-300' : 'border-gray-300'
                  } ${editMode ? 'focus:ring-2 focus:ring-purple-500' : 'bg-gray-50'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Informe de Ensayo Nro *
                </label>
                <input
                  type="text"
                  value={editedProduct.informe_ensayo_nro || ''}
                  onChange={(e) => setEditedProduct(prev => ({ ...prev, informe_ensayo_nro: e.target.value }))}
                  disabled={!editMode}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    !editedProduct.informe_ensayo_nro ? 'border-red-300' : 'border-gray-300'
                  } ${editMode ? 'focus:ring-2 focus:ring-purple-500' : 'bg-gray-50'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Emisión *
                </label>
                <input
                  type="date"
                  value={editedProduct.fecha_emision || ''}
                  onChange={(e) => setEditedProduct(prev => ({ ...prev, fecha_emision: e.target.value }))}
                  disabled={!editMode}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    !editedProduct.fecha_emision ? 'border-red-300' : 'border-gray-300'
                  } ${editMode ? 'focus:ring-2 focus:ring-purple-500' : 'bg-gray-50'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Vencimiento *
                </label>
                <input
                  type="date"
                  value={editedProduct.vencimiento || ''}
                  onChange={(e) => setEditedProduct(prev => ({ ...prev, vencimiento: e.target.value }))}
                  disabled={!editMode}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    !editedProduct.vencimiento ? 'border-red-300' : 'border-gray-300'
                  } ${editMode ? 'focus:ring-2 focus:ring-purple-500' : 'bg-gray-50'}`}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enviado_cliente"
                  checked={editedProduct.enviado_cliente === 'Enviado'}
                  onChange={(e) => setEditedProduct(prev => ({ 
                    ...prev, 
                    enviado_cliente: e.target.checked ? 'Enviado' : 'Pendiente' 
                  }))}
                  disabled={!editMode}
                  className="w-4 h-4 text-purple-600"
                />
                <label htmlFor="enviado_cliente" className="text-sm font-medium text-gray-700">
                  Enviado al cliente
                </label>
              </div>
            </div>
          )}

          {activeTab === 'documentos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Certificado */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    Certificado
                  </h4>
                  {editedProduct.certificado_path ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                {editedProduct.certificado_path ? (
                  <div className="space-y-2">
                    <a
                      href={editedProduct.certificado_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Ver documento
                    </a>
                    <button
                      onClick={() => handleFileUpload('certificado_path')}
                      disabled={uploadingFile === 'certificado_path'}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      {uploadingFile === 'certificado_path' ? 'Subiendo...' : 'Reemplazar'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleFileUpload('certificado_path')}
                    disabled={uploadingFile === 'certificado_path'}
                    className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-2"
                  >
                    {uploadingFile === 'certificado_path' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Subir certificado
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* DJC */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Declaración Jurada (DJC)
                  </h4>
                  {editedProduct.djc_path ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                {editedProduct.djc_path ? (
                  <div className="space-y-2">
                    <a
                      href={editedProduct.djc_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Ver documento
                    </a>
                    <button
                      onClick={() => handleFileUpload('djc_path')}
                      disabled={uploadingFile === 'djc_path'}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      {uploadingFile === 'djc_path' ? 'Subiendo...' : 'Reemplazar'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleFileUpload('djc_path')}
                    disabled={uploadingFile === 'djc_path'}
                    className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-2"
                  >
                    {uploadingFile === 'djc_path' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Subir DJC
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div>
              <QRGenerator 
                product={editedProduct}
                onQRGenerated={(url) => {
                  // Actualizar el producto con la nueva URL del QR
                  setEditedProduct(prev => ({
                    ...prev,
                    qr_link: url,
                    qr_status: 'Generado'
                  }));
                  setShouldRegenerateQR(false);
                  onUpdate();
                }}
                showRegenerateAlert={shouldRegenerateQR}
              />
            </div>
          )}
        </div>

        {/* Footer con información adicional */}
        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Creado: {new Date(editedProduct.created_at).toLocaleDateString('es-AR')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Actualizado: {new Date(editedProduct.updated_at).toLocaleDateString('es-AR')}
              </span>
            </div>
            {editedProduct.qr_generated_at && (
              <span className="flex items-center gap-1">
                <QrCode className="w-4 h-4" />
                QR generado: {new Date(editedProduct.qr_generated_at).toLocaleDateString('es-AR')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}