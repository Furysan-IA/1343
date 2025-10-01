# Cómo Usar el Sistema de Carga de Certificados

## Ubicación en la Aplicación

### En el Menú Lateral (Sidebar)

Busca la opción llamada:
- **Español:** "Carga de Certificados"
- **English:** "Certificate Upload"

Es el **cuarto item** del menú, identificado con el ícono de carga ⬆️

### Ruta URL

```
http://tu-dominio.com/client-validation
```

## Pasos para Usar el Sistema

### Paso 1: Acceder al Sistema

1. Inicia sesión en la aplicación
2. En el menú lateral izquierdo, haz clic en **"Carga de Certificados"**
3. Verás la pantalla de carga con el área de arrastre

### Paso 2: Cargar el Archivo

**Opción A - Arrastrar y Soltar:**
1. Arrastra tu archivo Excel/CSV desde tu explorador de archivos
2. Suéltalo en el área marcada

**Opción B - Seleccionar Archivo:**
1. Haz clic en el botón "Seleccionar Archivo"
2. Busca y selecciona tu archivo de certificados
3. Haz clic en "Abrir"

**Formatos aceptados:**
- Excel: `.xlsx`, `.xls`
- CSV: `.csv`
- Tamaño máximo: 50 MB
- Registros máximos: 10,000

### Paso 3: Procesar el Archivo

1. Una vez seleccionado, haz clic en **"Procesar Certificados"**
2. El sistema parseará el archivo y extraerá automáticamente:
   - Datos de clientes (CUIT, razón social, email, etc.)
   - Datos de productos (codificación, titular, tipo certificación, etc.)

### Paso 4: Filtrar por Fecha

1. Verás una pantalla con filtro de fecha
2. Selecciona la fecha de referencia:
   - **Últimos 7 días**: Solo certificados de la última semana
   - **Últimos 30 días**: Solo del último mes
   - **Últimos 90 días**: Solo del último trimestre
   - **Todos**: Procesar todos los certificados
   - O selecciona una fecha personalizada

3. Verás una vista previa con estadísticas:
   - Total de certificados encontrados
   - Certificados a procesar (después del filtro)
   - Registros completos
   - Clientes nuevos detectados
   - Registros que necesitan completar información

4. Haz clic en **"Continuar"**

### Paso 5: Revisar el Análisis

Verás una pantalla con 6 categorías de certificados:

#### 📊 Estadísticas Principales

**🟢 Insertar Ambos**
- Cantidad de certificados que agregarán clientes Y productos nuevos
- Acción: Se insertarán automáticamente

**🔵 Actualizar Ambos**
- Certificados que actualizarán clientes y productos existentes
- Solo si la fecha del certificado es más reciente
- Acción: Se actualizarán automáticamente

**🟣 Mixtos**
- Certificados que insertarán uno y actualizarán el otro
- Ejemplo: Cliente nuevo + Producto existente
- Acción: Operación combinada automática

**🟡 Necesitan Completar**
- Clientes nuevos que NO tienen todos los datos obligatorios
- Acción: Se marcarán para completar manualmente después

**⚪ Omitir**
- Certificados más antiguos que los datos en la base de datos
- Acción: Se omitirán (no sobrescribir datos más nuevos)

**🔷 Total a Procesar**
- Suma de todos los que se procesarán automáticamente

#### 👥 Lista de Clientes Nuevos

Si hay clientes nuevos, verás una tabla con:
- **CUIT**: Identificador del cliente
- **Razón Social**: Nombre de la empresa
- **Estado**:
  - ✅ "Completo" = Tiene todos los datos
  - ⚠️ "Necesita completar" = Faltan datos
- **Campos Faltantes**: Lista de qué información falta

**Funciones de la lista:**
- Ver todos los clientes nuevos
- Paginación (10 por página)
- Botón "Ocultar/Ver Lista" para mostrar u ocultar

### Paso 6: Procesar

1. Revisa toda la información
2. Lee la sección "¿Qué va a suceder?" para entender las acciones
3. Haz clic en **"Procesar Certificados"**
4. El sistema procesará automáticamente:
   - Insertará nuevos clientes y productos
   - Actualizará registros existentes
   - Marcará los que necesitan completar

### Paso 7: Confirmación

Verás una pantalla de éxito:
- ✅ Certificados procesados
- Resumen de operaciones realizadas
- Los datos se actualizaron en ambas tablas

### Paso 8: Completar Clientes Nuevos (Si Aplica)

Si hubo clientes marcados como "Necesita completar":

1. Ve al menú **"Gestión de Clientes"**
2. Busca los clientes nuevos (filtra por fecha reciente)
3. Edita cada uno para completar:
   - Dirección (si falta)
   - Email (si falta)
   - Teléfono (si falta)
   - Contacto (si falta)
4. Guarda los cambios

## Estructura del Archivo Excel/CSV

### Columna Obligatoria

```
fecha_emision
```
Formato: Fecha (cualquier formato Excel o YYYY-MM-DD)

### Columnas de Cliente (Opcionales)

```
cuit                (identificador único)
razon_social        (nombre de la empresa)
direccion           (dirección física)
email               (correo electrónico)
telefono            (número de teléfono)
contacto            (persona de contacto)
```

### Columnas de Producto (Opcionales)

```
codificacion            (identificador único)
titular_responsable     (nombre del titular)
tipo_certificacion      (tipo del certificado)
fecha_vencimiento       (fecha de expiración)
```

### Ejemplo de Archivo

```
| fecha_emision | cuit         | razon_social | email          | codificacion | titular_responsable |
|---------------|--------------|--------------|----------------|--------------|---------------------|
| 2025-10-01    | 20123456789  | ACME Corp    | info@acme.com  | ABC-001      | John Doe            |
| 2025-10-01    | 30987654321  | Tech SA      | tech@tech.com  | XYZ-002      | Jane Smith          |
| 2025-09-28    | 40555666777  | New Company  | new@company.ar | DEF-003      | Bob Johnson         |
```

## Preguntas Frecuentes

### ¿Qué pasa si cargo el mismo certificado dos veces?

El sistema compara las fechas:
- Si el nuevo certificado es más reciente → **Actualiza**
- Si el certificado existente es más reciente → **Omite**

### ¿Puedo cargar solo datos de clientes o solo productos?

Sí, el sistema es flexible:
- Si un certificado solo tiene datos de cliente → Solo actualiza clientes
- Si solo tiene datos de producto → Solo actualiza productos
- Si tiene ambos → Actualiza ambas tablas

### ¿Qué pasa con los clientes nuevos incompletos?

- Se marcan pero NO se insertan automáticamente
- Aparecen en la lista de "Necesitan Completar"
- Debes completarlos manualmente después en Gestión de Clientes

### ¿Puedo deshacer el procesamiento?

No directamente desde esta pantalla. Pero:
- Todas las operaciones quedan registradas en `upload_batches`
- Puedes ver el historial en la base de datos
- Puedes editar manualmente cualquier registro en las pantallas de gestión

### ¿Qué columnas son realmente obligatorias?

**Absolutamente obligatoria:**
- `fecha_emision`

**Para insertar un cliente nuevo (todas obligatorias):**
- `cuit`
- `razon_social`
- `direccion`
- `email`
- `telefono`
- `contacto`

**Para insertar un producto nuevo (todas obligatorias):**
- `codificacion`
- `titular_responsable`
- `tipo_certificacion`

Si faltan columnas de cliente o producto, el sistema igual procesa lo que puede.

### ¿Cómo sé qué certificados se procesaron?

La base de datos guarda:
- Tabla `upload_batches`: Información del lote
- Tabla `clients`: Clientes actualizados (campo `updated_at`)
- Tabla `products`: Productos actualizados (campo `updated_at`)

## Solución de Problemas

### Error: "El archivo debe contener la columna 'fecha_emision'"

**Problema:** Falta la columna obligatoria
**Solución:** Asegúrate que tu Excel tenga una columna llamada exactamente `fecha_emision` (sin mayúsculas, con guión bajo)

### Error: "Formato de archivo inválido"

**Problema:** El archivo no es Excel o CSV
**Solución:** Guarda tu archivo como `.xlsx`, `.xls` o `.csv`

### Advertencia: "X clientes necesitan completar información"

**No es un error:** Algunos clientes nuevos no tienen todos los datos
**Acción:** Anota cuáles son y complétalos después en Gestión de Clientes

### El sistema dice "0 certificados a procesar"

**Problema:** Todos los certificados son más antiguos que la fecha seleccionada
**Solución:** Ajusta el filtro de fecha o selecciona "Todos"

### Algunos registros aparecen como "Omitir"

**No es un problema:** Es el comportamiento correcto
**Explicación:** Ya tienes datos más recientes en la base de datos

## Mejores Prácticas

1. **Carga Incremental**
   - Usa el filtro de fecha para cargar solo certificados nuevos
   - Ejemplo: Cada semana, filtra por "Últimos 7 días"

2. **Revisión Previa**
   - Siempre revisa las estadísticas antes de procesar
   - Presta atención a la cantidad de "Necesitan Completar"

3. **Backup**
   - Guarda una copia del archivo antes de cargar
   - Por si necesitas verificar datos después

4. **Clientes Nuevos**
   - Completa su información lo antes posible
   - Mantén una lista de los que faltan

5. **Frecuencia**
   - Carga certificados regularmente (semanal o mensual)
   - No dejes que se acumulen miles de certificados

## Resumen Rápido

1. **Menú → "Carga de Certificados"**
2. **Arrastra/Selecciona archivo Excel**
3. **Procesar**
4. **Selecciona filtro de fecha**
5. **Revisa análisis y lista de clientes nuevos**
6. **Procesar Certificados**
7. **Completa clientes nuevos si es necesario**

¡Listo! Tus certificados están en el sistema.

---

**Ruta URL:** `/client-validation`
**Icono en Sidebar:** ⬆️ Upload
**Posición en Menú:** 4to item

