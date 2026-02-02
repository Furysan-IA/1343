-- ============================================================
-- SCRIPT PARA CREAR TABLA DE AUDITORÍA DE ACTUALIZACIONES
-- ============================================================
-- Ejecutar este script en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query > Pegar y ejecutar
-- ============================================================

-- Crear la tabla de auditoría
CREATE TABLE IF NOT EXISTS product_update_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_uuid uuid,
  codificacion text NOT NULL,
  update_type text NOT NULL CHECK (update_type IN ('fill_empty', 'overwrite')),
  fields_updated jsonb NOT NULL DEFAULT '[]'::jsonb,
  old_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  source_file text,
  batch_id uuid,
  fields_count integer DEFAULT 0
);

-- Habilitar Row Level Security
ALTER TABLE product_update_audit_log ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios autenticados puedan ver logs
CREATE POLICY "Authenticated users can view audit logs"
  ON product_update_audit_log
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para que usuarios autenticados puedan crear logs
CREATE POLICY "Authenticated users can create audit logs"
  ON product_update_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = updated_by);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_audit_log_codificacion ON product_update_audit_log(codificacion);
CREATE INDEX IF NOT EXISTS idx_audit_log_updated_at ON product_update_audit_log(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_batch_id ON product_update_audit_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_updated_by ON product_update_audit_log(updated_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_update_type ON product_update_audit_log(update_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_product_uuid ON product_update_audit_log(product_uuid);
CREATE INDEX IF NOT EXISTS idx_audit_log_fields_count ON product_update_audit_log(fields_count);

-- Índice GIN para búsquedas en campos JSONB
CREATE INDEX IF NOT EXISTS idx_audit_log_fields_updated ON product_update_audit_log USING gin(fields_updated);

-- Comentario en la tabla
COMMENT ON TABLE product_update_audit_log IS 'Registro de auditoría para todas las actualizaciones de campos de productos';

-- Verificar que la tabla se creó correctamente
SELECT
  'Tabla product_update_audit_log creada exitosamente' as status,
  count(*) as total_registros
FROM product_update_audit_log;
