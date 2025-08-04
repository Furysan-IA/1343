import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Cliente Supabase público (sin autenticación)
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

/*
IMPORTANTE: Para que las páginas públicas funcionen, debes ejecutar estas políticas SQL en Supabase:

-- Permitir lectura pública de productos
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir lectura pública de productos" ON products
    FOR SELECT TO public USING (true);

-- Permitir lectura pública de DJC
ALTER TABLE djc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir lectura pública de DJC" ON djc
    FOR SELECT TO public USING (true);

Estas políticas son necesarias para que los códigos QR funcionen sin autenticación.
*/