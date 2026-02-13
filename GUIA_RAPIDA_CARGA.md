# Guía Rápida: Sistema de Carga de Datos

## 🚀 Inicio Rápido

### Paso 1: Acceder
- Ir a **"Carga de Datos"** en el sidebar
- O navegar a `/data-upload`

### Paso 2: Subir Excel
- Clic en "Seleccionar archivo Excel"
- Elegir archivo `.xlsx`, `.xls` o `.csv`
- Clic en "Analizar y Validar Datos"

### Paso 3: Revisar y Aprobar
- Ver estadísticas: nuevos vs actualizaciones
- Revisar advertencias (datos faltantes)
- Aprobar/rechazar cada item o usar "Aprobar Todos"
- Ver before/after de cambios

### Paso 4: Aplicar
- Clic en "Aplicar Cambios"
- Esperar a que complete (con progress bar)
- Ver resumen final

## 📋 Preparar tu Excel

### Columnas Requeridas para Clientes
- **CUIT** (obligatorio) - Puede ser: `CUIT`, `Nro. CUIT`, `Nro CUIT`
- **Razón Social** (obligatorio) - Puede ser: `Razón Social`, `Titular`, `Empresa`
- **Email** (recomendado) - Puede ser: `Email`, `E-mail`, `Correo`
- **Dirección** (recomendado) - Puede ser: `Dirección`, `Domicilio`
- **Teléfono** (opcional) - Puede ser: `Teléfono`, `Tel`, `Celular`

### Columnas Requeridas para Productos
- **Codificación** (obligatorio) - Puede ser: `Codificación`, `Código`, `Nro Certificado`
- **CUIT** (obligatorio) - Debe existir en clientes
- **Producto** (recomendado) - Puede ser: `Producto`, `Descripción`
- **Marca** (recomendado)
- **Modelo** (recomendado)
- **Estado** (recomendado) - Ejemplo: `VIGENTE`, `VENCIDO`

### Formato de Datos
- **CUIT:** 10-11 dígitos (sin guiones, o con guiones automáticamente se limpian)
  - ✅ Correcto: `30123456789` o `30-12345678-9`
  - ❌ Incorrecto: `ABC123` o `123`

- **Fechas:** Usar formato de Excel o `YYYY-MM-DD`
  - ✅ Correcto: `2025-10-02` o fecha de Excel
  - ❌ Incorrecto: `02/10/25` (puede causar confusión)

## ⚠️ Datos Faltantes

Si falta **email** o **dirección**:
- Se completa automáticamente con `"No encontrado"`
- Se genera advertencia
- **NO bloquea** el proceso
- Puedes completar después en "Gestión de Clientes"

## 🔒 Campos Protegidos

Al actualizar productos existentes, estos campos **NO se sobrescriben**:
- Rutas de QR y certificados
- Estado de QR/DJC/Certificado
- Configuración de QR
- Fecha de generación de QR

**Razón:** Proteger documentos ya generados

## ✅ Buenas Prácticas

### Antes de Cargar
1. ✅ Verificar CUITs sin espacios extra
2. ✅ Revisar que todas las columnas tengan encabezados
3. ✅ Eliminar filas vacías al final
4. ✅ Guardar como `.xlsx` (más compatible)

### Durante la Carga
1. ✅ Leer todas las advertencias
2. ✅ Revisar before/after de actualizaciones
3. ✅ Aprobar solo lo que estás seguro
4. ✅ Si hay dudas, rechazar y corregir Excel

### Después de Cargar
1. ✅ Anotar el Batch ID para referencia
2. ✅ Verificar en "Gestión de Clientes/Productos"
3. ✅ Completar datos faltantes si hay
4. ✅ El backup se guarda automáticamente

## 🆘 Problemas Comunes

### "CUIT duplicado en el archivo"
**Problema:** El mismo CUIT aparece 2+ veces en tu Excel
**Solución:** Eliminar duplicados del Excel antes de subir

### "Codificación duplicada en el archivo"
**Problema:** La misma codificación aparece 2+ veces
**Solución:** Eliminar duplicados del Excel antes de subir

### "CUIT no existe en clientes"
**Problema:** Producto con CUIT que no está en la lista de clientes
**Solución:** Agregar el cliente primero o incluirlo en el mismo Excel

### Datos se completaron con "No encontrado"
**Problema:** Faltan email o dirección en Excel
**Solución:** Ir a "Gestión de Clientes" y completar manualmente después

## 📊 Ver Historial

```sql
-- Ver últimas 10 cargas
SELECT filename, status, new_records, updated_records, uploaded_at
FROM upload_batches
ORDER BY uploaded_at DESC
LIMIT 10;
```

## 🔄 Restaurar desde Backup

Si necesitas deshacer una carga:

1. Obtener Backup ID del resultado de la carga
2. Contactar al administrador del sistema
3. Se restaurarán los datos desde el snapshot

**Importante:** El backup solo contiene registros que se **actualizaron**, no los nuevos.

## 💡 Tips

- **Archivos grandes:** El sistema procesa en batches automáticamente
- **Progress bar:** Muestra estado en tiempo real
- **Aprobación granular:** Puedes aprobar solo algunos registros
- **Audit trail:** Todas las operaciones se registran
- **Errores no bloquean:** Si falla 1 registro, continúa con los demás

## 📞 Soporte

Si tienes problemas:
1. Revisar advertencias en paso de validación
2. Consultar esta guía
3. Ver `SISTEMA_CARGA_SIMPLIFICADO.md` para detalles técnicos
4. Contactar al administrador con el Batch ID

---

**¡Listo para usar!** El sistema está optimizado para ser simple y seguro.
