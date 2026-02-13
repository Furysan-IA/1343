# Guía Rápida: Sistema de QR Compartido

## ¿Qué es?

Un sistema que permite que productos revisados (como ABC123-R1) reutilicen el código QR del producto original (ABC123), manteniendo el mismo QR físico mientras los usuarios ven siempre la información actualizada.

## Beneficios

- **No reimprimir QRs**: El QR físico permanece sin cambios
- **Información actualizada**: Los clientes siempre ven la última revisión
- **Gestión simple**: Detección automática de revisiones
- **Historial completo**: Se mantiene registro de todas las versiones

## Cómo Usar

### 1. Crear Producto Original

1. Crear producto "ABC123"
2. Ir a pestaña "Código QR"
3. Clic en "Generar QR"
4. Imprimir y adherir QR al producto

### 2. Crear Revisión del Certificado

1. Crear producto "ABC123-R1" (importante: debe terminar en -R1, -R2, etc.)
2. Abrir pestaña "Código QR"
3. El sistema detecta automáticamente que es una revisión
4. Aparece sugerencia: "¿Desea reutilizar el QR del producto original?"
5. Clic en "Reutilizar QR Original"
6. ¡Listo! El QR ahora apunta a la revisión actualizada

### 3. Búsqueda Manual (opcional)

Si el producto no es detectado automáticamente:

1. En pestaña "Código QR"
2. Expandir sección "Reutilizar QR de Otro Producto"
3. Buscar por código, nombre o marca
4. Clic en el producto deseado
5. El QR queda vinculado

## Qué Ve el Cliente

Cuando escanea el QR:

1. **Banner morado/índigo** indica "Información Actualizada"
2. Muestra la revisión más reciente (ej: ABC123-R1)
3. Lista todas las versiones disponibles
4. Toda la información del certificado actualizado

## Indicadores Visuales

### En Ficha de Producto (Pestaña QR):

- **Banner azul**: "QR Compartido desde: ABC123" (cuando está vinculado)
- **Banner verde**: "QR compartido por N productos" (cuando otros usan tu QR)
- **Banner morado**: Sugerencia automática para revisiones
- **Botón "Desvincular"**: Para volver a usar QR propio

### En Passport Público:

- **Banner morado**: "Información Actualizada"
- **Lista de revisiones**: Todas las versiones disponibles
- **Badges**: Certificado actualizado, última revisión

## Convenciones de Nomenclatura

El sistema detecta automáticamente estos patrones:

- ✅ ABC123-R1, ABC123-R2, ABC123-R3
- ✅ XYZ-R10, XYZ-R99
- ✅ PROD2024-R1

**Importante:** Debe terminar exactamente en `-R` seguido de dígitos.

## Desvincular QR

Si necesitas que un producto use su propio QR:

1. Abrir producto en modo edición
2. Pestaña "Código QR"
3. Clic en "Desvincular" (botón azul)
4. Confirmar acción
5. El producto vuelve a usar su QR propio (o puede generar uno nuevo)

## Casos de Uso Típicos

### Revisión de Certificado
- Original: CERT-2024-001
- Revisión: CERT-2024-001-R1
- **Resultado**: Mismo QR, información actualizada

### Actualización de Producto
- V1: PROD-A-2024
- V2: PROD-A-2024-R1
- **Resultado**: QR permanece, specs actualizadas

### Corrección de Datos
- Original: ABC123 (con error)
- Corregido: ABC123-R1 (datos correctos)
- **Resultado**: QR sin cambios, datos correctos

## Validaciones Automáticas

El sistema previene:

- ❌ Compartir QR de producto sin QR generado
- ❌ Referencias circulares (A→B→C)
- ❌ Auto-referencia (producto a sí mismo)
- ❌ Compartir de producto que ya comparte

## Tips y Mejores Prácticas

1. **Generar QR del original primero**: Antes de crear revisiones
2. **Nomenclatura consistente**: Usar -R1, -R2, -R3 secuencial
3. **Documentar cambios**: Nota en descripción qué cambió en la revisión
4. **No eliminar original**: Si otros productos usan su QR
5. **Revisar periódicamente**: Productos con QR compartido

## Troubleshooting

### No aparece sugerencia automática
**Solución**: Verificar que:
- Producto termina en -R# (ej: ABC-R1)
- Producto base existe (ej: ABC)
- Producto base tiene QR generado

### Error al vincular
**Solución**: Verificar que:
- Producto origen tiene QR generado
- Producto origen no comparte a su vez
- No estás intentando vincular a ti mismo

### Muestra versión incorrecta al escanear
**Solución**: Verificar nomenclatura de revisiones (R1, R2, R3...)

## Consultas Frecuentes

**P: ¿Puedo desvincular y volver a vincular?**
R: Sí, en cualquier momento desde la pestaña Código QR.

**P: ¿Qué pasa si elimino el producto original?**
R: Los productos dependientes quedan sin QR compartido (shared_qr_from = null).

**P: ¿Puedo tener múltiples revisiones del mismo producto?**
R: Sí, todas pueden usar el QR del original: ABC, ABC-R1, ABC-R2, ABC-R3.

**P: ¿El sistema funciona con otros patrones además de -R#?**
R: La detección automática solo funciona con -R#, pero puedes vincular manualmente cualquier producto.

**P: ¿Puedo crear cadenas? (A→B→C)**
R: No, solo un nivel: Original ← Revisiones. Esto previene complejidad innecesaria.

**P: ¿Afecta esto la generación de DJC?**
R: No, cada producto mantiene su propia DJC. El QR compartido es solo para la visualización pública.

## Archivos de Referencia

- `SISTEMA_QR_COMPARTIDO.md` - Documentación técnica completa
- `supabase/migrations/20251106000000_add_qr_sharing_system.sql` - Esquema de BD
- `src/services/sharedQRService.ts` - Lógica del servicio
- `src/components/ProductQRDisplay.tsx` - Interfaz de usuario

## Próximos Pasos

Después de implementar el sistema:

1. **Probar con un producto de prueba**: Crear ABC-TEST y ABC-TEST-R1
2. **Vincular el QR**: Usar la interfaz nueva
3. **Escanear y verificar**: Usar un teléfono para escanear
4. **Verificar el banner**: Confirmar que muestra "Información Actualizada"
5. **Revisar productos existentes**: Identificar cuáles pueden beneficiarse

## Soporte

Para problemas o preguntas:
- Revisar la documentación completa en `SISTEMA_QR_COMPARTIDO.md`
- Verificar los logs del navegador (F12 → Console)
- Consultar las validaciones de BD en la migración
