/*
  # Agregar campos de certificación adicionales a products

  1. Nuevos campos
    - `organismo_certificacion` (text) - Organismo que emitió la certificación
    - `esquema_certificacion` (text) - Esquema o tipo de certificación (ej: "Licencia de Marca (Sistema Nº 5)")
    - `fecha_proxima_vigilancia` (date) - Fecha de la próxima auditoría de vigilancia

  2. Notas
    - Estos campos son opcionales (nullable) ya que productos existentes no los tienen
    - Permiten generar DJC con información más completa según nuevo formato
*/

-- Agregar nuevos campos de certificación
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'organismo_certificacion'
  ) THEN
    ALTER TABLE products ADD COLUMN organismo_certificacion text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'esquema_certificacion'
  ) THEN
    ALTER TABLE products ADD COLUMN esquema_certificacion text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'fecha_proxima_vigilancia'
  ) THEN
    ALTER TABLE products ADD COLUMN fecha_proxima_vigilancia date;
  END IF;
END $$;