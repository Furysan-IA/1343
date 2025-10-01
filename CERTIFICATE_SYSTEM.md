# Sistema de Procesamiento de Certificados - Documentación Completa

## Descripción del Sistema

Este sistema procesa archivos de certificados del organismo certificador y actualiza automáticamente **dos tablas simultáneamente**: `clients` y `products`. La actualización se basa en la **fecha de emisión** del certificado.

## Flujo del Sistema

### 1. Carga de Certificados
El usuario carga un archivo Excel/CSV que contiene certificados del organismo certificador.

**Columna obligatoria:**
- `fecha_emision`: Fecha en que el organismo certificador emitió el certificado

**Datos extraíbles de Clientes:**
- `cuit` (identificador único)
- `razon_social`
- `direccion`
- `email`
- `telefono`
- `contacto`

**Datos extraíbles de Productos:**
- `codificacion` (identificador único)
- `titular_responsable`
- `tipo_certificacion`
- `fecha_vencimiento`

### 2. Extracción Automática
El sistema **NO** pregunta si es cliente o producto. Automáticamente:
1. Lee cada certificado
2. Extrae los datos de cliente (si están presentes)
3. Extrae los datos de producto (si están presentes)
4. Un certificado puede tener ambos, uno solo, o ninguno

### 3. Filtrado por Fecha
El usuario selecciona una fecha de referencia. Solo se procesan certificados con `fecha_emision` **posterior** a esta fecha.

**Opciones rápidas:**
- Últimos 7 días
- Últimos 30 días
- Últimos 90 días
- Todos

### 4. Análisis de Actualización
Para cada certificado, el sistema verifica **simultáneamente**:

#### En tabla `clients`:
- ¿Existe el CUIT?
- ¿La fecha de emisión es más reciente que updated_at?

#### En tabla `products`:
- ¿Existe la codificación?
- ¿La fecha de emisión es más reciente que updated_at?

### 5. Decisiones Automáticas

El sistema clasifica cada certificado en una de estas categorías:

#### **Insertar Ambos**
- Cliente NO existe
- Producto NO existe
- **Acción:** Insertar nuevo cliente Y nuevo producto

#### **Actualizar Ambos**
- Cliente existe Y certificado es más reciente
- Producto existe Y certificado es más reciente
- **Acción:** Actualizar cliente Y actualizar producto

#### **Insertar Cliente, Actualizar Producto**
- Cliente NO existe
- Producto existe Y certificado es más reciente
- **Acción:** Insertar nuevo cliente Y actualizar producto existente

#### **Actualizar Cliente, Insertar Producto**
- Cliente existe Y certificado es más reciente
- Producto NO existe
- **Acción:** Actualizar cliente existente Y insertar nuevo producto

#### **Necesita Completar**
- Cliente es nuevo (NO existe en BD)
- Le faltan campos obligatorios
- **Acción:** Se marca para que el usuario complete la información manualmente después

#### **Omitir**
- Cliente existe pero certificado es más antiguo
- Producto existe pero certificado es más antiguo
- **Acción:** No hacer nada, ya tenemos datos más recientes

## Clientes Nuevos

### Detección
Si un CUIT no existe en la tabla `clients`, es un **cliente nuevo**.

### Validación
El sistema verifica si tiene todos los campos necesarios:
- ✅ Si está completo: Se inserta directamente
- ⚠️ Si falta información: Se marca como "Necesita Completar"

### Lista de Clientes Nuevos
La pantalla de revisión muestra una tabla con:
- CUIT del nuevo cliente
- Razón social
- Estado (Completo / Necesita completar)
- Campos faltantes

**El usuario puede:**
- Ver la lista completa de clientes nuevos
- Identificar cuáles necesitan completar información
- Después del procesamiento, ir manualmente a completar los datos faltantes

## Lógica de Fecha de Emisión

La fecha de emisión es la **autoridad** para decidir si actualizar:

```
IF certificado.fecha_emision > registro_existente.updated_at THEN
  actualizar_registro()
ELSE
  omitir() // Ya tenemos datos más recientes
END IF
```

**Ejemplo:**
- Registro en BD: Cliente XYZ, updated_at = 2025-09-15
- Certificado: Cliente XYZ, fecha_emision = 2025-10-01
- **Resultado:** ✅ ACTUALIZAR (certificado es más reciente)

- Registro en BD: Cliente ABC, updated_at = 2025-10-10
- Certificado: Cliente ABC, fecha_emision = 2025-09-01
- **Resultado:** ❌ OMITIR (BD tiene datos más recientes)

## Pantallas del Sistema

### 1. CertificateUploadScreen
**Funciones:**
- Drag & drop de archivos
- Validación de formato
- Parse del archivo
- Extracción automática de datos
- Filtro por fecha de emisión
- Vista previa de estadísticas

**Estadísticas mostradas:**
- Total de certificados
- Certificados a procesar (después del filtro de fecha)
- Registros completos
- Clientes nuevos detectados
- Registros que necesitan completar información

### 2. CertificateReviewScreen
**Funciones:**
- Muestra análisis completo
- 6 categorías de certificados
- Lista detallada de clientes nuevos
- Paginación de la lista
- Explicación de qué va a suceder
- Procesamiento automático

**Categorías mostradas:**
1. Insertar Ambos (verde)
2. Actualizar Ambos (azul)
3. Mixtos (morado) - Insertar uno, actualizar otro
4. Necesitan Completar (amarillo)
5. Omitir (gris)
6. Total a Procesar (azul oscuro)

**Sección de Clientes Nuevos:**
- Tabla con todos los clientes nuevos
- Estado de cada uno (Completo / Necesita completar)
- Campos faltantes listados
- Paginación (10 por página)
- Botón para ocultar/mostrar lista

### 3. Complete Screen
- Confirmación de procesamiento exitoso
- Resumen de operaciones realizadas
- Botón para procesar más certificados

## Servicios Implementados

### 1. certificateProcessing.service.ts
```typescript
// Parse el archivo y extrae certificados
parseCertificateFile(file: File): Promise<ParsedCertificates>

// Extrae datos de cliente y producto de cada certificado
extractClientAndProductData(record: CertificateRecord): ExtractionResult

// Filtra por fecha de emisión
filterByEmissionDate(extractions: ExtractionResult[], referenceDate: Date)

// Categoriza los resultados
categorizeExtractions(extractions: ExtractionResult[])
```

### 2. dualTableUpdate.service.ts
```typescript
// Verifica si el cliente existe y si necesita actualización
checkClientExists(clientData: any): Promise<ClientMatch>

// Verifica si el producto existe y si necesita actualización
checkProductExists(productData: any): Promise<ProductMatch>

// Analiza un certificado para determinar qué hacer
analyzeCertificateForUpdate(extraction: ExtractionResult): Promise<DualMatchResult>

// Procesa todos los certificados automáticamente
processAllCertificates(analyses: DualMatchResult[]): Promise<ProcessingStats>

// Insertar/actualizar en tablas
insertClient(clientData: any): Promise<boolean>
updateClient(cuit: string, clientData: any): Promise<boolean>
insertProduct(productData: any): Promise<boolean>
updateProduct(codificacion: string, productData: any): Promise<boolean>
```

## Ejemplo Real de Procesamiento

### Archivo cargado: certificados.xlsx (5 registros)

**Registro 1:**
```
fecha_emision: 2025-10-01
cuit: 20123456789
razon_social: ACME Corp
codificacion: ABC-001
titular_responsable: John Doe
```
- Cliente NO existe → **Insertar cliente**
- Producto NO existe → **Insertar producto**
- **Categoría: Insertar Ambos**

**Registro 2:**
```
fecha_emision: 2025-09-15
cuit: 20987654321 (existe en BD, updated_at: 2025-08-01)
codificacion: XYZ-002 (existe en BD, updated_at: 2025-08-01)
```
- Cliente existe, certificado más reciente → **Actualizar cliente**
- Producto existe, certificado más reciente → **Actualizar producto**
- **Categoría: Actualizar Ambos**

**Registro 3:**
```
fecha_emision: 2025-10-01
cuit: 30555666777 (NO existe)
razon_social: Nueva Empresa
// Faltan: direccion, email, telefono
codificacion: DEF-003
```
- Cliente nuevo pero incompleto → **Marcar para completar**
- Producto completo → **Insertar producto**
- **Categoría: Necesita Completar**
- **Aparece en lista de clientes nuevos**

**Registro 4:**
```
fecha_emision: 2025-08-01
cuit: 40111222333 (existe en BD, updated_at: 2025-09-01)
codificacion: GHI-004 (existe en BD, updated_at: 2025-09-01)
```
- Certificado más antiguo que datos en BD
- **Categoría: Omitir**

**Registro 5:**
```
fecha_emision: 2025-10-01
cuit: 50999888777 (existe en BD, updated_at: 2025-08-01)
codificacion: JKL-005 (NO existe)
```
- Cliente existe, certificado más reciente → **Actualizar cliente**
- Producto no existe → **Insertar producto**
- **Categoría: Insertar Cliente, Actualizar Producto (Mixto)**

### Resultado Final:
- **Insertar Ambos:** 1 certificado
- **Actualizar Ambos:** 1 certificado
- **Mixtos:** 1 certificado
- **Necesita Completar:** 1 certificado (Cliente Nuevo)
- **Omitir:** 1 certificado
- **Total a Procesar:** 3 certificados
- **Clientes Nuevos:** 2 (uno completo, uno necesita completar)

### Lista de Clientes Nuevos:
```
| CUIT          | Razón Social   | Estado             | Campos Faltantes              |
|---------------|----------------|--------------------|-------------------------------|
| 20123456789   | ACME Corp      | Completo           | Ninguno                       |
| 30555666777   | Nueva Empresa  | Necesita completar | direccion, email, telefono    |
```

## Flujo de Trabajo del Usuario

1. **Carga archivo** de certificados del organismo
2. **Selecciona fecha** de referencia (ej: últimos 30 días)
3. **Ve vista previa** con estadísticas
4. **Hace clic en "Continuar"**
5. **Revisa el análisis:**
   - Ve cuántos se insertarán
   - Ve cuántos se actualizarán
   - Ve la lista de clientes nuevos
   - Identifica cuáles necesitan completar información
6. **Hace clic en "Procesar Certificados"**
7. **Sistema procesa automáticamente** todo
8. **Ve confirmación** de éxito
9. **Va manualmente** a completar datos de clientes nuevos que lo necesiten

## Ventajas del Sistema

### Automatización Total
- No requiere seleccionar tipo de datos
- Extracción automática de clientes y productos
- Decisiones automáticas basadas en fechas
- Procesamiento en batch

### Inteligencia de Actualización
- Solo actualiza si el certificado es más reciente
- Preserva datos más nuevos
- No sobrescribe con información vieja

### Transparencia
- Usuario ve exactamente qué va a pasar
- Lista clara de clientes nuevos
- Identificación de registros incompletos
- Estadísticas detalladas

### Flexibilidad
- Filtrado por fecha ajustable
- Vista previa antes de procesar
- Clientes nuevos pueden completarse después

## Consideraciones Técnicas

### Performance
- Procesamiento en paralelo con `Promise.all`
- Consultas optimizadas con índices
- Batch processing para inserciones

### Seguridad
- Validación en servidor
- RLS (Row Level Security) en Supabase
- Audit trail completo
- Transacciones atómicas

### Escalabilidad
- Soporta hasta 10,000 certificados
- Paginación en listas largas
- Procesamiento por chunks

---

**Sistema implementado y listo para usar en `/data-validation`**

Build exitoso ✅

