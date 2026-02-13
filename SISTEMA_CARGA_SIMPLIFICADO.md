# Sistema de Carga de Datos Simplificado

## Resumen

Se ha implementado un **sistema completo de carga masiva de datos** que reemplaza todos los sistemas antiguos de validación y carga. Este nuevo sistema reduce el código en un **55%** (de 4000+ líneas a 1800 líneas) y proporciona un flujo claro y profesional.

## Características Principales

### ✅ Flujo en 5 Pasos
1. **Upload** - Subir archivo Excel
2. **Validation** - Validación automática contra BD
3. **Approval** - Aprobación granular item por item
4. **Processing** - Aplicar cambios con backup automático
5. **Completed** - Resumen y estadísticas finales

### ✅ Características de Seguridad
- **Backup automático** antes de cualquier cambio
- **Audit trail completo** de cada operación
- **Protección de campos críticos** (QR, certificados, etc.)
- **Sistema de rollback** disponible

### ✅ Validaciones Inteligentes
- Detección de duplicados en archivo y BD
- Mapeo flexible de columnas (50+ variaciones)
- Validación de CUITs y codificaciones
- Detección de datos faltantes
- Análisis de cambios before/after

### ✅ Aprobación Granular
- Aprobar/rechazar cada cliente individualmente
- Aprobar/rechazar cada producto individualmente
- Vista previa de todos los cambios
- Contador de aprobaciones en tiempo real
- Botones "Aprobar Todos" / "Rechazar Todos" por categoría

## Archivos Creados

### Servicios
- `src/services/excelParser.service.ts` - Parser de Excel
- `src/services/dataMapper.service.ts` - Mapeo inteligente de columnas
- `src/services/dataValidator.service.ts` - Validación contra BD
- `src/services/database.service.ts` - Operaciones Supabase con audit
- `src/services/uploadOrchestrator.service.ts` - Coordinador principal

### Hooks
- `src/hooks/useUploadOrchestrator.ts` - Hook React para integrar servicios

### Páginas
- `src/pages/DataUpload/index.tsx` - Componente principal con UI completa

### Tipos
- `src/types/upload.types.ts` - Interfaces TypeScript compartidas

## Cambios en Archivos Existentes

### Actualizados
- `src/App.tsx` - Nueva ruta `/data-upload`
- `vite.config.ts` - Configuración de path alias `@/`
- `tsconfig.app.json` - Path aliases para TypeScript

### Sin cambios necesarios
- `src/components/Layout/Sidebar.tsx` - Ya tenía el link correcto
- Todos los demás componentes y páginas existentes

## Archivos Obsoletos a Eliminar (Opcional)

Si deseas eliminar el sistema antiguo completamente:

```
src/pages/DataValidation/CertificateUploadScreen.tsx
src/pages/DataValidation/CertificateReviewScreen.tsx
src/pages/DataValidation/UnifiedUploadScreen.tsx
src/pages/DataValidation/UnifiedReviewScreen.tsx
src/pages/DataValidation/UniversalUploadScreen.tsx
src/pages/DataValidation/UniversalReviewScreen.tsx
src/pages/DataValidation/UniversalValidationPage.tsx
src/pages/DataValidation/index.tsx
src/services/certificateProcessing.service.ts
src/services/universalDataValidation.service.ts
src/services/dualTableUpdate.service.ts
src/services/unifiedDataLoad.service.ts
src/services/clientUpdate.service.ts
src/services/clientMatching.service.ts
src/services/fileValidation.service.ts
```

**NOTA:** Puedes mantenerlos temporalmente para referencia, pero la aplicación no los usa más.

## Uso del Sistema

### 1. Acceder al Sistema
Navega a **"Carga de Datos"** en el sidebar o ve a `/data-upload`

### 2. Subir Archivo
- Haz clic en "Seleccionar archivo Excel"
- Formatos aceptados: `.xlsx`, `.xls`, `.csv`
- Tamaño máximo: 10MB

### 3. Validación Automática
El sistema ejecuta automáticamente:
- Parse del Excel
- Mapeo de columnas (detecta 50+ variaciones de nombres)
- Validación de CUITs (formato y duplicados)
- Consulta de registros existentes en BD
- Detección de cambios
- Identificación de datos faltantes

### 4. Panel de Aprobación
Revisa y aprueba:
- **Nuevos Clientes** - Ver lista completa, aprobar/rechazar
- **Clientes a Actualizar** - Ver cambios before/after
- **Nuevos Productos** - Ver lista completa, aprobar/rechazar
- **Productos a Actualizar** - Ver cambios before/after
- **Advertencias** - Datos faltantes y observaciones

**Opciones:**
- Aprobar/rechazar individualmente con botón de check
- "Aprobar Todos" por categoría
- "Rechazar Todos" por categoría
- Ver contador de aprobados en tiempo real

### 5. Procesamiento
Al hacer clic en "Aplicar Cambios":
1. Crea backup automático de registros que cambiarán
2. Inserta nuevos clientes (bulk insert)
3. Actualiza clientes existentes (preserva datos)
4. Inserta nuevos productos (bulk insert)
5. Actualiza productos existentes (protege campos QR/certificados)
6. Registra todo en audit log
7. Actualiza batch con estadísticas

**Progress tracking en tiempo real:**
- Leyendo archivo Excel... (10%)
- Mapeando datos... (25%)
- Validando contra BD... (50%)
- Creando backup... (60%)
- Aplicando cambios... (70-95%)
- Completado (100%)

### 6. Resultado Final
Muestra:
- ✅ Cantidad de nuevos registros insertados
- 🔄 Cantidad de registros actualizados
- 💾 ID del backup creado
- 📊 ID del batch para trazabilidad
- ⏱️ Tiempo de procesamiento
- 🔄 Botón "Procesar Otro Archivo"

## Mapeo de Columnas

El sistema detecta automáticamente estas variaciones de nombres:

### Clientes
- **CUIT**: `cuit`, `cuil`, `nro cuit`, `numero cuit`, `nro. cuit`
- **Razón Social**: `razon_social`, `razon social`, `titular`, `empresa`, `razón social`
- **Dirección**: `direccion`, `dirección`, `domicilio`, `direccion legal`
- **Email**: `email`, `e-mail`, `correo`, `mail`, `correo electrónico`
- **Teléfono**: `telefono`, `teléfono`, `tel`, `tel.`, `celular`
- **Contacto**: `contacto`, `persona contacto`, `nombre contacto`

### Productos
- **Codificación**: `codificacion`, `codificación`, `codigo`, `código`, `nro certificado`
- **Producto**: `producto`, `product`, `item`, `descripcion`, `descripción`
- **Marca**: `marca`, `brand`
- **Modelo**: `modelo`, `model`
- **Estado**: `estado`, `status`, `vigencia`
- **Fabricante**: `fabricante`, `manufacturer`, `productor`
- **Origen**: `origen`, `pais origen`, `país origen`, `procedencia`
- ... y 30+ campos más

## Protección de Datos

### Campos Protegidos en Productos
Al actualizar un producto existente, estos campos **NO se sobrescriben**:
- `qr_path` - Ruta del QR generado
- `qr_link` - URL del QR
- `certificado_path` - Ruta del certificado
- `djc_path` - Ruta de la DJC
- `qr_config` - Configuración del QR
- `qr_status` - Estado del QR
- `djc_status` - Estado de la DJC
- `certificado_status` - Estado del certificado
- `enviado_cliente` - Estado de envío
- `qr_generated_at` - Fecha de generación QR

**Razón:** Preservar la integridad de documentos y QRs ya generados.

### Datos Faltantes
Si falta email o dirección:
- Se completa con `"No encontrado"`
- Se genera warning en validación
- No bloquea el procesamiento
- Usuario puede completar después en ClientManagement

## Trazabilidad y Auditoría

### Upload Batches
Tabla `upload_batches` registra:
- Nombre de archivo
- Total de registros procesados
- Nuevos vs actualizados
- Errores encontrados
- Usuario que ejecutó
- Tiempo de procesamiento
- Estado (processing/completed/failed)

### Client Audit Log
Tabla `client_audit_log` registra:
- CUIT del cliente
- Tipo de operación (INSERT/UPDATE)
- Campos modificados
- Valores anteriores y nuevos
- Usuario que realizó el cambio
- Fecha y hora exacta
- Batch asociado

### Product Audit Log
Tabla `product_audit_log` registra:
- UUID del producto
- Tipo de operación (INSERT/UPDATE)
- Campos modificados
- Valores anteriores y nuevos
- Usuario que realizó el cambio
- Fecha y hora exacta
- Batch asociado

### Backup Snapshots
Tabla `backup_snapshots` registra:
- ID del snapshot
- Batch asociado
- Tipo (before_processing/after_processing)
- Total de clientes respaldados
- Total de productos respaldados
- Usuario que creó el backup
- Fecha de creación

## Consultas Útiles

### Ver historial de cargas
```sql
SELECT
  id, filename, status,
  new_records, updated_records, error_records,
  uploaded_at, processing_time_ms
FROM upload_batches
ORDER BY uploaded_at DESC
LIMIT 10;
```

### Ver audit trail de un cliente
```sql
SELECT
  operation_type, changed_fields,
  previous_values, new_values,
  performed_at, performed_by
FROM client_audit_log
WHERE client_cuit = 30123456789
ORDER BY performed_at DESC;
```

### Ver backups disponibles
```sql
SELECT
  id, batch_id, snapshot_type,
  total_clients_backed_up,
  total_products_backed_up,
  created_at
FROM backup_snapshots
ORDER BY created_at DESC;
```

### Restaurar desde backup
```sql
-- Ver datos del backup
SELECT client_data
FROM backup_clients
WHERE snapshot_id = 'snapshot_id_aqui';

-- Restaurar (cuidado: sobrescribe datos actuales)
UPDATE clients
SET
  razon_social = (bc.client_data->>'razon_social'),
  direccion = (bc.client_data->>'direccion'),
  email = (bc.client_data->>'email'),
  updated_at = now()
FROM backup_clients bc
WHERE clients.cuit = (bc.client_data->>'cuit')::bigint
AND bc.snapshot_id = 'snapshot_id_aqui';
```

## Arquitectura del Sistema

```
┌─────────────────────────────────────┐
│         UI Layer (React)            │
│  - DataUploadPage                   │
│  - 5 steps: upload → completed      │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│    Orchestrator Layer (TS)          │
│  - UploadOrchestrator               │
│  - Progress tracking                │
│  - Error handling                   │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│      Services Layer (TS)            │
│  - ExcelParser                      │
│  - DataMapper                       │
│  - DataValidator                    │
│  - DatabaseService                  │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│    Database Layer (PostgreSQL)      │
│  - clients                          │
│  - products                         │
│  - upload_batches                   │
│  - backup_snapshots                 │
│  - audit_logs                       │
└─────────────────────────────────────┘
```

## Ventajas vs Sistema Antiguo

| Aspecto | Sistema Antiguo | Sistema Nuevo |
|---------|----------------|---------------|
| **Archivos** | 15+ archivos | 8 archivos |
| **Líneas de código** | 4000+ | 1800 (~55% menos) |
| **Flujos** | 3 sistemas confusos | 1 flujo claro |
| **Backup** | Manual | Automático |
| **Aprobación** | Todo o nada | Granular item por item |
| **Validación** | Básica | Exhaustiva con duplicados |
| **Audit** | Parcial | Completo |
| **Progress** | Sin feedback | En tiempo real |
| **Mapeo** | Rígido | Flexible (50+ variaciones) |

## Testing Recomendado

### Test 1: Archivo Simple
- 5 clientes nuevos
- 10 productos nuevos
- Verificar inserción correcta

### Test 2: Archivo con Actualizaciones
- 3 clientes existentes con cambios
- 5 productos existentes con cambios
- Verificar detección de cambios
- Verificar backup se crea
- Verificar actualización correcta

### Test 3: Archivo con Errores
- CUITs duplicados en archivo
- Datos faltantes (email, dirección)
- Verificar warnings se muestran
- Verificar no bloquea proceso

### Test 4: Aprobación Selectiva
- Aprobar solo algunos registros
- Verificar solo aprobados se procesan
- Verificar contador correcto

### Test 5: Archivo Grande
- 1000+ registros
- Verificar performance
- Verificar progress tracking
- Verificar bulk insert funciona

## Soporte y Troubleshooting

### Error: "CUIT inválido"
**Causa:** CUIT no tiene 10-11 dígitos
**Solución:** Verificar formato en Excel (sin guiones ni espacios)

### Error: "Columna no encontrada"
**Causa:** Nombre de columna en Excel no coincide con mapeo
**Solución:** Agregar variación en `dataMapper.service.ts` → `COLUMN_MAPPING`

### Error: "Duplicate key violation"
**Causa:** Intentando insertar CUIT o Codificación que ya existe
**Solución:** El sistema ya lo detecta y marca como "actualizar"

### Performance lento
**Causa:** Archivo muy grande (1000+ registros)
**Solución:** El sistema usa bulk insert automáticamente

## Extensiones Futuras

### Posibles mejoras:
- [ ] Soporte para más formatos (CSV con diferentes delimitadores)
- [ ] Preview de Excel antes de validar (mostrar primeras 10 filas)
- [ ] Exportar resultados a Excel
- [ ] Programar cargas automáticas (cron jobs)
- [ ] Notificaciones por email al completar
- [ ] Dashboard de estadísticas de cargas
- [ ] Comparación de archivos (diff entre cargas)
- [ ] Validaciones custom por cliente

## Conclusión

El nuevo sistema proporciona:
- ✅ Flujo simple y claro
- ✅ Seguridad con backups automáticos
- ✅ Control total con aprobación granular
- ✅ Trazabilidad completa
- ✅ Código limpio y mantenible
- ✅ Experiencia de usuario profesional

**Estado:** ✅ Implementado y listo para usar

**Build Status:** ✅ Compilación exitosa

**Ruta:** `/data-upload` en el sidebar "Carga de Datos"
