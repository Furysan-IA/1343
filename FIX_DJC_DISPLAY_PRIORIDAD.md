# Fix: Product Passport Muestra DJC Firmada en Lugar de Auto-generada

## Problema Identificado

Cuando un cliente abría una DJC desde el Product Passport, el sistema mostraba la DJC generada automáticamente por el DJC Generator en lugar de la DJC firmada que había sido subida manualmente a través del modal de producto.

### Causa Raíz

El problema era una falta de sincronización entre dos ubicaciones de almacenamiento de DJC:

1. **Tabla `products`** - Campo `djc_path`: Se actualizaba al subir archivos manualmente
2. **Tabla `djc`** - Campo `pdf_url`: Solo se creaba/actualizaba con el DJC Generator

Cuando se subía una DJC firmada manualmente:
- Solo se actualizaba `products.djc_path`
- NO se actualizaba la tabla `djc`
- El ProductPassport priorizaba `djc.pdf_url` sobre `products.djc_path`
- Resultado: Se seguía mostrando la DJC auto-generada antigua

## Solución Implementada

### 1. Migración de Base de Datos

**Archivo:** `supabase/migrations/20251105000000_add_djc_status_and_source_tracking.sql`

Se agregaron nuevas columnas a la tabla `djc` para rastrear el origen y versión:

- `djc_source` - Distingue entre 'auto_generated' y 'manually_uploaded'
- `djc_version` - Número de versión (se incrementa al reemplazar)
- `is_active` - Marca cuál DJC está actualmente activa/visible
- `replaced_by` - UUID de la DJC que reemplazó a esta (historial)

**Índices creados para mejor rendimiento:**
```sql
CREATE INDEX idx_djc_codigo_producto_active ON djc(codigo_producto) WHERE is_active = true;
CREATE INDEX idx_djc_source ON djc(djc_source);
CREATE INDEX idx_djc_is_active ON djc(is_active);
```

### 2. Actualización de ProductDetailView

**Archivo:** `src/pages/ProductDetailView.tsx`

#### Cambios en `handleFileUpload`:
- Ahora sube DJCs al bucket 'djcs' (antes 'documents')
- Actualiza el estado `djc_status` a 'Firmada' al subir una DJC
- Llama a la nueva función `handleDJCUpload()` para sincronizar con la tabla djc

#### Nueva función `handleDJCUpload`:
Esta función sincroniza la tabla `djc` cuando se sube una DJC firmada manualmente:

1. **Si existe una DJC activa previa:**
   - La desactiva (marca `is_active = false`)
   - Crea un nuevo registro con los mismos datos base
   - Marca como `djc_source = 'manually_uploaded'`
   - Incrementa `djc_version`
   - Vincula la DJC antigua a la nueva mediante `replaced_by`

2. **Si NO existe DJC previa:**
   - Crea un registro mínimo con datos del producto
   - Marca como `djc_source = 'manually_uploaded'`
   - Establece `djc_version = 1`

### 3. Actualización de DJCGenerator

**Archivo:** `src/components/DJC/DJCGenerator.tsx`

Al generar una DJC automáticamente:
- Verifica si existe una DJC activa previa
- Si existe, la desactiva antes de crear la nueva
- Marca la nueva DJC como `djc_source = 'auto_generated'`
- Incrementa correctamente el `djc_version`
- Establece `is_active = true`

### 4. Actualización de ProductPassport

**Archivo:** `src/pages/ProductPassport.tsx`

#### Consulta optimizada de DJC:
```typescript
const { data: djcData } = await supabasePublic
  .from('djc')
  .select('*')
  .eq('codigo_producto', productData.codificacion)
  .eq('is_active', true)  // Solo DJCs activas
  .order('djc_version', { ascending: false })  // Última versión primero
  .order('created_at', { ascending: false })
  .maybeSingle();
```

#### Indicadores visuales agregados:
1. **Badge "Firmada"** - Aparece en verde cuando `djc_source = 'manually_uploaded'`
2. **Badge de versión** - Muestra "Versión X" cuando hay múltiples versiones
3. **Mensaje informativo** - Indica claramente que es una DJC firmada por el titular
4. **Botón de descarga mejorado** - Muestra "Descargar DJC Firmada" o "Descargar DJC"

#### Sección de Documentos mejorada:
En el sidebar de documentos:
- Prioriza `djc.pdf_url` (de la tabla djc con `is_active = true`)
- Muestra badge pequeño "Firmada" en verde si es manually_uploaded
- Fallback a `product.djc_path` si no hay registro en djc table
- Tooltips informativos sobre el tipo de DJC

## Flujo de Trabajo Completo

### Escenario 1: Auto-generar DJC
1. Usuario genera DJC desde DJC Generator
2. Se crea PDF y se sube al bucket 'djcs'
3. Se crea registro en tabla `djc` con:
   - `djc_source = 'auto_generated'`
   - `djc_version = 1`
   - `is_active = true`
4. Se actualiza `products.djc_path` y `djc_status = 'Generada Pendiente de Firma'`
5. Product Passport muestra esta DJC sin badge especial

### Escenario 2: Subir DJC Firmada (tras auto-generar)
1. Cliente firma la DJC manualmente
2. Usuario sube PDF firmado desde ProductDetailView
3. Se sube al bucket 'djcs'
4. Sistema detecta DJC existente activa
5. Desactiva la DJC auto-generada (`is_active = false`)
6. Crea nuevo registro con:
   - `djc_source = 'manually_uploaded'`
   - `djc_version = 2`
   - `is_active = true`
   - `replaced_by` apunta a este nuevo registro en la DJC antigua
7. Actualiza `products.djc_path` y `djc_status = 'Firmada'`
8. Product Passport ahora muestra la DJC firmada con badge verde "Firmada"

### Escenario 3: Subir DJC Firmada (sin auto-generar primero)
1. Usuario sube PDF firmado directamente
2. No existe DJC previa
3. Se crea registro mínimo en tabla `djc` con:
   - `djc_source = 'manually_uploaded'`
   - `djc_version = 1`
   - `is_active = true`
   - Datos básicos del producto
4. Product Passport muestra la DJC con badge "Firmada"

## Ventajas del Sistema de Versiones

1. **Historial completo**: Se mantiene registro de todas las versiones de DJC
2. **No se pierde información**: Las DJCs antiguas se marcan como inactivas pero no se eliminan
3. **Trazabilidad**: Campo `replaced_by` permite seguir la cadena de versiones
4. **Consultas eficientes**: Índice en `is_active` permite encontrar rápidamente la versión actual
5. **Flexibilidad**: Sistema permite regenerar DJCs y subir versiones firmadas sin conflictos

## Consultas Útiles para Auditoría

### Ver historial completo de DJCs de un producto:
```sql
SELECT
  numero_djc,
  djc_source,
  djc_version,
  is_active,
  created_at
FROM djc
WHERE codigo_producto = 'CODIGO_PRODUCTO'
ORDER BY djc_version DESC, created_at DESC;
```

### Ver solo DJCs firmadas activas:
```sql
SELECT *
FROM djc
WHERE djc_source = 'manually_uploaded'
  AND is_active = true;
```

### Encontrar productos con versiones múltiples de DJC:
```sql
SELECT
  codigo_producto,
  COUNT(*) as total_versions,
  MAX(djc_version) as latest_version
FROM djc
GROUP BY codigo_producto
HAVING COUNT(*) > 1;
```

## Testing Recomendado

1. **Test 1**: Generar DJC → Subir firmada → Verificar Product Passport
2. **Test 2**: Subir DJC firmada directamente → Verificar Product Passport
3. **Test 3**: Generar DJC → Regenerar DJC → Subir firmada → Verificar versiones
4. **Test 4**: Verificar que badges y visuales aparecen correctamente
5. **Test 5**: Verificar links de descarga funcionan correctamente

## Archivos Modificados

1. `supabase/migrations/20251105000000_add_djc_status_and_source_tracking.sql` - Nueva migración
2. `src/pages/ProductDetailView.tsx` - Lógica de upload sincronizada
3. `src/components/DJC/DJCGenerator.tsx` - Marcado de fuente y versiones
4. `src/pages/ProductPassport.tsx` - Display mejorado con prioridad y badges

## Notas Importantes

- La migración es segura: usa `IF NOT EXISTS` y establece defaults para datos existentes
- Todos los registros existentes quedan como `djc_source = 'auto_generated'` y `is_active = true`
- No hay pérdida de datos: sistema mantiene historial completo
- Performance mejorado con índices específicos en campos de filtrado frecuente
