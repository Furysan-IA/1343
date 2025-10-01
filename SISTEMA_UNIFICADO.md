# Sistema Unificado de Carga de Datos

## 🎯 Concepto

El sistema procesa **UN SOLO ARCHIVO** que contiene información de **clientes Y productos** juntos.

Cada fila del Excel = 1 Cliente + 1 Producto relacionado

## 📋 Estructura del Archivo Excel

### Columnas Requeridas

#### Datos de Cliente:
- `CUIT` - Identificador único del cliente
- `Razón Social` - Nombre de la empresa
- `Dirección` - Dirección fiscal
- `Email` - Correo electrónico

#### Datos de Producto:
- `Codificación` - Código único del producto
- `Producto` - Nombre del producto
- `Marca` - Marca del producto
- `Modelo` - Modelo específico
- `Fecha de Emisión` - Fecha del certificado
- `Vencimiento` - Fecha de vencimiento

### Ejemplo de Archivo:

```
| CUIT      | Razón Social | Dirección | Email       | Codificación | Producto | Marca | Modelo | Fecha Emisión | Vencimiento |
|-----------|--------------|-----------|-------------|--------------|----------|-------|--------|---------------|-------------|
| 20123456  | Empresa A    | Calle 1   | a@mail.com  | COD-001      | Máquina  | ABC   | X100   | 2025-01-15    | 2026-01-15  |
| 20123456  | Empresa A    | Calle 1   | a@mail.com  | COD-002      | Equipo   | ABC   | X200   | 2025-02-01    | 2026-02-01  |
| 30234567  | Empresa B    | Calle 2   | b@mail.com  | COD-003      | Motor    | XYZ   | M500   | 2025-01-20    | 2026-01-20  |
```

**Nota:** El mismo cliente (mismo CUIT) puede aparecer en múltiples filas si tiene varios productos.

## 🔄 Flujo de Procesamiento

### Paso 1: Parsing del Archivo

El sistema lee el Excel y extrae:

1. **Datos únicos de clientes** (agrupa por CUIT)
2. **Datos individuales de productos** (uno por fila)

```typescript
Archivo: 100 filas
  ↓
Extrae:
  - 15 clientes únicos (por CUIT)
  - 100 productos (todos)
```

### Paso 2: Análisis de Duplicados

El sistema consulta la base de datos para detectar:

**Para Clientes:**
- ✅ **Nuevos**: CUITs que NO existen en la BD
- 🔄 **Existentes**: CUITs que YA existen (se actualizarán)

**Para Productos:**
- ✅ **Nuevos**: Codificaciones que NO existen
- 🔄 **Existentes**: Codificaciones que YA existen (se actualizarán)

### Paso 3: Pantalla de Revisión

Muestra estadísticas:

```
┌─────────────────────────────────────────┐
│ Total Registros: 100                    │
├─────────────────────────────────────────┤
│ CLIENTES:                               │
│  • Nuevos: 5                            │
│  • Actualizar: 10                       │
├─────────────────────────────────────────┤
│ PRODUCTOS:                              │
│  • Nuevos: 80                           │
│  • Actualizar: 20                       │
└─────────────────────────────────────────┘
```

### Paso 4: Procesamiento Automático

Click en "Procesar Todo" ejecuta:

**1. Procesar Clientes PRIMERO:**
```sql
-- Nuevos clientes
INSERT INTO clients (cuit, razon_social, direccion, email)
VALUES (...)

-- Clientes existentes
UPDATE clients 
SET razon_social = ..., direccion = ..., email = ..., updated_at = now()
WHERE cuit = ...
```

**2. Procesar Productos DESPUÉS:**
```sql
-- Nuevos productos (se inserta TODO)
INSERT INTO products (codificacion, cuit, producto, marca, ...)
VALUES (...)

-- Productos existentes (PROTEGE QR y paths)
UPDATE products 
SET producto = ..., marca = ..., modelo = ..., fecha_emision = ..., vencimiento = ...
WHERE codificacion = ...
-- ⚠️ NO SE TOCAN: qr_path, qr_link, certificado_path, djc_path
```

## 🛡️ Protección de Datos

### Campos PROTEGIDOS en Productos Existentes

Estos campos **NUNCA** se modifican en productos que ya existen:

- ❌ `qr_path` - Ruta del QR generado
- ❌ `qr_link` - URL del QR
- ❌ `certificado_path` - Ruta del certificado subido
- ❌ `djc_path` - Ruta de la DJC
- ❌ `qr_config` - Configuración del QR
- ❌ `djc_status` - Estado de la DJC
- ❌ `certificado_status` - Estado del certificado

### Campos ACTUALIZABLES en Productos Existentes

Solo se actualizan datos del **certificado**:

- ✅ `producto` - Nombre del producto
- ✅ `marca` - Marca
- ✅ `modelo` - Modelo
- ✅ `fecha_emision` - Fecha de emisión del certificado
- ✅ `vencimiento` - Fecha de vencimiento
- ✅ `normas_aplicacion` - Normas aplicables
- ✅ `laboratorio` - Laboratorio emisor
- ✅ Y demás campos del certificado...

## 📊 Casos de Uso

### Caso 1: Todo Nuevo

```
Archivo: 50 clientes, 200 productos
Base de datos: Vacía

Resultado:
  ✅ 50 clientes insertados
  ✅ 200 productos insertados
```

### Caso 2: Actualización Completa

```
Archivo: 20 clientes, 100 productos
Base de datos: Ya tiene los 20 clientes y 100 productos

Resultado:
  🔄 20 clientes actualizados (datos de contacto)
  🔄 100 productos actualizados (datos del certificado)
  🛡️ QR y paths protegidos
```

### Caso 3: Mezcla

```
Archivo: 30 clientes, 150 productos
Base de datos: Tiene 10 clientes y 50 productos

Resultado:
  ✅ 20 clientes nuevos insertados
  🔄 10 clientes existentes actualizados
  ✅ 100 productos nuevos insertados
  🔄 50 productos existentes actualizados (sin tocar QR)
```

### Caso 4: Cliente Nuevo con Productos Viejos

```
Archivo: 1 cliente nuevo, 5 productos (3 ya existen)
Base de datos: No tiene el cliente, tiene 3 de los 5 productos

Resultado:
  ✅ 1 cliente insertado
  ✅ 2 productos nuevos insertados
  🔄 3 productos actualizados (sin tocar QR)
```

## 🎬 Flujo Completo Visual

```
Usuario sube Excel
       ↓
[Parsing Automático]
  • Separa clientes vs productos
  • Normaliza datos
  • Valida estructura
       ↓
[Análisis de Duplicados]
  • Consulta clientes en BD
  • Consulta productos en BD
  • Identifica nuevos vs existentes
       ↓
[Pantalla de Revisión]
  • Muestra estadísticas
  • Usuario confirma
       ↓
[Procesamiento]
  • Inserta/actualiza clientes PRIMERO
  • Inserta/actualiza productos DESPUÉS
  • Protege campos críticos
       ↓
[Resultado]
  • Mensaje de éxito
  • Contadores detallados
  • Logs completos
```

## 🔧 Detalles Técnicos

### Orden de Operaciones

**¿Por qué clientes primero?**

```sql
-- products.cuit hace FOREIGN KEY a clients.cuit
-- Si intentas insertar producto sin cliente = ERROR

CREATE TABLE products (
  ...
  cuit BIGINT NOT NULL REFERENCES clients(cuit) ON DELETE CASCADE,
  ...
);
```

Por eso el sistema **SIEMPRE** procesa clientes primero.

### Manejo de Transacciones

Cada operación es independiente:
- Si falla un cliente, continúa con los demás
- Si falla un producto, continúa con los demás
- Al final muestra conteo de éxitos y errores

### Performance

```typescript
// Procesamiento secuencial (por seguridad)
for (cliente of clientes_unicos) {
  await procesar_cliente(cliente);
}

for (producto of productos) {
  await procesar_producto(producto);
}

// No usamos batch insert para tener control granular
// y logs detallados de cada operación
```

## 💡 Mejores Prácticas

### 1. Estructura del Archivo

✅ **CORRECTO:**
```
Una hoja con todas las columnas (cliente + producto)
Cada fila = combinación cliente-producto
```

❌ **INCORRECTO:**
```
Dos hojas separadas (una para clientes, otra para productos)
El sistema no soporta esto
```

### 2. Datos de Clientes Repetidos

✅ **CORRECTO:**
```
CUIT 20123456 | Empresa A | ... | COD-001 | Producto 1
CUIT 20123456 | Empresa A | ... | COD-002 | Producto 2
CUIT 20123456 | Empresa A | ... | COD-003 | Producto 3
```

El sistema detecta automáticamente que es el mismo cliente.

### 3. Fechas

Formatos aceptados:
- Fechas de Excel (números)
- ISO 8601: `2025-01-15`
- Formato español: `15/01/2025`

### 4. CUIT

Se limpia automáticamente:
- `20-12345678-9` → `20123456789`
- `20.123.456.789` → `20123456789`
- Solo se guardan números

## 🐛 Troubleshooting

### Error: "Foreign key violation"

**Causa:** Intentó insertar producto antes que su cliente

**Solución:** El sistema lo hace automáticamente. Si ves este error, reporta el bug.

### Error: "Duplicate key"

**Causa:** Archivo tiene CUITs o codificaciones duplicadas

**Solución:** Revisar Excel, eliminar duplicados internos

### Error: "Missing required field"

**Causa:** Falta columna obligatoria

**Solución:** Agregar columnas:
- Cliente: CUIT, Razón Social, Dirección, Email
- Producto: Codificación, Producto

## 📈 Monitoreo

### Logs en Consola (F12)

```javascript
// Parsing
"Parsed 150 unified records"
"Unique clients: 20"

// Análisis
"Analysis complete: {
  clientsNew: 5,
  clientsExisting: 15,
  productsNew: 100,
  productsExisting: 50
}"

// Procesamiento
"Clients processed. Now processing products..."
"Processing complete: { ... }"
```

### Base de Datos

Tabla `upload_batches` registra:
- Archivo procesado
- Total de registros
- Nuevos vs actualizados
- Errores
- Usuario y timestamp

## ✅ Checklist Pre-Carga

Antes de subir el archivo, verifica:

- [ ] Archivo tiene columnas de cliente (CUIT, razón social, dirección, email)
- [ ] Archivo tiene columnas de producto (codificación, producto)
- [ ] CUITs son numéricos y válidos
- [ ] Codificaciones son únicas por fila
- [ ] Fechas están en formato válido
- [ ] Archivo pesa menos de 50MB
- [ ] Tiene menos de 10,000 registros
- [ ] No hay filas completamente vacías
- [ ] Headers están en la primera fila

## 🚀 Ventajas del Sistema Unificado

✅ **Un solo paso:** Sube un archivo, procesa todo
✅ **Automático:** Separa clientes y productos por ti
✅ **Seguro:** Respeta foreign keys, procesa en orden correcto
✅ **Protegido:** No toca QR ni configuraciones existentes
✅ **Inteligente:** Detecta duplicados automáticamente
✅ **Robusto:** Continúa aunque falle algún registro
✅ **Auditable:** Logs completos de todo el proceso
✅ **Rápido:** Optimizado para lotes grandes

