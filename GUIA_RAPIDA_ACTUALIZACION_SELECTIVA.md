# Guía Rápida: Sistema de Actualización Selectiva

## Instalación en 3 Pasos

### 1️⃣ Crear Tabla de Auditoría en Supabase

```bash
# Abrir Supabase Dashboard → SQL Editor → New Query
# Copiar y ejecutar el contenido del archivo: CREATE_AUDIT_TABLE.sql
```

### 2️⃣ El sistema ya está listo para usar

Todo el código está implementado y el build se completó exitosamente.

### 3️⃣ Verificar que funciona

Ir a `/data-update` y verás los dos modos disponibles.

---

## Cómo Usar: Modo Rápido

### Modo 1: Completar Vacíos (Como Antes)

1. Ir a **Actualización de Datos**
2. Dejar seleccionado "Solo Completar Vacíos"
3. Subir Excel → Actualizar
4. ✅ Listo

**Qué hace:** Rellena solo campos vacíos, no sobrescribe nada.

---

### Modo 2: Actualización Personalizada (NUEVO)

1. Ir a **Actualización de Datos**
2. Seleccionar **"Actualización Personalizada"**
3. **Elegir campos** a actualizar (usar checkboxes)
4. Si quieres sobrescribir → activar checkbox "Sobrescribir datos existentes"
5. Subir Excel → Confirmar → Actualizar
6. ✅ Ver resultados con desglose de campos

**Qué hace:** Actualiza solo los campos que elijas, con opción de sobrescribir.

---

## Ver Historial de Cambios

1. Ir a **Actualización de Datos**
2. Clic en botón **"Ver Historial"** (arriba a la derecha)
3. Buscar, filtrar, ver detalles
4. Expandir filas para ver cambios antes/después

---

## Ejemplos de Uso

### Ejemplo 1: Actualizar Solo Fabricantes
```
1. Modo: Actualización Personalizada
2. Campos seleccionados: fabricante, planta_fabricacion
3. Sobrescribir: ❌ NO (solo llenar vacíos)
4. Subir Excel con datos de fabricantes
```

### Ejemplo 2: Corregir Fechas Masivamente
```
1. Modo: Actualización Personalizada
2. Campos seleccionados: fecha_emision, vencimiento
3. Sobrescribir: ✅ SÍ (reemplazar datos incorrectos)
4. Confirmar en modal
5. Subir Excel con fechas corregidas
```

### Ejemplo 3: Completar Todo lo Faltante
```
1. Modo: Solo Completar Vacíos
2. Subir Excel con todos los datos
3. Sistema automáticamente rellena campos vacíos
```

---

## Campos Bloqueados (No Se Pueden Modificar)

Por seguridad, estos campos NUNCA se actualizan:
- `codificacion` (identificador único)
- `cuit` (identificador del cliente)
- `uuid` (ID interno)
- `created_at` / `updated_at` (timestamps del sistema)

---

## Atajos Rápidos

### En Selector de Campos:
- **"Seleccionar Todo"** → Selecciona todos los campos disponibles
- **"Deseleccionar Todo"** → Limpia selección
- **Botón por categoría** → Selecciona/deselecciona toda esa categoría

### En Historial:
- **Buscar** → Por codificación o nombre de archivo
- **Filtro** → Por tipo (completar vacíos / sobrescribir)
- **Expandir fila** → Ver detalles de cambios

---

## Resumen de Resultados

Después de actualizar verás:
- ✅ **Actualizados**: Productos modificados
- ⚪ **Sin Cambios**: Productos sin modificaciones
- ⚠️ **No Encontrados**: Codificaciones que no existen en BD
- ❌ **Errores**: Si hubo problemas

**NUEVO:** Desglose por campo mostrando cuántos productos se actualizaron en cada campo.

---

## Consejos Pro

1. **Para actualizaciones seguras**: Usa modo "Solo Completar Vacíos"
2. **Para correcciones**: Usa modo "Actualización Personalizada" con sobrescritura
3. **Selecciona solo lo necesario**: No marques todos los campos si solo necesitas actualizar algunos
4. **Revisa el historial**: Verifica cambios después de operaciones importantes
5. **Nombres descriptivos**: Usa nombres de archivo Excel descriptivos (se guardan en auditoría)

---

## Si Algo Sale Mal

### No aparece el selector de campos
→ Asegúrate de haber seleccionado "Actualización Personalizada"

### Error al guardar auditoría
→ Ejecuta el script SQL `CREATE_AUDIT_TABLE.sql`

### Campos no se actualizan
→ Verifica que estén seleccionados en el selector de campos

---

## Documentación Completa

Ver `SISTEMA_ACTUALIZACION_SELECTIVA.md` para detalles técnicos completos.

---

**¡Listo para usar!** 🚀
