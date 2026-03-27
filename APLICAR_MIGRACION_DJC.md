# 🔧 Guía Rápida: Aplicar Migración de Columnas DJC

## 📋 Problema que Resuelve

Tu aplicación intenta usar 4 columnas en la tabla `djc` que aún no existen en la base de datos:

- ✅ `djc_source` - Distingue DJCs auto-generadas vs. subidas manualmente
- ✅ `djc_version` - Número de versión de la DJC
- ✅ `is_active` - Marca qué versión está actualmente activa
- ✅ `replaced_by` - Enlace a la versión que reemplazó esta DJC

Sin estas columnas, verás errores al:
- Ver el Product Passport (filtra por `is_active = true`)
- Subir DJCs firmadas manualmente
- Generar DJCs automáticamente
- Ver versiones de DJCs

---

## 🚀 Cómo Aplicar la Migración

### Paso 1: Abrir Supabase Dashboard

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. En el menú lateral, haz click en **SQL Editor**

### Paso 2: Ejecutar la Migración

1. Abre el archivo: `apply-djc-columns-migration.sql`
2. Copia **TODO** el contenido del archivo
3. Pégalo en el editor SQL de Supabase
4. Haz click en el botón **"Run"** (o presiona `Ctrl+Enter`)

### Paso 3: Verificar el Resultado

Deberías ver mensajes como:

```
Columna djc_source agregada exitosamente
Columna djc_version agregada exitosamente
Columna is_active agregada exitosamente
Columna replaced_by agregada exitosamente
```

Al final, verás una tabla con las 4 columnas nuevas y sus configuraciones.

---

## ✅ ¿Qué Hace Esta Migración?

### Columnas Agregadas

| Columna | Tipo | Default | Propósito |
|---------|------|---------|-----------|
| `djc_source` | text | `'auto_generated'` | Distingue origen: auto-generada o subida manualmente |
| `djc_version` | integer | `1` | Número de versión (incrementa al reemplazar) |
| `is_active` | boolean | `true` | Marca la versión actualmente activa |
| `replaced_by` | uuid | `null` | UUID de la DJC que reemplazó esta (si aplica) |

### Índices Creados

Para mejorar el rendimiento:
- `idx_djc_codigo_producto_active` - Búsqueda de DJCs activas por producto
- `idx_djc_source` - Filtrado por origen
- `idx_djc_is_active` - Filtrado por estado activo
- `idx_djc_created_at` - Ordenamiento por fecha de creación

### Valores por Defecto

Todos los registros DJC existentes se actualizarán automáticamente con:
- `djc_source = 'auto_generated'`
- `djc_version = 1`
- `is_active = true`
- `replaced_by = null`

---

## 🔒 Seguridad

✅ **Es seguro ejecutar múltiples veces** - Usa `IF NOT EXISTS` para evitar errores si las columnas ya existen

✅ **No elimina datos** - Solo agrega columnas nuevas

✅ **Valores por defecto seguros** - Todos los registros existentes seguirán funcionando

---

## 🧪 Cómo Probar que Funcionó

Después de aplicar la migración, ve a:

1. **SQL Editor** en Supabase
2. Ejecuta este query:

```sql
SELECT djc_source, djc_version, is_active, replaced_by
FROM djc
LIMIT 5;
```

Deberías ver los valores de las nuevas columnas.

---

## 🆘 Troubleshooting

### Error: "column already exists"

✅ **Esto es normal** - La migración ya fue aplicada. Tu sistema ya funciona correctamente.

### Error: "table djc does not exist"

❌ **Problema serio** - La tabla `djc` no existe. Verifica:
1. Que estés en el proyecto correcto de Supabase
2. Que la tabla `djc` haya sido creada previamente

### No veo cambios en mi aplicación

1. Refresca la página de tu aplicación (`Ctrl+F5`)
2. Verifica que estés conectado a la base de datos correcta
3. Revisa la consola del navegador por errores

---

## 📝 Después de Aplicar

Una vez aplicada la migración, tu sistema podrá:

✅ Mostrar badges de "Firmada" en DJCs subidas manualmente
✅ Rastrear versiones cuando se reemplazan DJCs
✅ Filtrar por DJCs activas en el Product Passport
✅ Generar DJCs automáticamente con tracking correcto
✅ Mantener historial de versiones de DJCs

---

## 🎯 Resumen

**Qué hacer:**
1. Copia el contenido de `apply-djc-columns-migration.sql`
2. Pégalo en el SQL Editor de Supabase
3. Click en "Run"
4. ¡Listo!

**Tiempo estimado:** 30 segundos

**Riesgo:** Ninguno (migración segura con IF NOT EXISTS)
