# Instrucciones: Crear Tabla de Auditoría

## ⚠️ IMPORTANTE: Paso Obligatorio Antes de Usar el Sistema

El sistema de actualización selectiva requiere una tabla de auditoría en la base de datos. Sigue estos pasos:

---

## Paso 1: Abrir Supabase Dashboard

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto

---

## Paso 2: Ir al SQL Editor

1. En el menú lateral izquierdo, busca **"SQL Editor"**
2. Haz clic en él
3. Clic en **"New Query"** (botón verde)

---

## Paso 3: Copiar y Ejecutar el Script

1. Abre el archivo `CREATE_AUDIT_TABLE.sql` en este proyecto
2. **Copia TODO el contenido** del archivo
3. **Pega** el contenido en el SQL Editor de Supabase
4. Haz clic en **"Run"** (botón verde en la esquina inferior derecha)

---

## Paso 4: Verificar que Funcionó

Deberías ver un mensaje como:

```
status: "Tabla product_update_audit_log creada exitosamente"
total_registros: 0
```

Si ves esto, ✅ **¡Listo! La tabla está creada.**

---

## Qué Hace Este Script

El script crea:

1. **Tabla `product_update_audit_log`**
   - Almacena todos los cambios realizados a productos
   - Registra qué campos se modificaron
   - Guarda valores antiguos y nuevos
   - Rastrea quién hizo el cambio y cuándo

2. **Políticas de Seguridad (RLS)**
   - Solo usuarios autenticados pueden ver/crear registros
   - Se registra automáticamente el usuario que hace cambios

3. **Índices de Performance**
   - Búsquedas rápidas por codificación
   - Ordenamiento eficiente por fecha
   - Filtrado optimizado por tipo de actualización

---

## Si Ya Ejecutaste el Script Antes

No hay problema, el script usa `CREATE TABLE IF NOT EXISTS`, así que:
- ✅ Si la tabla ya existe, no hace nada
- ✅ Si no existe, la crea
- ✅ Es seguro ejecutarlo múltiples veces

---

## Verificar que la Tabla Existe

Puedes verificar ejecutando este query en el SQL Editor:

```sql
SELECT * FROM product_update_audit_log LIMIT 5;
```

Debería retornar una tabla vacía (0 filas) sin errores.

---

## Solución de Problemas

### Error: "relation already exists"
✅ **Esto es normal**, significa que la tabla ya existe. Ignora este error.

### Error: "permission denied"
❌ Tu usuario no tiene permisos suficientes. Contacta al administrador del proyecto Supabase.

### Error: "syntax error"
❌ Asegúrate de copiar TODO el contenido del archivo `CREATE_AUDIT_TABLE.sql` sin modificaciones.

---

## Una Vez Creada la Tabla

🎉 **Ya puedes usar el sistema de actualización selectiva**

- Ir a `/data-update`
- Seleccionar modo "Actualización Personalizada"
- Elegir campos y actualizar
- Ver historial en `/audit-history`

---

## Contacto y Soporte

Si tienes problemas ejecutando el script:

1. Verifica que estás usando el proyecto Supabase correcto
2. Verifica que tu usuario tiene permisos de administrador
3. Revisa los logs en Supabase Dashboard > Database > Logs

---

**Tiempo estimado:** 2 minutos ⏱️

**Dificultad:** Fácil ⭐
