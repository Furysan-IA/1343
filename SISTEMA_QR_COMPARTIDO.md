# Sistema de Reutilización de Códigos QR para Revisiones de Certificados

## Resumen

Este sistema permite que productos revisados (por ejemplo, ABC123-R1, ABC123-R2) puedan reutilizar el código QR del producto original (ABC123). Esto es especialmente útil para certificados que tienen revisiones, permitiendo que el cliente mantenga el mismo código QR físico mientras los usuarios que lo escanean ven siempre la información más actualizada.

## Problema Resuelto

**Situación anterior:**
- Producto ABC123 tiene su QR generado e impreso
- Se crea revisión ABC123-R1 con certificado actualizado
- El cliente necesitaría imprimir un nuevo QR para ABC123-R1
- Los QR antiguos muestran información desactualizada

**Solución actual:**
- El producto ABC123-R1 puede reutilizar el QR de ABC123
- El QR físico permanece sin cambios
- Al escanear, se muestra automáticamente la revisión más reciente (R1)
- No es necesario reimprimir etiquetas QR

## Arquitectura de la Solución

### 1. Base de Datos

#### Nuevos campos en la tabla `products`:
- `shared_qr_from` (text, nullable): Codificación del producto del cual se reutiliza el QR
- `is_qr_master` (boolean): Indica si otros productos están usando el QR de este producto

#### Vista `qr_sharing_relationships`:
Vista que muestra todas las relaciones de QR compartidos con información detallada.

#### Funciones de Base de Datos:

1. **`is_revision_code(code text)`**: Detecta si un código es una revisión (termina en -R#)
2. **`get_base_product_code(revision_code text)`**: Extrae el código base de una revisión
3. **`get_products_using_qr(source_codificacion text)`**: Lista productos que usan un QR específico
4. **`validate_qr_sharing(product_code, share_from_code)`**: Valida que la vinculación sea segura

#### Triggers:
- `trigger_update_qr_master_status`: Actualiza automáticamente el flag `is_qr_master`

### 2. Servicio `sharedQRService`

Ubicación: `src/services/sharedQRService.ts`

**Funciones principales:**

- `isRevisionCode()`: Detecta códigos de revisión
- `getBaseProductCode()`: Obtiene el código base
- `findBaseProduct()`: Busca el producto base automáticamente
- `searchProductsWithQR()`: Busca productos con QR generado
- `linkProductToSharedQR()`: Vincula producto a QR compartido
- `unlinkSharedQR()`: Desvincula producto de QR compartido
- `getEffectiveQR()`: Obtiene el QR efectivo (propio o compartido)
- `getProductsUsingThisQR()`: Lista dependencias

### 3. Interfaz de Usuario - ProductQRDisplay

**Funcionalidades agregadas:**

1. **Detección automática de revisiones:**
   - Si el producto termina en -R1, -R2, etc.
   - Se muestra automáticamente sugerencia del producto base
   - Botón de "Reutilizar QR Original"

2. **Banner de QR compartido:**
   - Indica claramente cuando un producto usa QR compartido
   - Muestra el producto origen
   - Botón para desvincular

3. **Listado de productos dependientes:**
   - Muestra cuántos productos usan este QR
   - Lista completa de codificaciones dependientes

4. **Buscador de productos:**
   - Búsqueda por código, nombre, marca
   - Solo muestra productos con QR generado
   - Excluye productos que ya comparten QR

### 4. Product Passport - Vista Pública

**Comportamiento al escanear QR:**

1. Se detecta el producto por UUID (producto original)
2. Se buscan productos que comparten ese QR
3. Si existen revisiones, se muestra automáticamente la más reciente
4. Banner visual indica que se está viendo una revisión
5. Lista de todas las versiones disponibles

## Flujo de Trabajo

### Escenario 1: Producto Original

1. Usuario crea producto "ABC123"
2. Genera QR desde la pestaña "Código QR"
3. El QR se imprime y se adhiere al producto
4. QR apunta a `/products/{uuid-abc123}`

### Escenario 2: Primera Revisión

1. Usuario crea producto "ABC123-R1" (revisión del certificado)
2. Al abrir la pestaña "Código QR", el sistema:
   - Detecta automáticamente que es una revisión
   - Busca "ABC123" como producto base
   - Si encuentra QR generado, muestra sugerencia
3. Usuario hace clic en "Reutilizar QR Original"
4. El sistema vincula ABC123-R1 → ABC123
5. ABC123-R1 ahora usa el QR de ABC123

**En la base de datos:**
```sql
-- Producto ABC123
codificacion: 'ABC123'
shared_qr_from: null
is_qr_master: true
qr_link: 'https://domain.com/products/uuid-abc123'

-- Producto ABC123-R1
codificacion: 'ABC123-R1'
shared_qr_from: 'ABC123'
is_qr_master: false
qr_link: null  -- No tiene QR propio
```

### Escenario 3: Cliente Escanea el QR

1. Cliente escanea QR físico (apunta a UUID de ABC123)
2. ProductPassport carga producto ABC123
3. Sistema detecta que existe ABC123-R1 compartiendo este QR
4. Automáticamente muestra ABC123-R1 (revisión más reciente)
5. Banner indica: "Información Actualizada - Mostrando revisión R1"

### Escenario 4: Múltiples Revisiones

```
ABC123 (original, QR Master)
  ├─ ABC123-R1 (primera revisión)
  ├─ ABC123-R2 (segunda revisión)
  └─ ABC123-R3 (tercera revisión - más reciente)
```

- Todas las revisiones usan el QR de ABC123
- Al escanear, se muestra ABC123-R3 automáticamente
- Banner lista todas las versiones disponibles

## Validaciones de Seguridad

El sistema previene:

1. **Referencias circulares:**
   - Un producto no puede compartir QR de otro que ya comparte
   - ABC123 ← ABC123-R1 ← ABC123-R2 ❌ (no permitido)

2. **Auto-referencia:**
   - Un producto no puede compartir QR consigo mismo

3. **Productos sin QR:**
   - No se puede compartir de un producto que no tiene QR generado

4. **Integridad referencial:**
   - Foreign key constraint asegura que el producto origen existe
   - ON DELETE SET NULL si se elimina el producto origen

## Indicadores Visuales

### En ProductQRDisplay:

- **Badge azul**: "QR Compartido desde: ABC123"
- **Badge verde**: "QR compartido por N productos"
- **Badge morado**: Sugerencia de revisión detectada
- **Icono de enlace**: Indica QR compartido

### En ProductPassport:

- **Banner morado/índigo**: Información actualizada
- **Lista de revisiones**: Muestra todas las versiones
- **Badges de estado**: Certificado actualizado, última revisión

## Búsqueda y Filtrado

### Buscador en ProductQRDisplay:

- **Mínimo 2 caracteres** para iniciar búsqueda
- **Busca en:** codificación, nombre de producto, marca
- **Filtra:** Solo productos con QR generado
- **Excluye:** Producto actual y productos que ya comparten QR
- **Límite:** 20 resultados por defecto

### Ordenamiento:

- Productos compartidos ordenados por `codificacion DESC`
- Muestra primero las revisiones más recientes (R3, R2, R1)

## Consultas Útiles

### Ver todas las relaciones de QR compartidos:
```sql
SELECT * FROM qr_sharing_relationships;
```

### Encontrar productos maestros (con dependientes):
```sql
SELECT codificacion, producto
FROM products
WHERE is_qr_master = true;
```

### Ver historial de un producto:
```sql
SELECT codificacion, shared_qr_from, is_qr_master, qr_link
FROM products
WHERE codificacion LIKE 'ABC123%'
ORDER BY codificacion;
```

### Contar productos por QR maestro:
```sql
SELECT
  shared_qr_from,
  COUNT(*) as total_dependientes
FROM products
WHERE shared_qr_from IS NOT NULL
GROUP BY shared_qr_from
ORDER BY total_dependientes DESC;
```

## Migración de Datos Existentes

### Automática:
- Nuevos campos se agregan con valores por defecto seguros
- `shared_qr_from = null` (todos usan QR propio)
- `is_qr_master = false` (ninguno tiene dependientes inicialmente)

### Manual (recomendado):
1. Identificar productos con patrón -R1, -R2, etc.
2. Verificar que productos base tengan QR generado
3. Ejecutar vinculación para cada revisión:
```typescript
await sharedQRService.linkProductToSharedQR('ABC123-R1', 'ABC123');
```

## Limitaciones y Consideraciones

### Limitaciones:

1. **Un nivel de profundidad:**
   - Solo se permite un nivel: Original → Revisión
   - No se permiten cadenas: Original → R1 → R2 ❌
   - Correcto: Original ← R1, Original ← R2 ✓

2. **Patrón de nomenclatura:**
   - Detecta automáticamente: -R seguido de dígitos
   - Ejemplos válidos: ABC-R1, ABC-R2, ABC123-R10
   - Otros patrones requieren vinculación manual

### Consideraciones:

1. **QR físico permanente:**
   - No se puede cambiar el QR una vez impreso
   - Sistema diseñado para mantener compatibilidad

2. **Eliminación de productos:**
   - Si se elimina producto maestro, dependientes quedan con `shared_qr_from = null`
   - Deben generar su propio QR o vincularse a otro

3. **Performance:**
   - Índices optimizados para búsquedas frecuentes
   - Query de ProductPassport hace 2 consultas (producto + dependientes)

## Testing

### Casos de prueba recomendados:

1. **Test básico:**
   - ✓ Crear producto ABC123
   - ✓ Generar QR
   - ✓ Crear producto ABC123-R1
   - ✓ Vincular QR
   - ✓ Escanear QR, verificar que muestra R1

2. **Test de detección automática:**
   - ✓ Crear producto terminado en -R1
   - ✓ Verificar que aparece sugerencia
   - ✓ Aceptar sugerencia
   - ✓ Verificar vinculación correcta

3. **Test de múltiples revisiones:**
   - ✓ Crear ABC123, ABC123-R1, ABC123-R2
   - ✓ Vincular ambas revisiones
   - ✓ Escanear QR
   - ✓ Verificar que muestra R2 (más reciente)

4. **Test de desvinculación:**
   - ✓ Vincular QR
   - ✓ Desvincular
   - ✓ Verificar que vuelve a usar QR propio

5. **Test de validación:**
   - ✓ Intentar vincular a producto sin QR (debe fallar)
   - ✓ Intentar crear referencia circular (debe fallar)
   - ✓ Intentar auto-referencia (debe fallar)

## Mantenimiento

### Revisar periódicamente:

1. **Productos huérfanos:**
   - Productos con `shared_qr_from` apuntando a producto eliminado
   - Query: `SELECT * FROM products WHERE shared_qr_from NOT IN (SELECT codificacion FROM products)`

2. **QR maestros sin dependientes:**
   - Productos con `is_qr_master = true` pero sin dependientes reales
   - Trigger debería mantener esto sincronizado

3. **Consistencia de datos:**
   - Ejecutar validación de integridad referencial
   - Verificar que productos compartidos no tienen QR propio generado

## Extensiones Futuras

### Posibles mejoras:

1. **Panel de administración:**
   - Vista de todas las relaciones de QR
   - Detectar y vincular automáticamente todas las revisiones
   - Estadísticas de uso

2. **Versionado explícito:**
   - Agregar campo `version_number` (1, 2, 3)
   - Mejorar ordenamiento de versiones

3. **Historial de cambios:**
   - Auditoría de cuándo se vinculó/desvinculó
   - Usuario que realizó la acción

4. **Notificaciones:**
   - Alertar cuando se crea nueva revisión
   - Sugerir actualización de QR master

## Soporte y Troubleshooting

### Problema: Sugerencia no aparece
**Causa:** Producto base no tiene QR generado
**Solución:** Generar QR para el producto base primero

### Problema: Error al vincular
**Causa:** Validación fallida (circular reference, sin QR, etc.)
**Solución:** Verificar que producto origen tenga QR y no comparta a su vez

### Problema: ProductPassport muestra versión incorrecta
**Causa:** Ordenamiento de codificaciones
**Solución:** Verificar que revisiones tengan nomenclatura correcta (R1, R2, no R01, R02)

### Problema: is_qr_master no se actualiza
**Causa:** Trigger no funcionando
**Solución:** Verificar que trigger esté creado y habilitado

## Archivos Modificados/Creados

### Base de Datos:
- `supabase/migrations/20251106000000_add_qr_sharing_system.sql`

### Servicios:
- `src/services/sharedQRService.ts` (nuevo)

### Componentes:
- `src/components/ProductQRDisplay.tsx` (modificado)
- `src/pages/ProductPassport.tsx` (modificado)

## Contacto y Documentación Adicional

Para más información sobre el sistema:
- Ver `DESIGN_DOCUMENT.md` para arquitectura general
- Ver migraciones en `supabase/migrations/` para esquema de BD
- Consultar código fuente con comentarios detallados
