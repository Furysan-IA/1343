# Sistema de Actualización Selectiva con Auditoría

## Descripción General

Se ha implementado un sistema completo de actualización personalizada de productos que permite a los usuarios seleccionar exactamente qué campos actualizar, con la opción de sobrescribir datos existentes y un sistema de auditoría completo para rastrear todos los cambios.

## Características Principales

### 1. Dos Modos de Actualización

#### Modo 1: Solo Completar Vacíos (Modo Anterior)
- Actualiza únicamente campos que están vacíos (NULL o vacío)
- NO sobrescribe datos existentes
- Procesa todos los campos automáticamente
- Ideal para completar información faltante

#### Modo 2: Actualización Personalizada (NUEVO)
- Permite seleccionar campos específicos a actualizar
- Opción de sobrescribir datos existentes
- Control total sobre qué campos modificar
- Sistema de auditoría completo de cambios

### 2. Selector de Campos Inteligente

El sistema organiza los campos en categorías lógicas:

- **Información General**: titular, tipo_certificacion, estado, dirección_legal_empresa
- **Fabricación**: fabricante, planta_fabricacion, origen, producto, marca, modelo
- **Certificación**: ocp_extranjero, certificados, esquemas
- **Técnico**: características técnicas, normas, informes de ensayo
- **Fechas**: fecha_emision, vencimiento, etc.
- **Rubros**: cod_rubro, cod_subrubro, nombre_subrubro
- **Otros**: motivo_cancelacion, días_para_vencer

**Características del Selector:**
- Checkboxes por campo individual
- Botones de "Seleccionar Todo" y "Deseleccionar Todo"
- Botones por categoría para selección rápida
- Contador de campos seleccionados
- Campos bloqueados (codificacion, cuit, uuid) que no pueden modificarse

### 3. Sistema de Auditoría Completo

Cada actualización genera un registro de auditoría con:
- Producto modificado (codificación y UUID)
- Tipo de actualización (completar vacíos o sobrescribir)
- Lista de campos modificados
- Valores anteriores (before)
- Valores nuevos (after)
- Usuario que realizó el cambio
- Fecha y hora exacta
- Archivo Excel origen
- ID de lote para agrupar operaciones

### 4. Historial de Auditoría

Nueva página `/audit-history` que permite:
- Ver todos los cambios realizados
- Buscar por codificación o archivo
- Filtrar por tipo de actualización
- Ver detalles expandidos de cada cambio
- Comparar valores antiguos vs nuevos
- Exportar reportes de auditoría

### 5. Protección y Seguridad

**Campos Bloqueados:**
Los siguientes campos NUNCA pueden modificarse por seguridad:
- `codificacion` - Identificador único del producto
- `cuit` - Identificador del cliente
- `uuid` - ID interno del sistema
- `created_at` - Fecha de creación
- `updated_at` - Fecha de última modificación (se actualiza automáticamente)

**Confirmación de Sobrescritura:**
- Modal de confirmación obligatorio al activar sobrescritura
- Advertencias visuales destacadas
- Detalles de la operación antes de ejecutar
- Opción de cancelar en cualquier momento

## Instalación y Configuración

### Paso 1: Crear la Tabla de Auditoría

1. Ir a Supabase Dashboard
2. Navegar a SQL Editor
3. Abrir el archivo `CREATE_AUDIT_TABLE.sql`
4. Copiar y ejecutar el script SQL
5. Verificar que la tabla se creó correctamente

### Paso 2: Verificar Permisos

Asegurarse de que los usuarios autenticados tengan permisos para:
- Leer registros de auditoría (SELECT)
- Crear registros de auditoría (INSERT)

## Uso del Sistema

### Actualización Solo Completar Vacíos

1. Ir a "Actualización de Datos"
2. Seleccionar modo "Solo Completar Vacíos"
3. Arrastrar o seleccionar archivo Excel
4. Hacer clic en "Actualizar Productos"
5. Revisar resultados

### Actualización Personalizada

1. Ir a "Actualización de Datos"
2. Seleccionar modo "Actualización Personalizada"
3. Seleccionar campos a actualizar usando los checkboxes
4. Opcionalmente activar "Sobrescribir datos existentes"
5. Arrastrar o seleccionar archivo Excel
6. Si sobrescritura está activada, confirmar en el modal
7. Hacer clic en "Actualizar Productos"
8. Revisar resultados con desglose de campos actualizados

### Ver Historial de Auditoría

1. Ir a "Actualización de Datos"
2. Hacer clic en "Ver Historial"
3. Buscar y filtrar registros
4. Hacer clic en el botón de detalles para expandir
5. Ver comparación de valores antes/después
6. Exportar reportes si es necesario

## Estructura de Archivos Nuevos

```
src/
├── components/
│   ├── FieldSelector.tsx          # Selector de campos con categorías
│   └── ConfirmationModal.tsx      # Modal de confirmación
├── pages/
│   ├── DataUpdate.tsx             # Actualizado con nuevo sistema
│   └── AuditHistory.tsx           # Página de historial de auditoría
└── services/
    ├── audit.service.ts           # Servicio de auditoría
    └── productUpdate.service.ts   # Actualizado con método selectivo
```

## Base de Datos

### Tabla: product_update_audit_log

```sql
- id (uuid) - PK
- product_uuid (uuid) - FK a products
- codificacion (text) - Código del producto
- update_type (text) - 'fill_empty' o 'overwrite'
- fields_updated (jsonb) - Array de campos modificados
- old_values (jsonb) - Valores anteriores
- new_values (jsonb) - Valores nuevos
- updated_by (uuid) - FK a auth.users
- updated_at (timestamptz) - Fecha/hora del cambio
- source_file (text) - Nombre del archivo Excel
- batch_id (uuid) - ID del lote de actualización
- fields_count (integer) - Cantidad de campos actualizados
```

### Índices
- Por codificación (búsquedas rápidas)
- Por fecha (ordenamiento cronológico)
- Por batch_id (operaciones agrupadas)
- Por usuario (actividad por usuario)
- Por tipo de actualización (filtrado)
- GIN en fields_updated (búsquedas en JSONB)

## API de Servicios

### AuditService

```typescript
// Registrar actualización individual
AuditService.logProductUpdate(entry)

// Obtener historial con filtros
AuditService.getAuditHistory({ codificacion, batch_id, from_date, to_date })

// Obtener estadísticas de lote
AuditService.getBatchStats(batchId)

// Obtener historial de un producto
AuditService.getProductHistory(codificacion)

// Generar ID de lote
AuditService.generateBatchId()

// Exportar reporte
AuditService.exportAuditReport(batchId)
```

### ProductUpdateService

```typescript
// Actualización tradicional (solo vacíos)
ProductUpdateService.updateProductsFromExcel(products, onProgress)

// Actualización selectiva (NUEVO)
ProductUpdateService.updateProductsSelective(products, {
  allowedFields: ['campo1', 'campo2'],
  overwriteMode: true,
  sourceFile: 'archivo.xlsx',
  batchId: 'uuid'
}, onProgress)
```

## Estadísticas y Reportes

El sistema proporciona:

### Durante la Actualización
- Progreso en tiempo real
- Productos procesados/total
- Estimación de tiempo

### Después de la Actualización
- Total procesados
- Total actualizados
- Total sin cambios
- Total no encontrados
- Desglose por campo (cuántos productos por campo)
- Lista de errores si los hay

### En Historial de Auditoría
- Filtrado por fechas
- Filtrado por tipo de operación
- Búsqueda por codificación
- Comparación antes/después
- Exportación a Excel

## Flujo de Trabajo Recomendado

### Para Completar Información Faltante
1. Usar modo "Solo Completar Vacíos"
2. No requiere selección de campos
3. Seguro, no sobrescribe datos

### Para Correcciones Masivas
1. Usar modo "Actualización Personalizada"
2. Seleccionar solo campos a corregir
3. Activar "Sobrescribir datos existentes"
4. Confirmar operación
5. Revisar historial de cambios

### Para Auditoría y Compliance
1. Ir a "Ver Historial"
2. Filtrar por fecha o tipo
3. Revisar cambios específicos
4. Exportar reporte para documentación

## Mejores Prácticas

1. **Siempre revisar antes de sobrescribir**
   - Usar filtros para verificar datos actuales
   - Confirmar que el Excel tiene datos correctos

2. **Mantener nombres de archivo descriptivos**
   - Se registran en auditoría para trazabilidad
   - Ejemplo: `actualizacion_fabricantes_2024-02.xlsx`

3. **Usar actualización selectiva para cambios específicos**
   - No seleccionar todos los campos si solo necesitas actualizar algunos
   - Más eficiente y menos riesgoso

4. **Revisar historial regularmente**
   - Detectar patrones de errores
   - Auditoría de compliance

5. **Exportar reportes periódicamente**
   - Documentación de cambios
   - Respaldo de auditoría

## Troubleshooting

### La tabla de auditoría no existe
**Solución:** Ejecutar el script `CREATE_AUDIT_TABLE.sql` en Supabase SQL Editor

### No se guardan registros de auditoría
**Solución:** Verificar que las políticas RLS estén correctamente configuradas y que el usuario esté autenticado

### El selector de campos no aparece
**Solución:** Asegurarse de haber seleccionado el modo "Actualización Personalizada"

### Los campos bloqueados no se deshabilitan
**Solución:** Esto es intencional por seguridad. Los campos críticos nunca pueden modificarse.

## Soporte y Mantenimiento

Para mantener el sistema funcionando óptimamente:

1. **Monitorear tamaño de tabla de auditoría**
   - Implementar limpieza periódica de registros antiguos
   - Archivar logs históricos si es necesario

2. **Revisar índices periódicamente**
   - Analizar queries lentos
   - Optimizar según patrones de uso

3. **Actualizar documentación**
   - Documentar nuevos campos cuando se agreguen
   - Actualizar categorías en FieldSelector si es necesario

## Seguridad y Compliance

El sistema cumple con:
- **Auditoría completa**: Todos los cambios registrados
- **Trazabilidad**: Usuario, fecha, valores antes/después
- **Integridad**: Campos críticos protegidos
- **Autorización**: Solo usuarios autenticados
- **Transparencia**: Historial completo disponible

## Conclusión

El sistema de Actualización Selectiva con Auditoría proporciona:
- **Flexibilidad**: Control total sobre qué actualizar
- **Seguridad**: Protección de campos críticos
- **Trazabilidad**: Historial completo de cambios
- **Eficiencia**: Operaciones por lotes optimizadas
- **Confianza**: Confirmaciones y validaciones

El sistema mantiene compatibilidad con el modo anterior mientras agrega poderosas capacidades nuevas para gestión avanzada de datos.
