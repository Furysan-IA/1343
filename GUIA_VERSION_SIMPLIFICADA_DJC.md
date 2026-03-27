# Guía: Versión Simplificada de DJC

## Descripción General

Se ha implementado una nueva funcionalidad que permite a los usuarios generar una **versión simplificada** de la Declaración Jurada de Conformidad (DJC). Esta versión omite el campo "Fabricante (Nombre y dirección de la planta de producción)" de la sección (4) INFORMACIÓN DEL PRODUCTO.

## Cambios Implementados

### 1. Base de Datos

Se agregó una nueva columna `is_simplified` a la tabla `djc`:
- **Tipo**: `BOOLEAN`
- **Valor por defecto**: `false`
- **Propósito**: Mantener un registro histórico de qué tipo de DJC se generó

**Archivo de migración**: `add_is_simplified_column.sql`

Para aplicar la migración, ejecute el siguiente SQL en su base de datos Supabase:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'is_simplified'
  ) THEN
    ALTER TABLE djc ADD COLUMN is_simplified BOOLEAN DEFAULT false NOT NULL;
    COMMENT ON COLUMN djc.is_simplified IS 'Indicates if the DJC was generated in simplified version (without fabricante field in product information section)';
  END IF;
END $$;
```

### 2. Interfaz de Usuario

#### Componente: `DJCGenerator.tsx`

Se agregó un nuevo checkbox en la interfaz del generador de DJC:
- **Ubicación**: Después de la sección "Enlace de la Declaración"
- **Diseño**: Fondo ámbar con borde para destacar la opción
- **Texto**: "Generar versión simplificada de DJC"
- **Descripción**: Explica claramente qué campo se omitirá

#### Vista Previa: `DJCPreview.tsx`

- Se agregó un badge "Versión Simplificada" en el encabezado del modal cuando la opción está activada
- La fila del fabricante se oculta condicionalmente en la tabla de Información del Producto
- El resto de campos mantienen su orden y espaciado correcto

### 3. Generación de PDF

#### Servicio: `djcPdfGenerator.service.ts`

- Se actualizó la interfaz `DJCData` para incluir el campo opcional `isSimplified`
- Se modificó la lógica de generación para omitir la fila del fabricante cuando `isSimplified` es `true`
- Se ajustó el patrón de colores alternados (gris/blanco) para mantener la consistencia visual

#### Servicio: `djcHtmlToPdf.service.ts`

- Se actualizó la interfaz `DJCData` para incluir el campo opcional `isSimplified`
- Se modificó el HTML generado para omitir condicionalmente la fila del fabricante
- Se mantiene la estructura y formato del documento

### 4. Persistencia de Datos

Cuando se genera una DJC, el valor de `is_simplified` se guarda en la base de datos junto con todos los demás campos. Esto permite:
- Mantener un registro histórico del tipo de DJC generada
- Facilitar reportes y análisis futuros
- Asegurar trazabilidad completa

## Cómo Usar la Funcionalidad

### Paso a Paso

1. **Acceder al Generador de DJC**
   - Navegar a la sección "Gestión de DJC" en el sistema

2. **Seleccionar Cliente y Producto**
   - Elegir el cliente y producto como de costumbre
   - Completar todos los campos requeridos (Resolución, Representante, etc.)

3. **Activar la Versión Simplificada**
   - Buscar la sección "Generar versión simplificada de DJC" (fondo ámbar)
   - Marcar el checkbox si desea omitir el campo de fabricante
   - Leer la descripción para confirmar qué se omitirá

4. **Vista Previa**
   - Hacer clic en "Vista Previa DJC"
   - Verificar que aparezca el badge "Versión Simplificada" en el encabezado
   - Confirmar que el campo fabricante no aparece en la sección (4)
   - Revisar que el resto de campos estén correctos

5. **Generar PDF**
   - Hacer clic en "Confirmar y Generar PDF"
   - El PDF se descargará automáticamente
   - El registro en la base de datos incluirá `is_simplified: true`

## Diferencias entre Versiones

### Versión Completa (Normal)

Sección (4) INFORMACIÓN DEL PRODUCTO incluye:
1. Código de identificación único del producto
2. **Fabricante (Nombre y dirección de la planta de producción)**
3. Identificación del producto
4. Marca/s
5. Modelo/s
6. Características técnicas

### Versión Simplificada

Sección (4) INFORMACIÓN DEL PRODUCTO incluye:
1. Código de identificación único del producto
2. ~~Fabricante (Nombre y dirección de la planta de producción)~~ ← **OMITIDO**
3. Identificación del producto
4. Marca/s
5. Modelo/s
6. Características técnicas

## Notas Importantes

- **Compatibilidad**: Todas las DJCs existentes tienen `is_simplified: false` por defecto
- **Validación**: No se requiere el campo fabricante cuando se genera una versión simplificada
- **Reversibilidad**: Se puede generar una nueva DJC en versión completa en cualquier momento
- **Trazabilidad**: El historial de DJCs muestra todas las versiones generadas
- **Visual**: El patrón de colores alternados (gris/blanco) se mantiene correctamente en ambas versiones

## Archivos Modificados

1. `src/components/DJC/DJCGenerator.tsx` - Lógica del generador y UI
2. `src/components/DJC/DJCPreview.tsx` - Vista previa del modal
3. `src/services/djcPdfGenerator.service.ts` - Generación de PDF con jsPDF
4. `src/services/djcHtmlToPdf.service.ts` - Generación alternativa de PDF
5. `add_is_simplified_column.sql` - Script de migración de base de datos

## Soporte y Preguntas

Si tiene preguntas sobre esta funcionalidad, consulte:
- Manual de Usuario del Sistema
- Documentación técnica en los archivos de diseño
- Guías rápidas de otros sistemas implementados
