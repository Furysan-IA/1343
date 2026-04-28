-- =====================================================
-- MIGRACIÓN: Agregar Columnas de Tracking a Tabla DJC
-- =====================================================
--
-- Esta migración agrega las columnas necesarias para el sistema
-- de versionado y tracking de DJCs (auto-generadas vs. subidas manualmente)
--
-- INSTRUCCIONES:
-- 1. Abre tu proyecto en Supabase Dashboard
-- 2. Ve a SQL Editor
-- 3. Copia y pega todo este archivo
-- 4. Haz click en "Run"
--
-- Es seguro ejecutar múltiples veces (usa IF NOT EXISTS)
-- =====================================================

-- Agregar columnas a la tabla djc
DO $$
BEGIN
  -- Columna djc_source: rastrear origen de la DJC
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'djc_source'
  ) THEN
    ALTER TABLE djc ADD COLUMN djc_source text DEFAULT 'auto_generated'
    CHECK (djc_source IN ('auto_generated', 'manually_uploaded'));
    RAISE NOTICE 'Columna djc_source agregada exitosamente';
  ELSE
    RAISE NOTICE 'Columna djc_source ya existe';
  END IF;

  -- Columna djc_version: número de versión
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'djc_version'
  ) THEN
    ALTER TABLE djc ADD COLUMN djc_version integer DEFAULT 1;
    RAISE NOTICE 'Columna djc_version agregada exitosamente';
  ELSE
    RAISE NOTICE 'Columna djc_version ya existe';
  END IF;

  -- Columna is_active: marcar versión activa
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE djc ADD COLUMN is_active boolean DEFAULT true;
    RAISE NOTICE 'Columna is_active agregada exitosamente';
  ELSE
    RAISE NOTICE 'Columna is_active ya existe';
  END IF;

  -- Columna replaced_by: link a versión más nueva
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'replaced_by'
  ) THEN
    ALTER TABLE djc ADD COLUMN replaced_by uuid REFERENCES djc(id) ON DELETE SET NULL;
    RAISE NOTICE 'Columna replaced_by agregada exitosamente';
  ELSE
    RAISE NOTICE 'Columna replaced_by ya existe';
  END IF;
END $$;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_djc_codigo_producto_active
  ON djc(codigo_producto) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_djc_source
  ON djc(djc_source);

CREATE INDEX IF NOT EXISTS idx_djc_is_active
  ON djc(is_active);

CREATE INDEX IF NOT EXISTS idx_djc_created_at
  ON djc(created_at DESC);

-- Agregar comentarios para documentación
COMMENT ON COLUMN djc.djc_source IS 'Source of the DJC: auto_generated (from DJC Generator) or manually_uploaded (signed version uploaded by user)';
COMMENT ON COLUMN djc.djc_version IS 'Version number of the DJC, increments when replaced';
COMMENT ON COLUMN djc.is_active IS 'Whether this DJC version is currently active/displayed';
COMMENT ON COLUMN djc.replaced_by IS 'UUID of the DJC that replaced this one (if any)';

-- Verificar que todo se aplicó correctamente
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'djc'
  AND column_name IN ('djc_source', 'djc_version', 'is_active', 'replaced_by')
ORDER BY column_name;
