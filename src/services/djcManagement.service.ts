import { supabase } from '../lib/supabase';
import { generateDJCPDF, type DJCData } from './djcPdf.service';

export interface DJCGenerationData {
  product: any;
  client?: any;
  resolucion: string;
  representante?: {
    nombre: string;
    domicilio: string;
    cuit: string;
  };
  customLink?: string;
  sourceType: 'client' | 'product';
}

export interface DJCGenerationResult {
  success: boolean;
  djcId?: string;
  pdfUrl?: string;
  error?: string;
}

export const djcManagementService = {
  async getClientByCuit(cuit: string | number) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('cuit', cuit)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getProductByCode(codificacion: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('codificacion', codificacion)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async generateDJCNumber(): Promise<string> {
    const { data, error } = await supabase
      .from('djc')
      .select('numero_djc')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    let lastNumber = 0;
    if (data && data.length > 0 && data[0].numero_djc) {
      const match = data[0].numero_djc.match(/DJC-(\d+)/);
      if (match) {
        lastNumber = parseInt(match[1], 10);
      }
    }

    const newNumber = lastNumber + 1;
    return `DJC-${String(newNumber).padStart(6, '0')}`;
  },

  generatePreviewPDF(data: DJCGenerationData): Blob {
    const currentDate = new Date().toLocaleDateString('es-AR');
    const product = data.product;
    const client = data.client || {};

    const qrLink = data.customLink || `${window.location.origin}/qr/${product.codificacion}`;

    const djcData: DJCData = {
      numero_djc: 'PREVIEW-' + Date.now(),
      resolucion: data.resolucion,
      razon_social: client.razon_social || product.titular || '',
      cuit: String(client.cuit || product.cuit || ''),
      marca: client.razon_social || product.marca || '',
      domicilio_legal: client.direccion || product.direccion_legal_empresa || '',
      domicilio_planta: product.planta_fabricacion || client.direccion || '',
      telefono: client.telefono || '',
      email: client.email || '',
      representante_nombre: data.representante?.nombre || '',
      representante_domicilio: data.representante?.domicilio || '',
      representante_cuit: data.representante?.cuit || '',
      codigo_producto: product.codificacion,
      fabricante: product.fabricante || product.titular || '',
      identificacion_producto: product.producto || '',
      producto_marca: product.marca || '',
      producto_modelo: product.modelo || '',
      caracteristicas_tecnicas: product.caracteristicas_tecnicas || '',
      normas_tecnicas: product.normas_aplicacion || '',
      numero_certificado: product.numero_certificado || '',
      organismo_certificacion: product.organismo_certificacion || 'Intertek Argentina Certificaciones SA',
      esquema_certificacion: product.esquema_certificacion || '',
      fecha_emision_certificado: product.fecha_emision || '',
      fecha_proxima_vigilancia: product.fecha_proxima_vigilancia || '',
      laboratorio_ensayos: product.laboratorio || '',
      informe_ensayos: product.informe_ensayo_nro || '',
      enlace_declaracion: qrLink,
      fecha_lugar: `Argentina, ${currentDate}`
    };

    return generateDJCPDF(djcData);
  },

  async generateAndSaveDJC(data: DJCGenerationData): Promise<DJCGenerationResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      const numero_djc = await this.generateDJCNumber();
      const currentDate = new Date().toLocaleDateString('es-AR');
      const product = data.product;
      const client = data.client || {};

      const qrLink = data.customLink || `${window.location.origin}/qr/${product.codificacion}`;

      const djcData: DJCData = {
        numero_djc,
        resolucion: data.resolucion,
        razon_social: client.razon_social || product.titular || '',
        cuit: String(client.cuit || product.cuit || ''),
        marca: client.razon_social || product.marca || '',
        domicilio_legal: client.direccion || product.direccion_legal_empresa || '',
        domicilio_planta: product.planta_fabricacion || client.direccion || '',
        telefono: client.telefono || '',
        email: client.email || '',
        representante_nombre: data.representante?.nombre || '',
        representante_domicilio: data.representante?.domicilio || '',
        representante_cuit: data.representante?.cuit || '',
        codigo_producto: product.codificacion,
        fabricante: product.fabricante || product.titular || '',
        identificacion_producto: product.producto || '',
        producto_marca: product.marca || '',
        producto_modelo: product.modelo || '',
        caracteristicas_tecnicas: product.caracteristicas_tecnicas || '',
        normas_tecnicas: product.normas_aplicacion || '',
        numero_certificado: product.numero_certificado || '',
        organismo_certificacion: product.organismo_certificacion || 'Intertek Argentina Certificaciones SA',
        esquema_certificacion: product.esquema_certificacion || '',
        fecha_emision_certificado: product.fecha_emision || '',
        fecha_proxima_vigilancia: product.fecha_proxima_vigilancia || '',
        laboratorio_ensayos: product.laboratorio || '',
        informe_ensayos: product.informe_ensayo_nro || '',
        enlace_declaracion: qrLink,
        fecha_lugar: `Argentina, ${currentDate}`
      };

      const pdfBlob = generateDJCPDF(djcData);
      const fileName = `${numero_djc}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('djcs')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        return { success: false, error: `Error al subir PDF: ${uploadError.message}` };
      }

      const { data: urlData } = supabase.storage
        .from('djcs')
        .getPublicUrl(fileName);

      const { data: djcRecord, error: djcError } = await supabase
        .from('djc')
        .insert({
          numero_djc,
          resolucion: data.resolucion,
          razon_social: djcData.razon_social,
          cuit: client.cuit || product.cuit,
          marca: djcData.marca,
          domicilio_legal: djcData.domicilio_legal,
          domicilio_planta: djcData.domicilio_planta,
          telefono: djcData.telefono,
          email: djcData.email,
          representante_nombre: data.representante?.nombre || null,
          representante_domicilio: data.representante?.domicilio || null,
          representante_cuit: data.representante?.cuit || null,
          codigo_producto: product.codificacion,
          fabricante: djcData.fabricante,
          identificacion_producto: djcData.identificacion_producto,
          normas_tecnicas: djcData.normas_tecnicas,
          enlace_declaracion: qrLink,
          fecha_lugar: djcData.fecha_lugar,
          pdf_url: urlData.publicUrl,
          created_by: user.id
        })
        .select()
        .single();

      if (djcError) {
        return { success: false, error: `Error al guardar DJC: ${djcError.message}` };
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({
          djc_status: 'Generada Pendiente de Firma',
          djc_path: urlData.publicUrl
        })
        .eq('codificacion', product.codificacion);

      if (updateError) {
        console.error('Error updating product:', updateError);
      }

      return {
        success: true,
        djcId: djcRecord.id,
        pdfUrl: urlData.publicUrl
      };
    } catch (error: any) {
      console.error('Error in generateAndSaveDJC:', error);
      return {
        success: false,
        error: error.message || 'Error desconocido'
      };
    }
  }
};
