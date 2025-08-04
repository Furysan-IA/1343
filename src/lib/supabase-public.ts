import { createClient } from '@supabase/supabase-js';

/*
  CONFIGURACIÓN REQUERIDA EN SUPABASE:
  
  Para que las páginas públicas funcionen correctamente, ejecutar estas políticas SQL en Supabase:
  
  -- Permitir lectura pública de productos
  ALTER TABLE products ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Permitir lectura pública de productos" ON products
      FOR SELECT TO public USING (true);
  
  -- Permitir lectura pública de DJC
  ALTER TABLE djc ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Permitir lectura pública de DJC" ON djc
      FOR SELECT TO public USING (true);
      
  NOTA: Estas políticas permiten que cualquier usuario (sin autenticación) 
  pueda leer los datos de productos y DJC a través de los códigos QR.
*/

// Cliente público para acceso sin autenticación
export const supabasePublic = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);