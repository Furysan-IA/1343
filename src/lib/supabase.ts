import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

let supabaseInstance: SupabaseClient | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'supabase-auth',
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }
  return supabaseInstance;
})();

export const supabasePublic = supabase;

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
          uuid: string
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
          uuid?: string
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
          uuid?: string
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
    }
  }
}