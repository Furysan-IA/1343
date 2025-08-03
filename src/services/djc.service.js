import { supabase } from '../lib/supabase';
import { demoClients, demoProducts } from '../utils/djc';

export const djcService = {
  // Obtener todos los clientes
  async getClients() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('razon_social');
      
      if (error) throw error;
      
      // Si no hay datos en Supabase, usar datos demo
      return data && data.length > 0 ? data : demoClients;
    } catch (error) {
      console.error('Error fetching clients from Supabase:', error);
      // Fallback a datos demo en caso de error
      return demoClients;
    }
  },

  // Obtener productos por CUIT
  async getProductsByCuit(cuit) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('cuit', cuit);
      
      if (error) throw error;
      
      // Si no hay datos en Supabase, usar datos demo filtrados
      const products = data && data.length > 0 ? data : demoProducts.filter(p => p.cuit === cuit);
      return products;
    } catch (error) {
      console.error('Error fetching products from Supabase:', error);
      // Fallback a datos demo filtrados en caso de error
      return demoProducts.filter(p => p.cuit === cuit);
    }
  },

  // Guardar DJC generada
  async saveDJC(djcData) {
    try {
      const { data, error } = await supabase
        .from('djc')
        .insert([djcData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving DJC to Supabase:', error);
      throw error;
    }
  }
};