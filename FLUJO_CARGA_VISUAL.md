# 📊 Flujo Visual: Carga de Datos

## 🎯 Navegación

```
Menú Lateral → "Carga de Datos" (📊)
```

---

## Paso 1️⃣: Pantalla de Carga

```
┌─────────────────────────────────────────────────────────┐
│  Sistema de Validación de Datos                         │
│  Carga archivos Excel para validar y actualizar         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐         ┌──────────────┐            │
│  │   👥         │         │   📦         │            │
│  │  CLIENTES    │         │  PRODUCTOS   │            │
│  │  [Selected]  │         │              │            │
│  └──────────────┘         └──────────────┘            │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │          📤                                       │  │
│  │    Arrastra tu archivo aquí                      │  │
│  │    o haz clic para seleccionar                   │  │
│  │                                                   │  │
│  │    [ Seleccionar Archivo ]                       │  │
│  │                                                   │  │
│  │    Formatos: .xlsx, .xls, .csv                   │  │
│  │    Máx 50MB, 10,000 registros                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ✅ Columnas Requeridas para Clientes:                  │
│  • cuit                                                  │
│  • razon_social                                          │
│  • direccion                                             │
│  • email                                                 │
└─────────────────────────────────────────────────────────┘
```

### Cuando seleccionas un archivo:

```
┌─────────────────────────────────────────────────────────┐
│  📄 mi_archivo_clientes.xlsx                            │
│  Tamaño: 2.45 MB                                        │
│                                                          │
│  [ Subir y Validar ]  [ Cancelar ]                     │
└─────────────────────────────────────────────────────────┘
```

---

## Paso 2️⃣: Validación (Automática)

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│              ⏳ Procesando...                           │
│                                                          │
│  ✅ Archivo parseado exitosamente: 150 registros        │
│  ✅ Validando estructura...                             │
│  ✅ Verificando columnas requeridas...                  │
│  ✅ Buscando duplicados...                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Si hay errores:

```
┌─────────────────────────────────────────────────────────┐
│  ❌ Errores de Validación                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Se encontraron 2 error(es):                            │
│                                                          │
│  🔴 Fila 15, Campo: email                               │
│      email is required                                   │
│      Acción: Agregar email válido                       │
│                                                          │
│  🔴 Fila 23, Campo: cuit                                │
│      Duplicate cuit in file                              │
│      Acción: Eliminar registro duplicado                │
│                                                          │
│              [ Cerrar ]                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Paso 3️⃣: Pantalla de Revisión ⭐

```
┌─────────────────────────────────────────────────────────────────┐
│  Revisar Resultados - Clientes                                  │
│  mi_archivo_clientes.xlsx                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐    ┌────────────────────────┐        │
│  │ ✅ Coincidencias    │    │ 🆕 Nuevos Clientes     │        │
│  │    Exactas          │    │                        │        │
│  │                     │    │                        │        │
│  │       45            │    │        105             │        │
│  │                     │    │                        │        │
│  │ Se actualizarán     │    │ Listos para agregar    │        │
│  │ automáticamente     │    │                        │        │
│  └─────────────────────┘    └────────────────────────┘        │
│                                                                  │
│  Nuevos Registros por Agregar                                   │
│                                                                  │
│  [ Seleccionar Página ]  [ Agregar Seleccionados (3) ]         │
│                          [ Agregar Todos ]                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ ☐  CUIT        Razón Social       Email         Dirección  ││
│  ├────────────────────────────────────────────────────────────┤│
│  │ ☑  20123456   Empresa A S.A.    a@mail.com   Calle 123   ││
│  │ ☐  30234567   Empresa B S.R.L.  b@mail.com   Av. 456     ││
│  │ ☑  27345678   Empresa C S.A.    c@mail.com   Bvd. 789    ││
│  │ ☐  33456789   Empresa D S.A.    d@mail.com   Ruta 012    ││
│  │ ☑  20567890   Empresa E S.R.L.  e@mail.com   Calle 345   ││
│  │ ☐  30678901   Empresa F S.A.    f@mail.com   Av. 678     ││
│  │ ☐  27789012   Empresa G S.R.L.  g@mail.com   Bvd. 901    ││
│  │ ☐  33890123   Empresa H S.A.    h@mail.com   Ruta 234    ││
│  │ ☐  20901234   Empresa I S.A.    i@mail.com   Calle 567   ││
│  │ ☐  30012345   Empresa J S.R.L.  j@mail.com   Av. 890     ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Mostrando 1 a 10 de 105                                        │
│  [ ← ]  Página 1 de 11  [ → ]                                  │
│                                                                  │
│                        [ Completar Procesamiento ]              │
└─────────────────────────────────────────────────────────────────┘
```

### Cuando haces click en "Agregar Seleccionados (3)":

```
┌─────────────────────────────────────────────────────────┐
│  ✅ 3 registros agregados exitosamente                  │
└─────────────────────────────────────────────────────────┘
```

### La tabla se actualiza automáticamente:

```
  🆕 Nuevos Clientes: 105 → 102

  Los 3 registros marcados DESAPARECEN de la tabla
  Quedan solo los 102 pendientes
```

---

## Paso 4️⃣: Pantalla de Éxito

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│                   ✅                                     │
│            Clientes Procesados                          │
│                                                          │
│  Los datos han sido procesados exitosamente            │
│  La información se ha actualizado en la base de datos   │
│                                                          │
│            [ Procesar Más Datos ]                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎬 Escenarios Comunes

### Escenario 1: Todo Nuevo

```
Archivo: 100 registros
  ├─ ✅ Coincidencias: 0
  └─ 🆕 Nuevos: 100

Acción: "Agregar Todos"
Resultado: 100 registros insertados
```

### Escenario 2: Mezcla

```
Archivo: 200 registros
  ├─ ✅ Coincidencias: 50 (se actualizan auto)
  └─ 🆕 Nuevos: 150 (requieren aprobación)

Acción: "Agregar Todos" en nuevos
Resultado: 150 insertados + 50 actualizados = 200 procesados
```

### Escenario 3: Selección Manual

```
Archivo: 50 registros nuevos

Página 1: Reviso y selecciono 8
  → Click "Agregar Seleccionados (8)"
  → Quedan 42

Página 2: Reviso y selecciono 5
  → Click "Agregar Seleccionados (5)"
  → Quedan 37

Páginas 3-5: Resto
  → Click "Agregar Todos"
  → Se agregan los 37 restantes
```

### Escenario 4: Todos Duplicados

```
Archivo: 80 registros
  ├─ ✅ Coincidencias: 80
  └─ 🆕 Nuevos: 0

Pantalla muestra:
  "No hay registros nuevos para agregar"
  "80 registros se actualizaron automáticamente"

Acción: "Completar Procesamiento"
```

---

## 💡 Tips Visuales

### Colores de Estado

```
🟢 Verde  = Coincidencias (YA EXISTE, se actualiza)
🔵 Azul   = Nuevos (NO EXISTE, se puede agregar)
🔴 Rojo   = Errores (PROBLEMA, debe corregirse)
🟡 Amarillo = Advertencia (REVISAR, puede continuar)
```

### Checkboxes

```
☐  = No seleccionado
☑  = Seleccionado
☒  = Procesado (desaparece de la tabla)
```

### Botones Principales

```
[Azul]   = Acción primaria (Subir, Agregar)
[Verde]  = Acción de éxito (Completar, Todos)
[Gris]   = Acción secundaria (Cancelar, Cerrar)
[Rojo]   = Acción peligrosa (Eliminar)
```

---

## 🔍 Verificación Post-Carga

```
1. Ve a "Gestión de Clientes" o "Gestión de Productos"
2. Busca un registro que cargaste
3. Verifica que los datos sean correctos
4. ✅ Si todo está bien, listo!
```

---

## ⚠️ Si Algo Sale Mal

```
1. Presiona F12 (Abre consola del navegador)
2. Ve a pestaña "Console"
3. Busca mensajes en rojo 🔴
4. Copia el error
5. Corrige según el mensaje
```

### Mensajes Típicos de Error:

```
❌ "Missing required columns: email"
   → Falta columna "email" en el Excel

❌ "File size exceeds maximum of 50MB"
   → Archivo muy grande, dividir

❌ "Duplicate cuit in file"
   → Hay CUITs repetidos en el mismo archivo

❌ "User not authenticated"
   → Sesión expiró, volver a loguearse
```

---

## 📈 Resumen del Flujo

```
Carga Archivo → Validación → Revisión → Procesamiento → Éxito
     ↓             ↓            ↓            ↓            ↓
  Selección    Análisis     Ver Stats    Insertar     Mensaje
  Tipo/File    Auto         Duplicados   Selección    Confirma
               Errores?     Decidir      En BD        Completo
                  ↓            ↓
                ERROR      Seleccionar
                Modal      Individual
                           o Todos
```

---

## ✅ Checklist Rápido

Antes de cargar:
- [ ] Archivo es .xlsx o .xls
- [ ] Tiene las columnas requeridas
- [ ] Tamaño menor a 50MB
- [ ] Menos de 10,000 registros
- [ ] Sin duplicados internos

Durante la revisión:
- [ ] Verificar cantidad de nuevos vs duplicados
- [ ] Revisar algunos registros de ejemplo
- [ ] Decidir estrategia (Todos/Selección)

Después de procesar:
- [ ] Verificar mensaje de éxito
- [ ] Ir a gestión y buscar registros
- [ ] Confirmar datos correctos
- [ ] ✅ Todo listo!
