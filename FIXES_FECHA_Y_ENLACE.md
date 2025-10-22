# Correcciones de Fecha de Emisión y Enlace en DJC

## Resumen

Se han corregido dos problemas críticos en el sistema de generación de DJC:

1. **Problema de fecha**: Las fechas de emisión se mostraban con un día menos debido a conversión de zona horaria
2. **Problema de enlace**: Se agregó logging para rastrear el comportamiento del enlace personalizado

---

## 1. Corrección del Problema de Fecha

### Problema Original
Cuando se leía `fecha_emision` de la base de datos (formato: YYYY-MM-DD), al mostrarla en la DJC aparecía un día anterior. Por ejemplo:
- En BD: `2025-06-15`
- En DJC: `14/06/2025` ❌

### Causa Raíz
JavaScript `new Date()` interpreta fechas ISO como UTC. Cuando se usa `toLocaleDateString('es-AR')`, convierte de UTC a hora local Argentina (UTC-3), resultando en un desplazamiento de 3 horas que puede cambiar el día.

### Solución Implementada
Se creó la función `formatDateWithoutTimezone()` en `src/utils/formatters.ts` que:
- Extrae directamente los componentes año-mes-día del string
- NO crea objetos Date intermedios que apliquen zona horaria
- Soporta formatos 'short' (DD/MM/YYYY) y 'long' (D de MMMM de YYYY)

```typescript
export const formatDateWithoutTimezone = (
  date: string | Date | null | undefined,
  format: 'short' | 'long' = 'short'
): string => {
  // Extrae YYYY-MM-DD directamente del string usando regex
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  
  // Retorna DD/MM/YYYY sin conversión de zona horaria
  return `${day}/${month}/${year}`;
};
```

### Archivos Modificados
1. ✅ `src/utils/formatters.ts` - Nueva función `formatDateWithoutTimezone()`
2. ✅ `src/components/DJC/DJCGenerator.tsx` - Actualizado para usar la nueva función
3. ✅ `src/pages/DJCManagement.tsx` - Actualizado para usar la nueva función
4. ✅ `src/pages/ProductPassport.tsx` - Actualizado para usar la nueva función

### Cambios Específicos

**DJCGenerator.tsx (líneas 307-315)**
```typescript
// ANTES ❌
const fechaEmisionCertificado = selectedProduct.fecha_emision
  ? new Date(selectedProduct.fecha_emision).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  : '-';

// DESPUÉS ✅
const fechaEmisionCertificado = formatDateWithoutTimezone(selectedProduct.fecha_emision, 'short');
```

---

## 2. Verificación del Sistema de Enlaces

### Comportamiento Esperado

El sistema soporta 3 escenarios para el enlace de la DJC:

1. **Link Automático** (checkbox desmarcado)
   - Genera: `https://verificar.argentina.gob.ar/qr/{codificacion}`
   - Se usa por defecto

2. **Link Personalizado con Valor** (checkbox marcado + campo lleno)
   - Usa el valor ingresado por el usuario
   - Ejemplo: `https://cliente.com/verificar/ABC123`

3. **Link Vacío** (checkbox marcado + campo vacío)
   - Guarda string vacío `''`
   - Permite que el cliente complete después

### Lógica del Código

**preparePreview() en DJCGenerator.tsx (líneas 303-305)**
```typescript
const qrLink = useCustomLink
  ? (customLink || '')  // Si checkbox está marcado: usa customLink o '' si está vacío
  : `https://verificar.argentina.gob.ar/qr/${selectedProduct.codificacion}`;  // Si no: genera automático
```

### Logging Agregado

Se agregaron 3 puntos de logging para debugging:

1. **Al preparar vista previa** (línea 307-312)
```typescript
console.log('DJC Link Configuration:', {
  useCustomLink,      // true/false
  customLink,         // valor ingresado o ''
  generatedLink: qrLink,  // resultado final
  productCode: selectedProduct.codificacion
});
```

2. **Al generar PDF** (línea 379)
```typescript
console.log('Generating DJC PDF with link:', previewData.enlace_declaracion);
```

3. **Al guardar en BD** (línea 406)
```typescript
console.log('Saving DJC to database with link:', previewData.enlace_declaracion);
```

### Verificación en Base de Datos

El valor se guarda en la tabla `djc` columna `enlace_declaracion`:
```typescript
enlace_declaracion: previewData.enlace_declaracion || '',
```

El operador `|| ''` asegura que nunca se guarde `null` o `undefined`, sino siempre un string (aunque sea vacío).

### Manejo en PDF

El generador de PDF (`djcPdfGenerator.service.ts`) maneja correctamente los enlaces vacíos:
- Usa el parámetro `allowEmpty: true` en la fila del enlace
- Si el enlace está vacío, muestra un espacio en blanco (no muestra "VACIO")

```typescript
this.addTableRow('Enlace a la copia de la declaración...', 
                 djcData.enlace_declaracion, 
                 true,   // isGray
                 true);  // allowEmpty ✅
```

---

## Casos de Prueba

### Pruebas de Fecha

1. ✅ Producto con `fecha_emision` = "2025-06-15"
   - Debe mostrar: "15/06/2025"
   - NO debe mostrar: "14/06/2025"

2. ✅ Producto con fecha a fin de mes: "2025-01-31"
   - Debe mostrar: "31/01/2025"
   - NO debe mostrar: "30/01/2025"

3. ✅ Producto sin fecha_emision
   - Debe mostrar: "-"

### Pruebas de Enlace

1. ✅ Link automático (checkbox desmarcado)
   - Verifica en consola: `useCustomLink: false`
   - Verifica en consola: `generatedLink: "https://verificar.argentina.gob.ar/qr/..."`
   - Verifica en BD: `enlace_declaracion` contiene el link generado

2. ✅ Link personalizado con valor
   - Marca checkbox
   - Ingresa: `https://mi-cliente.com/verificar/ABC`
   - Verifica en consola: `useCustomLink: true`, `customLink: "https://mi-cliente.com/..."`
   - Verifica en BD: `enlace_declaracion` contiene exactamente ese valor

3. ✅ Link personalizado vacío
   - Marca checkbox
   - Deja campo vacío
   - Verifica en consola: `useCustomLink: true`, `customLink: ""`
   - Verifica en BD: `enlace_declaracion` = `""`
   - Verifica en PDF: campo aparece en blanco (no dice "VACIO")

---

## Impacto y Compatibilidad

### Impacto en DJCs Existentes
- ✅ Las DJCs ya generadas NO se ven afectadas
- ✅ Los PDFs existentes permanecen sin cambios
- ✅ Solo afecta a nuevas DJCs generadas después del fix

### Compatibilidad hacia atrás
- ✅ La función `formatDateWithoutTimezone()` maneja:
  - Fechas en formato ISO completo: `2025-06-15T12:00:00.000Z`
  - Fechas en formato corto: `2025-06-15`
  - Objetos Date
  - null/undefined (retorna '-')

### Otros Campos de Fecha Afectados
- ✅ `fecha_proxima_vigilancia`
- ✅ `vencimiento` (cuando se usa como fallback)
- ✅ `fecha_emision_certificado_extranjero` (via formatDate en ProductPassport)

---

## Validación Post-Deploy

### Verificar en Consola del Browser

Cuando generes una DJC, deberías ver en la consola:

```
DJC Link Configuration: {
  useCustomLink: false,
  customLink: "",
  generatedLink: "https://verificar.argentina.gob.ar/qr/ABC-2025-001",
  productCode: "ABC-2025-001"
}

Generating DJC PDF with link: https://verificar.argentina.gob.ar/qr/ABC-2025-001

Saving DJC to database with link: https://verificar.argentina.gob.ar/qr/ABC-2025-001
```

### Verificar en Base de Datos

```sql
-- Ver últimas DJCs generadas con sus enlaces
SELECT 
  numero_djc,
  codigo_producto,
  enlace_declaracion,
  created_at
FROM djc
ORDER BY created_at DESC
LIMIT 10;
```

### Verificar en PDF Generado

1. Descarga el PDF
2. Busca la sección "(6) OTROS DATOS"
3. Verifica que:
   - Link automático aparece completo
   - Link personalizado aparece exactamente como lo ingresaste
   - Link vacío aparece como espacio en blanco

---

## Archivos Modificados - Resumen

```
src/utils/formatters.ts                     ✅ Nueva función
src/components/DJC/DJCGenerator.tsx         ✅ Usa nueva función + logging
src/pages/DJCManagement.tsx                 ✅ Usa nueva función
src/pages/ProductPassport.tsx               ✅ Usa nueva función
```

## Build Status

✅ Proyecto compila sin errores
✅ Sin warnings de TypeScript
✅ Todas las importaciones resueltas correctamente

---

## Notas Técnicas

### Por qué NO usar `new Date()` para fechas de certificados

```typescript
// ❌ PROBLEMA:
const date = new Date('2025-06-15');
// JavaScript interpreta esto como 2025-06-15T00:00:00.000Z (UTC)

date.toLocaleDateString('es-AR');
// En Argentina (UTC-3), esto se convierte a 2025-06-14T21:00:00-03:00
// Y muestra: 14/06/2025 ❌

// ✅ SOLUCIÓN:
formatDateWithoutTimezone('2025-06-15', 'short');
// Extrae directamente: año=2025, mes=06, día=15
// Retorna: 15/06/2025 ✅
```

### Cuándo usar cada función

- `formatDate()` - Para timestamps completos (created_at, updated_at)
- `formatDateWithoutTimezone()` - Para fechas de certificados (fecha_emision, vencimiento)
- `formatDateTime()` - Para fecha + hora

---

## Contacto y Soporte

Si encuentras algún problema con las fechas o enlaces después de este fix:

1. Revisa la consola del browser para ver los logs
2. Verifica la tabla `djc` en la base de datos
3. Compara el PDF generado con los datos en BD
4. Reporta el issue con screenshots de:
   - Consola del browser
   - Registro en tabla `djc`
   - PDF generado

---

**Fecha de implementación**: 22 de octubre de 2025
**Build**: Exitoso ✅
**Backward Compatible**: Sí ✅
