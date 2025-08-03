import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          cuit: number
          razon_social: string
          direccion: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          cuit: number
          razon_social: string
          direccion: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          cuit?: number
          razon_social?: string
          direccion?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          codificacion: string
          cuit: number
          titular: string | null
          tipo_certificacion: string | null
          estado: string | null
          en_proceso_renovacion: string | null
          direccion_legal_empresa: string | null
          fabricante: string | null
          planta_fabricacion: string | null
          origen: string | null
          producto: string | null
          marca: string | null
          modelo: string | null
          caracteristicas_tecnicas: string | null
          normas_aplicacion: string | null
          informe_ensayo_nro: string | null
          laboratorio: string | null
          ocp_extranjero: string | null
          n_certificado_extranjero: string | null
          fecha_emision_certificado_extranjero: string | null
          disposicion_convenio: string | null
          cod_rubro: number | null
          cod_subrubro: number | null
          nombre_subrubro: string | null
          fecha_emision: string | null
          vencimiento: string | null
          fecha_cancelacion: string | null
          motivo_cancelacion: string | null
          dias_para_vencer: number | null
          djc_status: string
          certificado_status: string
          enviado_cliente: string
          certificado_path: string | null
          djc_path: string | null
          qr_path: string | null
          qr_link: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          codificacion: string
          cuit: number
          titular?: string | null
          tipo_certificacion?: string | null
          estado?: string | null
          en_proceso_renovacion?: string | null
          direccion_legal_empresa?: string | null
          fabricante?: string | null
          planta_fabricacion?: string | null
          origen?: string | null
          producto?: string | null
          marca?: string | null
          modelo?: string | null
          caracteristicas_tecnicas?: string | null
          normas_aplicacion?: string | null
          informe_ensayo_nro?: string | null
          laboratorio?: string | null
          ocp_extranjero?: string | null
          n_certificado_extranjero?: string | null
          fecha_emision_certificado_extranjero?: string | null
          disposicion_convenio?: string | null
          cod_rubro?: number | null
          cod_subrubro?: number | null
          nombre_subrubro?: string | null
          fecha_emision?: string | null
          vencimiento?: string | null
          fecha_cancelacion?: string | null
          motivo_cancelacion?: string | null
          dias_para_vencer?: number | null
          djc_status?: string
          certificado_status?: string
          enviado_cliente?: string
          certificado_path?: string | null
          djc_path?: string | null
          qr_path?: string | null
          qr_link?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          codificacion?: string
          cuit?: number
          titular?: string | null
          tipo_certificacion?: string | null
          estado?: string | null
          en_proceso_renovacion?: string | null
          direccion_legal_empresa?: string | null
          fabricante?: string | null
          planta_fabricacion?: string | null
          origen?: string | null
          producto?: string | null
          marca?: string | null
          modelo?: string | null
          caracteristicas_tecnicas?: string | null
          normas_aplicacion?: string | null
          informe_ensayo_nro?: string | null
          laboratorio?: string | null
          ocp_extranjero?: string | null
          n_certificado_extranjero?: string | null
          fecha_emision_certificado_extranjero?: string | null
          disposicion_convenio?: string | null
          cod_rubro?: number | null
          cod_subrubro?: number | null
          nombre_subrubro?: string | null
          fecha_emision?: string | null
          vencimiento?: string | null
          fecha_cancelacion?: string | null
          motivo_cancelacion?: string | null
          dias_para_vencer?: number | null
          djc_status?: string
          certificado_status?: string
          enviado_cliente?: string
          certificado_path?: string | null
          djc_path?: string | null
          qr_path?: string | null
          qr_link?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      logs: {
        Row: {
          id: string
          timestamp: string
          user_id: string | null
          error_message: string
          context: Json
        }
        Insert: {
          id?: string
          timestamp?: string
          user_id?: string | null
          error_message: string
          context?: Json
        }
        Update: {
          id?: string
          timestamp?: string
          user_id?: string | null
          error_message?: string
          context?: Json
        }
      }
      djc: {
        Row: {
          id: string
          resolucion: string
          razon_social: string
          cuit: number | null
          marca: string
          domicilio_legal: string
          domicilio_planta: string
          telefono: string | null
          email: string
          representante_nombre: string | null
          representante_domicilio: string | null
          representante_cuit: string | null
          codigo_producto: string
          fabricante: string
          identificacion_producto: string
          reglamentos: string | null
          normas_tecnicas: string | null
          documento_evaluacion: string | null
          enlace_declaracion: string | null
          fecha_lugar: string
          firma_url: string | null
          pdf_url: string | null
          numero_djc: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          resolucion: string
          razon_social: string
          cuit?: number | null
          marca: string
          domicilio_legal: string
          domicilio_planta: string
          telefono?: string | null
          email: string
          representante_nombre?: string | null
          representante_domicilio?: string | null
          representante_cuit?: string | null
          codigo_producto: string
          fabricante: string
          identificacion_producto: string
          reglamentos?: string | null
          normas_tecnicas?: string | null
          documento_evaluacion?: string | null
          enlace_declaracion?: string | null
          fecha_lugar: string
          firma_url?: string | null
          pdf_url?: string | null
          numero_djc?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          resolucion?: string
          razon_social?: string
          cuit?: number | null
          marca?: string
          domicilio_legal?: string
          domicilio_planta?: string
          telefono?: string | null
          email?: string
          representante_nombre?: string | null
          representante_domicilio?: string | null
          representante_cuit?: string | null
          codigo_producto?: string
          fabricante?: string
          identificacion_producto?: string
          reglamentos?: string | null
          normas_tecnicas?: string | null
          documento_evaluacion?: string | null
          enlace_declaracion?: string | null
          fecha_lugar?: string
          firma_url?: string | null
          pdf_url?: string | null
          numero_djc?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      djc_history: {
        Row: {
          id: string
          djc_id: string | null
          action: string
          changed_fields: Json
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          djc_id?: string | null
          action: string
          changed_fields?: Json
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          djc_id?: string | null
          action?: string
          changed_fields?: Json
          created_by?: string | null
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          role: 'super_admin' | 'coordinator' | 'client'
          full_name: string | null
          company: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'super_admin' | 'coordinator' | 'client'
          full_name?: string | null
          company?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'super_admin' | 'coordinator' | 'client'
          full_name?: string | null
          company?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}