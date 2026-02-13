# Sistema de Validación de Datos

Sistema completo para validar y cargar datos masivos de **Clientes** y **Productos** desde archivos Excel/CSV.

## Características Principales

### 1. Carga Universal
- Soporte para Clientes y Productos
- Archivos Excel (.xlsx, .xls) y CSV
- Hasta 50MB y 10,000 registros
- Drag & drop o selección de archivos

### 2. Validación Automática
- Verificación de columnas requeridas
- Validación de tipos de datos
- Detección de duplicados en el archivo
- Mensajes de error detallados por fila

### 3. Detección de Duplicados
- **Clientes**: Busca por CUIT
- **Productos**: Busca por Codificación
- Muestra coincidencias exactas
- Identifica registros nuevos

### 4. Procesamiento Masivo
- Inserción en lotes de 100 registros
- Actualización automática de duplicados
- Selección individual o masiva
- Sistema de progreso en tiempo real

### 5. Auditoría Completa
- Registro de todas las operaciones
- Tablas separadas por entidad:
  - `client_audit_log` para clientes
  - `product_audit_log` para productos
- Tracking de usuario y timestamp
- Historial de cambios (antes/después)

## Estructura de Base de Datos

### Tablas Principales

#### upload_batches
Rastrea todos los lotes de carga:
- `entity_type`: 'client' o 'product'
- `filename`, `file_size`, `total_records`
- `processed_records`, `new_records`, `updated_records`
- `status`: 'processing', 'completed', 'failed'

#### client_audit_log
Auditoría para clientes:
- `client_cuit`: Referencia al cliente
- `operation_type`: INSERT, UPDATE, SKIP
- `changed_fields`, `previous_values`, `new_values`

#### product_audit_log
Auditoría para productos:
- `product_uuid`: Referencia al producto
- Misma estructura que client_audit_log

#### potential_duplicates & product_potential_duplicates
Almacena duplicados detectados para revisión manual

#### undo_stack
Sistema de deshacer (últimas 5 acciones por sesión)

## Formato de Archivos

### Para Clientes
Columnas **obligatorias**:
- `cuit` (número)
- `razon_social` (texto)
- `direccion` (texto)
- `email` (correo electrónico válido)

Columnas opcionales:
- `telefono`
- `contacto`

### Para Productos
Columnas **obligatorias**:
- `codificacion` (texto único)
- `cuit` (número del cliente)
- `producto` (nombre del producto)

Columnas opcionales (pero recomendadas):
- `marca`
- `modelo`
- `titular`
- `tipo_certificacion`
- `estado`
- `fabricante`
- `origen`
- `fecha_emision`
- `vencimiento`
- `normas_aplicacion`
- Y todas las demás columnas de la tabla products

## Uso del Sistema

### Paso 1: Acceso
Navega a `/data-validation` en la aplicación

### Paso 2: Seleccionar Tipo
Elige entre **Clientes** o **Productos**

### Paso 3: Cargar Archivo
- Arrastra el archivo o selecciónalo manualmente
- El sistema valida formato y estructura
- Si hay errores, se muestra un reporte detallado

### Paso 4: Revisión
- Ve los registros nuevos vs existentes
- Selecciona cuáles agregar
- Opciones:
  - Agregar Seleccionados
  - Agregar Todos
  - Seleccionar página actual

### Paso 5: Confirmación
Mensaje de éxito con conteo de registros procesados

## API de Servicios

### universalDataValidation.service.ts

```typescript
// Validar archivo
const validation = validateFile(file);

// Parsear archivo
const data = await parseFile(file);

// Validar datos parseados
const result = validateParsedData(data, 'client' | 'product');

// Crear batch
const batchId = await createBatch(metadata, entityType);

// Detectar duplicados
const { exactMatches, newRecords } = await detectDuplicates(records, entityType);

// Insertar registros
const result = await insertRecords(records, batchId, entityType);

// Actualizar status del batch
await updateBatchStatus(batchId, { status: 'completed' });
```

## Seguridad (RLS)

Todas las tablas tienen **Row Level Security** habilitado:
- Los usuarios solo ven sus propios batches
- Los logs de auditoría son visibles para todos (auditados)
- Las políticas verifican autenticación con `auth.uid()`

## Manejo de Errores

### Códigos de Error

- **FP-001**: Formato de archivo inválido
- **FP-002**: Tamaño de archivo excedido
- **FP-003**: Columnas requeridas faltantes
- **VL-001**: Formato de email inválido
- **VL-002**: Formato de teléfono inválido
- **VL-003**: Duplicado en el archivo
- **VL-004**: Campo requerido faltante

## Límites y Restricciones

- **Tamaño máximo de archivo**: 50 MB
- **Registros máximos**: 10,000 por archivo
- **Inserción en lotes**: 100 registros a la vez
- **Undo stack**: Últimas 5 acciones por sesión

## Ejemplo de Uso Completo

```typescript
// 1. Usuario selecciona tipo (cliente/producto)
// 2. Usuario carga archivo Excel
// 3. Sistema valida estructura
// 4. Sistema parsea datos
// 5. Sistema detecta duplicados
// 6. Usuario revisa nuevos registros
// 7. Usuario selecciona qué agregar
// 8. Sistema inserta en BD
// 9. Sistema registra en audit_log
// 10. Usuario ve confirmación
```

## Notas Técnicas

### Normalización de Headers
Los headers de columnas se normalizan automáticamente:
- Minúsculas
- Espacios → guiones bajos
- Tildes removidas
- Ejemplo: "Razón Social" → "razon_social"

### Manejo de Fechas
- Fechas de Excel se convierten automáticamente
- Formato ISO 8601 para almacenamiento
- Soporta formatos: Date objects, números Excel, strings

### Performance
- Procesamiento asíncrono
- Inserción por chunks (100 registros)
- Índices en campos clave (CUIT, codificación)
- Transacciones para integridad

## Mantenimiento

### Limpieza de Undo Stack
Las acciones de undo se limpian automáticamente después de 24 horas.

### Monitoreo
Consulta las tablas de auditoría para ver:
- Qué usuario cargó qué archivo
- Cuántos registros se procesaron
- Qué cambios se hicieron
- Cuándo ocurrió cada operación

## Próximas Mejoras Sugeridas

1. Export de reportes en PDF
2. Detección de duplicados fuzzy (similares)
3. Validaciones personalizadas por cliente
4. Webhooks para notificaciones
5. Programación de cargas automáticas
6. Soporte para más formatos (JSON, XML)
