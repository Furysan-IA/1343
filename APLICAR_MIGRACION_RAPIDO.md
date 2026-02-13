# 🚀 Aplicar Migración RÁPIDO (2 minutos)

## Paso 1: Abre el SQL Editor
Ve a: https://gmwwvowphjxmertcedtt.supabase.co/project/_/sql

## Paso 2: Copia y pega este SQL

```sql
-- AGREGAR COLUMNAS PARA QR COMPARTIDO
ALTER TABLE products ADD COLUMN IF NOT EXISTS shared_qr_from text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_qr_master boolean DEFAULT false;

-- CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_products_shared_qr_from ON products(shared_qr_from) WHERE shared_qr_from IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_qr_master ON products(is_qr_master) WHERE is_qr_master = true;

-- VISTA PARA RELACIONES
CREATE OR REPLACE VIEW qr_sharing_relationships AS
SELECT
  p1.codificacion as producto_revision,
  p1.producto as nombre_producto_revision,
  p1.uuid as uuid_revision,
  p1.shared_qr_from as producto_original,
  p2.producto as nombre_producto_original,
  p2.uuid as uuid_original,
  p2.qr_link as qr_compartido,
  p2.qr_path as qr_image_path,
  p2.qr_status as estado_qr,
  p2.qr_generated_at as qr_generado_en,
  COUNT(*) OVER (PARTITION BY p1.shared_qr_from) as total_productos_usando_este_qr
FROM products p1
INNER JOIN products p2 ON p1.shared_qr_from = p2.codificacion
WHERE p1.shared_qr_from IS NOT NULL;

GRANT SELECT ON qr_sharing_relationships TO authenticated;
```

## Paso 3: Haz clic en RUN

## ✅ Listo!

Recarga la aplicación y la lista ya funcionará con todas las características.
