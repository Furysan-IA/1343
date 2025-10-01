# Sistema de Carga de Datos

## 🎯 Ubicación

El nuevo sistema está disponible en el menú principal:

**Menú → "Carga de Datos"** (ícono de base de datos)

Ruta: `/data-upload`

## 📋 Funcionalidad

Este sistema permite cargar y procesar archivos Excel con datos de **Clientes** o **Productos** directamente a la base de datos.

### Características Principales

✅ **Sistema robusto**: NUNCA se reinicia por errores
✅ **Manejo completo de errores**: Mensajes claros y específicos
✅ **Lee TODAS las columnas**: Incluyendo Fecha de Emisión (columna Y)
✅ **Detección automática**: Identifica campos por nombre, no por posición
✅ **Validación exhaustiva**: Verifica estructura antes de procesar
✅ **Logs detallados**: Todo se registra en consola (F12)

## 🔄 Flujo de Trabajo

### Paso 1: Selección de Tipo

1. Abre "Carga de Datos" desde el menú
2. Selecciona el tipo de datos:
   - **Clientes**: Para archivos con información de clientes
   - **Productos**: Para archivos con información de productos

### Paso 2: Carga de Archivo

1. Arrastra tu archivo Excel o haz clic en "Seleccionar Archivo"
2. Formatos aceptados: `.xlsx`, `.xls`, `.csv`
3. Límites:
   - Tamaño máximo: 50 MB
   - Registros máximos: 10,000

### Paso 3: Validación Automática

El sistema valida:

**Para Clientes (Columnas requeridas):**
- `cuit`
- `razon_social`
- `direccion`
- `email`

**Para Productos (Columnas requeridas):**
- `codificacion`
- `cuit`
- `producto`

### Paso 4: Revisión de Datos

- El sistema muestra un resumen de los datos detectados
- Muestra duplicados si los encuentra
- Permite decidir qué hacer con cada registro

### Paso 5: Procesamiento

- Los datos se insertan en la base de datos
- Se crea un registro de auditoría
- Se genera un batch ID para rastreo

## 📊 Columnas Especiales

El sistema reconoce y procesa automáticamente:

### Fechas
- `fecha_emision` (columna Y)
- `fecha_vencimiento`
- `fecha_*` (cualquier columna con "fecha")

### Identificadores
- `cuit` → Se limpia y convierte a número
- `codificacion` → Se mantiene como string
- `cod_*` → Columnas que empiezan con "cod_"

### Normalización de Nombres

El sistema acepta variantes de nombres:
- "Razón Social" = "razon_social" = "razon social"
- "Fecha Emisión" = "fecha_emision" = "fecha emisión"
- Y así con todas las columnas

## ⚠️ Manejo de Errores

### Si el sistema muestra errores:

1. **Lee el mensaje**: Es específico sobre qué falló
2. **Revisa la consola** (F12): Más detalles técnicos
3. **No pánico**: El sistema NO se reinicia
4. **Corrige el archivo**: Según el error indicado
5. **Reintentar**: Puedes volver a cargar sin refrescar

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "Missing required columns" | Falta una columna obligatoria | Agregar columna al Excel |
| "File size exceeds maximum" | Archivo muy grande | Dividir en archivos más pequeños |
| "Invalid file format" | Formato incorrecto | Usar .xlsx o .xls |
| "Duplicate key in file" | Registros duplicados en el mismo archivo | Eliminar duplicados |

## 🔍 Verificación

Después de cargar:

1. Ve a "Gestión de Clientes" o "Gestión de Productos"
2. Busca los registros recién cargados
3. Verifica que los datos sean correctos

## 🆚 Diferencias con Otros Sistemas

| Sistema | Propósito | Ubicación |
|---------|-----------|-----------|
| **Carga de Datos** | Insertar/actualizar clientes y productos | `/data-upload` |
| **Validación de Información** | Solo validar estructura (no procesa) | `/validation` |
| **Carga de Certificados** | Procesar certificados específicos | `/client-validation` |

## 💡 Tips

1. **Siempre revisa la consola** (F12) para ver el progreso
2. **Usa archivos de prueba** primero con pocos registros
3. **Verifica las columnas** antes de cargar
4. **Mantén backups** de tus archivos originales
5. **Consulta los logs** si algo sale mal

## 🐛 Debug

Si algo no funciona:

1. Abre consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Limpia la consola (botón 🚫)
4. Intenta cargar el archivo
5. Copia los errores que aparezcan
6. Los mensajes en rojo son errores, en amarillo son advertencias

## 📞 Soporte

Para ayuda específica, proporciona:
- Nombre del archivo
- Tipo seleccionado (Cliente/Producto)
- Mensaje de error exacto
- Captura de consola (F12)
