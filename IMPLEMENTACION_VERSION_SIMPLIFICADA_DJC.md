# Implementación del Sistema de Versión Simplificada DJC

## Resumen de Cambios

Se ha implementado exitosamente el sistema de versión simplificada de DJC que permite gestionar productos con información simplificada del fabricante, tomando el estado de la columna AE del Excel y utilizando la columna AN para la codificación simplificada.

## Cambios Implementados

### 1. Base de Datos

**Archivo**: `add_codigo_version_simplificada_migration.sql`

- Se creó una nueva columna `codigo_version_simplificada` en la tabla `products`
- Esta columna almacena el valor de la columna AN del Excel
- Es un campo opcional (nullable) para mantener compatibilidad con productos existentes

**IMPORTANTE**: Debes ejecutar este archivo SQL en tu editor SQL de Supabase antes de usar la funcionalidad.

```sql
ALTER TABLE products
ADD COLUMN IF NOT EXISTS codigo_version_simplificada text;
```

### 2. Mapeo de Datos Excel

**Archivo**: `src/services/dataMapper.service.ts`

- **Columna AE (ESTADO ENSAYOS)**: Ahora se mapea automáticamente al campo `estado`
  - Variaciones reconocidas: 'estado', 'status', 'vigencia', 'estado ensayos', 'estado_ensayos'

- **Columna AN (TIENE VERSION SIMPLIFICADA)**: Se mapea al nuevo campo `codigo_version_simplificada`
  - Variaciones reconocidas: 'codigo_version_simplificada', 'código versión simplificada', 'version simplificada', 'versión simplificada', 'tiene version simplificada', 'tiene versión simplificada'

### 3. Interfaz de Usuario

#### Modal de Detalle del Producto

**Archivo**: `src/components/ProductDetailView.tsx`

Se agregó un nuevo campo editable en la pestaña "Fabricación":

- **Campo**: "Código Versión Simplificada"
- **Ubicación**: Después del campo "Planta de Fabricación"
- **Características**:
  - Editable manualmente en modo de edición
  - Se llena automáticamente desde el Excel (columna AN)
  - Muestra un indicador visual cuando tiene valor
  - Incluye descripción de ayuda para el usuario
  - Placeholder de ejemplo: "Ej: Si (Fabrica)"

### 4. Generación de DJC

#### Generador de DJC

**Archivo**: `src/components/DJC/DJCGenerator.tsx`

- El checkbox "Generar versión simplificada de DJC" ahora utiliza el campo `codigo_version_simplificada`
- Los datos del fabricante se mantienen en la base de datos completos
- El campo se incluye en los datos de vista previa

#### Servicio de PDF (jsPDF)

**Archivo**: `src/services/djcPdfGenerator.service.ts`

Lógica de visualización:
- **Versión estándar**: Muestra "Fabricante (Nombre y dirección de la planta de producción): [fabricante completo]"
- **Versión simplificada**: Muestra "Fabricante: [codigo_version_simplificada]"
  - Si no hay codigo_version_simplificada, usa el fabricante completo como fallback

#### Servicio de PDF HTML

**Archivo**: `src/services/djcHtmlToPdf.service.ts`

Se aplicó la misma lógica que en djcPdfGenerator.service.ts para mantener consistencia entre ambos métodos de generación.

#### Vista Previa de DJC

**Archivo**: `src/components/DJC/DJCPreview.tsx`

- Se muestra un badge "Versión Simplificada" cuando está activo el modo simplificado
- La información del fabricante se muestra según el modo:
  - Estándar: Campo completo con dirección
  - Simplificada: Solo "Fabricante: [codigo_version_simplificada]"

### 5. TypeScript

**Archivo**: `src/types/upload.types.ts`

Se actualizó la interfaz `Product` para incluir:
```typescript
codigo_version_simplificada?: string;
```

## Flujo de Uso

### Carga de Datos desde Excel

1. El usuario carga un archivo Excel con las columnas:
   - **Columna AE**: Estado de los ensayos (se guarda en el campo `estado`)
   - **Columna AN**: Código de versión simplificada (ej: "Si (Fabrica)")

2. El sistema automáticamente mapea estos valores a los campos correspondientes

### Edición Manual

1. Ir a Gestión de Productos
2. Seleccionar un producto y hacer clic en ver detalles
3. Ir a la pestaña "Fabricación"
4. Editar el campo "Código Versión Simplificada"
5. Guardar los cambios

### Generación de DJC Simplificada

1. Ir al Generador de DJC
2. Seleccionar cliente y producto
3. Activar el checkbox "Generar versión simplificada de DJC"
4. En la vista previa, se mostrará:
   - Badge "Versión Simplificada"
   - Campo Fabricante simplificado con el código de la columna AN
5. El PDF generado tendrá la información simplificada

## Notas Importantes

### Datos en la Base de Datos

- **Los datos completos del fabricante y planta se mantienen siempre en la base de datos**
- Solo cambia la visualización en la DJC cuando se activa el modo simplificado
- Esto permite generar tanto versiones estándar como simplificadas del mismo producto

### Compatibilidad

- Los productos sin `codigo_version_simplificada` pueden seguir generando DJCs estándar
- Si se activa la versión simplificada pero no hay `codigo_version_simplificada`, se usa el fabricante completo como fallback

### Estado de Ensayos

- El campo `estado` ahora refleja el valor de la columna AE (ESTADO ENSAYOS) del Excel
- Este cambio es automático durante la carga de datos
- Los productos existentes mantienen su estado actual hasta que se actualicen

## Verificación

El proyecto se compiló exitosamente sin errores. Puedes verificar la implementación:

1. Ejecuta el SQL de migración en Supabase
2. Carga un archivo Excel con las columnas AE y AN
3. Verifica que los valores se mapeen correctamente
4. Genera una DJC simplificada y verifica que muestre solo el código de versión simplificada

## Archivos Modificados

- `add_codigo_version_simplificada_migration.sql` (NUEVO)
- `src/services/dataMapper.service.ts`
- `src/types/upload.types.ts`
- `src/components/ProductDetailView.tsx`
- `src/components/DJC/DJCGenerator.tsx`
- `src/components/DJC/DJCPreview.tsx`
- `src/services/djcPdfGenerator.service.ts`
- `src/services/djcHtmlToPdf.service.ts`
