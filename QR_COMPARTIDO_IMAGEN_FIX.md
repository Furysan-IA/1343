# Fix: Mostrar Imagen del QR Compartido

## Problema Resuelto

Cuando un producto reutilizaba el QR de otro producto (mediante `shared_qr_from`), el sistema solo mostraba el **link** del producto origen pero NO mostraba la **imagen del QR**. El botón "Ver y Descargar QR" tampoco estaba disponible.

## Solución Implementada

### 1. Nuevo Estado `effectiveQR`

Se agregó un nuevo estado que almacena el QR efectivo (propio o compartido):

```typescript
const [effectiveQR, setEffectiveQR] = useState<{
  qr_path: string | null;      // Imagen del QR (base64)
  qr_link: string | null;       // URL del QR
  qr_status: string | null;     // Estado del QR
  is_shared: boolean;           // Indica si es compartido
  shared_from?: string;         // Código del producto origen
}>({...});
```

### 2. Función `loadEffectiveQR()`

Nueva función que usa el servicio `sharedQRService.getEffectiveQR()` para:
- Obtener el QR propio si el producto NO tiene `shared_qr_from`
- Obtener el QR del producto origen si el producto tiene `shared_qr_from`
- Manejar errores y fallback al QR propio si hay problemas

### 3. Actualizaciones en la UI

#### Estado del QR
- Muestra "Compartido" en azul cuando el QR es compartido
- Muestra "Generado" en verde cuando es QR propio
- Usa el icono de Link para QR compartidos

#### Información del QR
- Muestra el link efectivo (del origen si es compartido)
- Indica visualmente de qué producto viene el QR compartido
- **Nueva**: Muestra preview de la imagen del QR (32x32)

#### Botón "Ver y Descargar QR"
- **Antes**: Solo visible si `product.qr_path` existe
- **Ahora**: Visible si `effectiveQR.qr_path` existe
- Funciona correctamente con QR compartidos
- Muestra etiqueta "(Compartido)" cuando corresponde

#### Botón "Generar QR"
- Se deshabilita automáticamente si el producto usa QR compartido
- Muestra tooltip explicando que debe desvincular primero
- Evita que se genere QR nuevo accidentalmente sobre QR compartido

### 4. Realtime Subscription

La suscripción Realtime ahora también escucha cambios en `shared_qr_from`:
- Detecta cuando se vincula o desvincula un QR compartido
- Recarga automáticamente el QR efectivo
- Actualiza la UI en tiempo real

### 5. Recarga Automática

El QR efectivo se recarga automáticamente después de:
- Generar un nuevo QR
- Vincular a un QR compartido
- Desvincular de un QR compartido

## Comportamiento Final

### Producto con QR Propio
- ✅ Muestra su propio QR (link + imagen)
- ✅ Botón "Ver y Descargar QR" funcional
- ✅ Puede generar/regenerar QR
- ✅ Puede vincular a QR de otro producto

### Producto con QR Compartido
- ✅ Muestra el QR del producto origen (link + imagen)
- ✅ Botón "Ver y Descargar QR" funcional (descarga el QR compartido)
- ✅ Muestra preview de la imagen del QR
- ✅ Indica claramente que es compartido y de dónde viene
- ✅ Botón "Generar QR" deshabilitado (debe desvincular primero)
- ✅ Puede desvincular para volver a usar QR propio

### Producto sin QR
- ✅ Muestra estado "No generado"
- ✅ Puede generar QR si tiene datos completos
- ✅ Puede vincular a QR de otro producto

## Archivos Modificados

- `src/components/ProductQRDisplay.tsx`: Implementación completa del fix

## Testing Sugerido

1. **Producto con QR compartido**: Verificar que se vea la imagen y el link del QR origen
2. **Descargar QR compartido**: Verificar que se descarga correctamente
3. **Vincular QR**: Verificar que al vincular se muestra inmediatamente el QR compartido
4. **Desvincular QR**: Verificar que al desvincular vuelve al estado "No generado"
5. **Realtime**: Verificar que los cambios se reflejan en tiempo real
6. **Regeneración**: Verificar que el botón "Generar QR" está deshabilitado en productos con QR compartido
