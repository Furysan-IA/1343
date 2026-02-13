# Guía Rápida: Aplicar Migración de Columnas QR

## Problema
La aplicación está intentando acceder a columnas que no existen en la tabla `products`:
- `qr_status`
- `qr_generated_at`
- `qr_config`

Esto causa un error 400 al intentar vincular QR compartidos.

## Solución

### Paso 1: Abrir el Editor SQL de Supabase
Accede a tu proyecto en Supabase:
https://supabase.com/dashboard/project/gmwwvowphjxmertcedtt/sql/new

### Paso 2: Copiar y Ejecutar el SQL
Abre el archivo `apply-qr-columns-migration.sql` que se encuentra en la raíz del proyecto, copia todo su contenido y pégalo en el editor SQL de Supabase.

### Paso 3: Ejecutar la Migración
Haz clic en el botón "Run" o presiona Ctrl+Enter (Cmd+Enter en Mac) para ejecutar el SQL.

### Paso 4: Verificar
Deberías ver mensajes de confirmación indicando que las columnas fueron agregadas exitosamente.

## ¿Qué hace esta migración?

### Columnas Agregadas:
1. **qr_status** (TEXT)
   - Estado del código QR: 'pending', 'generated', 'shared'
   - Valor por defecto: 'pending'

2. **qr_generated_at** (TIMESTAMPTZ)
   - Fecha y hora de generación del QR
   - Permite NULL

3. **qr_config** (JSONB)
   - Configuración del QR (tamaño, color, formato)
   - Almacena datos en formato JSON
   - Permite NULL

### Actualizaciones Automáticas:
- Productos existentes sin QR → qr_status = 'pending'
- Productos existentes con QR → qr_status = 'generated'
- Índice creado en qr_status para mejor rendimiento

## Después de Aplicar la Migración
Una vez aplicada la migración, la funcionalidad de QR compartido funcionará correctamente sin errores.
