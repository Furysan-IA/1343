import { createClient } from '@supabase/supabase-js';

// Cliente público para acceso sin autenticación
export const supabase = createClient(
  'https://lqvftssoatskiceicwfi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxdmZ0c3NvYXRza2ljZWljd2ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5ODU5OTcsImV4cCI6MjA2ODU2MTk5N30.ATW3KRAkS7JDqPkiLY0mX_KuOzQ5dezYlivA7e5-TsE',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);