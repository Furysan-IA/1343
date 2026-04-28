# Verificación de Supabase Realtime

## Estado Actual

El DJCGenerator ya tiene implementada la suscripción en tiempo real. Cuando se actualiza un producto en la base de datos, debería actualizarse automáticamente.

## Verificación Paso a Paso

### 1. Verificar que Realtime esté habilitado en Supabase

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Ver si la tabla products está en la publicación realtime
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'products';
```

**Resultado esperado**: Debe retornar una fila mostrando que `products` está publicada.

**Si NO está habilitado**, ejecuta:

```sql
-- Habilitar realtime para la tabla products
ALTER PUBLICATION supabase_realtime ADD TABLE products;
```

### 2. Verificar en la Consola del Browser

Cuando abras DJCGenerator, deberías ver en la consola:

```
Total de productos en DB: XXXX
Total de productos cargados en DJCGenerator: XXXX
```

### 3. Test del Flujo Completo

**Paso 1**: Abre DJCGenerator
- Selecciona un producto
- Verifica que el "QR Link actual" se muestre en el cuadro azul

**Paso 2**: En la misma pestaña o en otra, regenera el QR del producto
- Ve a Product Management → Selecciona el mismo producto → Regenera QR
- O usa ProductQRDisplay directamente

**Paso 3**: Regresa a DJCGenerator
- **Debería actualizarse automáticamente**
- Verás en la consola:
  ```
  🔄 Producto actualizado en tiempo real: {codificacion: "...", qr_link: "..."}
  ✨ Actualizando producto seleccionado con nuevo qr_link: https://...
  ```
- El cuadro azul "QR Link actual" debe mostrar el nuevo link

### 4. Si NO se actualiza automáticamente

**Posibles causas**:

1. **Realtime no está habilitado**
   - Solución: Ejecuta el SQL del paso 1

2. **WebSocket bloqueado por el navegador/firewall**
   - Solución: Verifica en DevTools → Network → WS (WebSockets)
   - Debe haber una conexión activa a Supabase

3. **Error en la suscripción**
   - Solución: Mira la consola por errores
   - Busca: "error", "subscription", "realtime"

4. **El componente no está montado correctamente**
   - Solución: Recarga la página de DJCGenerator

### 5. Fallback Manual

Si el realtime no funciona, el usuario puede:
- Hacer clic en el botón "Actualizar" ⟳
- Esto fuerza una actualización desde la base de datos
- Siempre funciona, incluso sin realtime

## Test Rápido

```bash
# En la consola del browser, después de seleccionar un producto:
console.log('Producto seleccionado:', window.selectedProduct);

# Después de regenerar el QR en otro componente, espera 1-2 segundos y ejecuta de nuevo:
console.log('Producto después de actualizar:', window.selectedProduct);

# Deberían ser diferentes si el realtime funciona
```

## Troubleshooting

### Error: "Failed to subscribe"

```
Error: Failed to subscribe to channel djc-generator-products
```

**Solución**:
1. Verifica las credenciales de Supabase
2. Verifica que el proyecto de Supabase esté activo
3. Revisa las políticas RLS (aunque realtime funciona a nivel de DB, no RLS)

### Error: "WebSocket connection failed"

**Solución**:
1. Verifica conectividad a internet
2. Verifica que no haya firewall bloqueando WSS
3. Prueba en otra red/navegador

### El link se actualiza pero la UI no cambia

**Solución**:
- El estado de React no se está actualizando correctamente
- Verifica que `setSelectedProduct` se esté llamando
- Mira los logs: `✨ Actualizando producto seleccionado...`

---

**IMPORTANTE**: El realtime YA ESTÁ IMPLEMENTADO. Solo necesitas verificar que esté habilitado en Supabase.
