# Manual de Usuario
## Sistema de Gestión de Certificados y DJC

### Versión: 1.0
### Fecha: Enero 2025

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Panel de Control (Dashboard)](#panel-de-control-dashboard)
4. [Gestión de Clientes](#gestión-de-clientes)
5. [Gestión de Productos](#gestión-de-productos)
6. [Validación de Información](#validación-de-información)
7. [Gestión de DJC](#gestión-de-djc)
8. [Generación de Códigos QR](#generación-de-códigos-qr)
9. [Verificación Pública](#verificación-pública)
10. [Configuración Avanzada](#configuración-avanzada)
11. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 🚀 Introducción

El **Sistema de Gestión de Certificados y DJC** es una aplicación web diseñada para gestionar certificaciones de productos y generar Declaraciones Juradas de Conformidad (DJC) de acuerdo con las regulaciones argentinas.

### Características Principales

- ✅ **Gestión completa de clientes y productos**
- ✅ **Generación automática de DJCs**
- ✅ **Códigos QR para verificación pública**
- ✅ **Validación de archivos Excel**
- ✅ **Sistema de documentos integrado**
- ✅ **Interfaz responsive y moderna**

---

## 🔐 Acceso al Sistema

### Inicio de Sesión

1. **Acceder a la aplicación** en la URL proporcionada
2. **Introducir credenciales**:
   - Email registrado
   - Contraseña
3. **Hacer clic en "Iniciar Sesión"**

> **Nota**: El registro de nuevos usuarios está deshabilitado. Contacte al administrador para obtener credenciales.

### Cambio de Idioma

- Use el botón **🌐** en la esquina superior derecha
- Idiomas disponibles: **Español** e **Inglés**

---

## 📊 Panel de Control (Dashboard)

El Dashboard es la página principal que muestra un resumen completo del sistema.

### Estadísticas Principales

#### Primera Fila
- **Total Clientes**: Número total de clientes registrados
- **Total Productos**: Número total de productos en el sistema
- **Productos Vigentes**: Productos con certificación válida
- **Productos Vencidos**: Productos con certificación expirada

#### Segunda Fila
- **Productos con QR**: Productos que tienen código QR generado
- **Productos con DJC**: Productos que tienen DJC generada
- **Por vencer (30 días)**: Productos que vencen en los próximos 30 días
- **Sin vencimiento**: Productos sin fecha de vencimiento definida

### Secciones Informativas

#### Productos Próximos a Vencer
- Lista de productos que vencen en los próximos 30 días
- Muestra días restantes y fecha de vencimiento
- Clic en cualquier producto para ir a la gestión de productos

#### Productos Agregados Recientemente
- Últimos 5 productos añadidos al sistema
- Iconos que indican si tienen QR o DJC generados
- Acceso rápido a la ficha del producto

#### Gráfico de Distribución
- Visualización circular de la distribución de productos
- Porcentajes de productos vigentes, vencidos y sin vencimiento

### Acciones Disponibles

- **🔄 Actualizar**: Botón en la esquina superior derecha para refrescar datos
- **Navegación rápida**: Clic en las estadísticas para ir a la sección correspondiente

---

## 👥 Gestión de Clientes

### Funcionalidades Principales

#### Visualización de Clientes
- **Lista completa** de todos los clientes registrados
- **Información mostrada**:
  - Razón Social y contacto
  - CUIT formateado
  - Email y teléfono
  - Estado de completitud de datos
  - Cantidad de productos asociados

#### Búsqueda y Filtrado
- **Búsqueda en tiempo real** por:
  - Razón social
  - CUIT
  - Email
  - Contacto
  - Teléfono

#### Gestión de Datos
- **Crear nuevo cliente**: Botón "Nuevo Cliente"
- **Editar cliente**: Clic en cualquier fila de la tabla
- **Eliminar cliente**: Botón de papelera (⚠️ elimina también productos asociados)

### Campos de Cliente

#### Campos Obligatorios (*)
- **Razón Social**: Nombre oficial de la empresa
- **CUIT**: Código Único de Identificación Tributaria (11 dígitos)
- **Dirección**: Domicilio legal de la empresa
- **Teléfono**: Número de contacto
- **Email**: Correo electrónico oficial

#### Campos Opcionales
- **Contacto**: Nombre de la persona de contacto

### Estados de Cliente

- **🟢 Completado**: Todos los campos obligatorios están llenos
- **🟠 Faltan X campos**: Indica cuántos campos obligatorios faltan

### Personalización de Vista

#### Configuración de Columnas
- **Mostrar/Ocultar columnas**: Casillas de verificación
- **Reordenar columnas**: Arrastrar encabezados de columna
- **Restablecer configuración**: Botón "Restablecer"

> **Tip**: La configuración de columnas se guarda automáticamente en el navegador.

---

## 📦 Gestión de Productos

### Funcionalidades Principales

#### Visualización de Productos
- **Lista completa** con información detallada
- **Estadísticas en tiempo real** en el header
- **Indicadores visuales** de estado y completitud

#### Información Mostrada
- **Codificación**: Código único del producto
- **Producto**: Nombre del producto
- **Marca y Modelo**: Información comercial
- **Estado**: Vigente, Vencido, o Sin vencimiento
- **QR**: Estado del código QR (Generado, No generado, Pendiente regeneración)
- **Vencimiento**: Fecha de expiración de la certificación

#### Búsqueda y Filtrado

##### Búsqueda
Buscar por:
- Nombre del producto
- Marca
- Modelo
- Codificación
- Titular

##### Filtros Disponibles
- **Todos los estados**: Mostrar todos los productos
- **Vigentes**: Solo productos con certificación válida
- **Vencidos**: Solo productos con certificación expirada
- **Sin vencimiento**: Productos sin fecha de vencimiento
- **Datos faltantes**: Productos con información incompleta
- **QR pendiente regeneración**: Productos que necesitan actualizar su QR
- **Sin DJC**: Productos sin Declaración Jurada generada

### Ficha Detallada del Producto

Al hacer clic en cualquier producto, se abre una ficha completa con pestañas:

#### 🏷️ Información General
- **Producto*** (obligatorio)
- **Marca*** (obligatorio)
- **Modelo**
- **Origen*** (obligatorio)
- **Titular*** (obligatorio)
- **CUIT**
- **Características Técnicas**

#### 🏭 Fabricación
- **Fabricante*** (obligatorio)
- **Planta de Fabricación*** (obligatorio)
- **Dirección Legal de la Empresa*** (obligatorio)

#### 🛡️ Certificación
- **Normas de Aplicación*** (obligatorio)
- **Informe de Ensayo Nro*** (obligatorio)
- **Fecha de Emisión*** (obligatorio)
- **Fecha de Vencimiento*** (obligatorio)
- **Enviado al cliente** (checkbox)

#### 📄 Documentos
- **Certificado**: Subir/ver archivo PDF del certificado
- **DJC**: Subir/ver Declaración Jurada de Conformidad

#### 🔲 Código QR
- Generación y configuración de códigos QR
- Descarga en múltiples formatos
- Configuración de URLs

### Acciones Disponibles

- **👁️ Ver ficha**: Clic en cualquier fila
- **🗑️ Eliminar**: Botón de papelera
- **🔄 Sincronizar**: Actualizar datos desde la base de datos
- **⚙️ Config QR**: Configurar URLs base para códigos QR
- **📥 Exportar**: Descargar datos en formato CSV

### Personalización de Vista

- **Configuración de columnas**: Igual que en clientes
- **Orden personalizable**: Arrastrar encabezados
- **Visibilidad configurable**: Mostrar/ocultar columnas

---

## ✅ Validación de Información

### Propósito
Validar archivos Excel antes de cargarlos masivamente al sistema.

### Tipos de Archivo Soportados
- **Clientes**: Archivos con información de empresas
- **Productos**: Archivos con información de productos certificados

### Proceso de Validación

1. **Seleccionar archivos**: Botón "Seleccionar Archivos"
2. **Formatos aceptados**: .xlsx, .xls
3. **Validación automática**: El sistema detecta el tipo de archivo
4. **Resultados detallados**: Muestra errores y advertencias

### Estructura de Archivos

#### Para Clientes
**Columnas obligatorias**:
- `razon_social` o `empresa`
- `cuit` o `cuil`
- `direccion`
- `email`
- `telefono`

**Columnas opcionales**:
- `contacto`

#### Para Productos
**Columnas obligatorias**:
- `codificacion` o `codigo`
- `producto` o `nombre_producto`
- `marca`
- `titular`
- `cuit` (debe existir en clientes)
- `origen`
- `fabricante`
- `normas_aplicacion` o `normas`
- `informe_ensayo_nro`

**Columnas opcionales**:
- `modelo`
- `caracteristicas_tecnicas`
- `fecha_emision`
- `vencimiento`
- `laboratorio`
- Y muchas más...

### Tipos de Errores

- **🔴 Error**: Problemas críticos que impiden la carga
- **🟡 Advertencia**: Problemas menores que se pueden corregir

### Resultados de Validación

Para cada archivo se muestra:
- **Tipo detectado**: Clientes o Productos
- **Estado**: Válido o Inválido
- **Total de filas**: Cantidad de registros
- **Filas válidas**: Registros procesables
- **Lista de problemas**: Errores y advertencias detallados

---

## 📋 Gestión de DJC

### ¿Qué es una DJC?
Una **Declaración Jurada de Conformidad** es un documento oficial que certifica que un producto cumple con las normas y reglamentos argentinos.

### Funcionalidades

#### Visualización de Productos
- Lista de todos los productos con información relevante para DJC
- Estados de DJC, certificados y envío al cliente
- Filtros especializados para gestión de DJC

#### Estados de DJC
- **🔴 No Generada**: Sin DJC creada
- **🟡 Generada Pendiente de Firma**: DJC creada pero sin firmar
- **🟢 Firmada**: DJC completa y firmada

#### Estados de Certificado
- **🔴 Pendiente Subida**: Sin certificado cargado
- **🟢 Subido**: Certificado disponible

#### Estados de Envío
- **🔴 Pendiente**: No enviado al cliente
- **🟢 Enviado**: Entregado al cliente

### Filtros Especializados

- **DJC No Generada**: Productos sin DJC
- **DJC Pendiente de Firma**: DJCs creadas pero sin firmar
- **Certificado Pendiente Subida**: Sin certificado cargado
- **Pendiente de Envío al Cliente**: No enviados
- **Productos Vencidos**: Certificaciones expiradas
- **Próximos a Vencer**: Vencen en 30 días

### Acciones Disponibles

- **📄 DJC**: Generar nueva DJC
- **📥 Descargar**: Ver DJC existente (si está disponible)
- **📤 Subir**: Cargar certificado
- **✍️ Firmar**: Firmar DJC
- **📧 Enviar**: Marcar como enviado al cliente

---

## 🔧 Gestión de DJC (Generador)

### Proceso de Generación

#### Paso 1: Selección de Cliente
- **Búsqueda**: Campo de búsqueda por razón social
- **Selección**: Dropdown con todos los clientes
- **Información mostrada**: Razón social y CUIT formateado

#### Paso 2: Selección de Producto
- **Búsqueda**: Campo de búsqueda por producto, marca o código
- **Filtrado automático**: Solo productos del cliente seleccionado
- **Indicadores**: ⚠️ para productos sin DJC

#### Paso 3: Selección de Resolución
Resoluciones disponibles:
- **Res. SIYC N° 236/24**: Materiales para instalaciones eléctricas
- **Res. SIYC N° 17/2025**
- **Res. SIYC N° 16/2025**

#### Paso 4: Vista Previa
- **Documento completo**: Vista previa del DJC generado
- **Campos faltantes**: Marcados en rojo si faltan datos
- **Información del QR**: Enlace automático al código QR del producto

#### Paso 5: Generación Final
- **Descarga automática**: PDF generado
- **Almacenamiento**: Guardado en el sistema
- **Actualización**: Estado del producto actualizado

### Información Incluida en la DJC

#### Datos del Declarante
- Razón Social
- CUIT
- Domicilio Legal
- Teléfono y Email

#### Datos del Producto
- Código de Identificación Único
- Fabricante y Planta de Producción
- Identificación del Producto (marca, modelo, características)
- Normas Técnicas Aplicables
- Documento de Evaluación

#### Otros Datos
- Enlace al código QR del producto
- Fecha y lugar de emisión
- Espacio para firma

---

## 🔲 Generación de Códigos QR

### Funcionalidades del Generador QR

#### Configuración de Calidad
- **Baja (7%)**: Menor tamaño de archivo
- **Media (15%)**: **Recomendado** para uso general
- **Alta (25%)**: Mayor resistencia a daños
- **Máxima (30%)**: Máxima protección contra errores

#### Vista Previa de URL
- **Verificación previa**: Probar URL antes de generar QR
- **Información del producto**: Datos que se mostrarán públicamente
- **Recomendaciones**: Consejos para impresión óptima

#### Formatos de Descarga
- **QR Normal**: 200x200px para visualización
- **QR HD**: 600x600px para impresión
- **Etiqueta PNG**: Etiqueta completa con logo AR
- **Etiqueta PDF**: Formato listo para imprimir (25mm x 30mm)

### Configuración de URLs

#### Configuración Automática
- **Auto-detección**: Detecta automáticamente el entorno
- **Desarrollo**: URLs locales para pruebas
- **Producción**: URLs oficiales (argqr.com)

#### URLs Sugeridas
- **Producción - argqr.com**: URL oficial recomendada
- **URL Actual**: URL detectada del navegador
- **Desarrollo Local**: Para pruebas en localhost

#### Verificación de URLs
- **Probar URL**: Abrir en nueva pestaña para verificar
- **Verificar conectividad**: Comprobar que la URL responde
- **Copiar URL**: Copiar al portapapeles

### Estados del QR

- **🔴 No generado**: Sin código QR
- **🟢 Generado**: QR creado y funcional
- **🟡 Pendiente regeneración**: Necesita actualización por cambios

---

## 🔧 Configuración Avanzada de QR (QRModTool)

> **Nota**: Esta herramienta solo está disponible en modo desarrollo.

### Acceso
- **Botón flotante**: Esquina inferior izquierda (🔧)
- **Indicador activo**: Punto verde cuando está aplicada la configuración

### Pestañas de Configuración

#### 🏷️ Etiqueta
- **Dimensiones**: Ancho y alto de la etiqueta
- **Bordes**: Radio y grosor de bordes
- **Espaciado**: Padding interno en todos los lados

#### 🔲 QR
- **Tamaño**: Dimensiones del código QR
- **Posición**: Ubicación desde arriba y desde la izquierda
- **Centrado**: Opción para centrar horizontalmente

#### 🔤 AR
- **Texto personalizable**: Cambiar "AR" por otro texto
- **Posición**: Ubicación desde abajo
- **Altura**: Tamaño del texto/imagen AR
- **Desplazamiento**: Ajustes finos de posición X e Y
- **Espaciado**: Distancia entre AR y símbolos
- **Imagen**: Opción para usar imagen en lugar de texto

#### ✓ Símbolos
- **Cantidad**: 1 a 3 símbolos (tildes)
- **Dimensiones**: Ancho y alto de cada símbolo
- **Grosor**: Grosor del trazo
- **Espaciado**: Separación vertical entre símbolos
- **Ángulos**: Rotación individual de cada símbolo
- **Posición**: Control individual de posición X e Y

#### 🔤 Fuente
- **Familia**: Selección de fuentes disponibles
- **Carga personalizada**: Subir archivos .otf, .ttf, .woff
- **Tamaño**: Tamaño de fuente en píxeles
- **Peso**: Normal, negrita, light, etc.
- **Espaciado**: Separación entre letras
- **Transformación**: Mayúsculas, minúsculas, etc.

#### 🎨 Colores
- **Sistema CMYK**: Valores oficiales argentinos
  - Cyan: 47%
  - Magenta: 22%
  - Yellow: 0%
  - Key (Negro): 14%
- **Sistema RGB**: Colores personalizados
- **Vista previa**: Color resultante en tiempo real

#### ⚙️ General
- **Activar/Desactivar**: Aplicar configuración a componentes
- **Cuadrícula**: Mostrar grid de medición
- **Zoom**: Ajustar vista previa (100% a 500%)

### Aplicación de Cambios

1. **Configurar**: Ajustar valores en las pestañas
2. **Guardar**: Almacenar configuración
3. **Aplicar**: Activar para todos los componentes
4. **Verificar**: Los nuevos QR usarán la configuración

---

## 🌐 Verificación Pública

### Acceso Público (Sin Autenticación)

#### Página de Transición (`/qr/:uuid`)
- **Countdown**: 3 segundos de espera
- **Información**: UUID del producto
- **Redirección automática**: A la página del producto
- **Acceso manual**: Botón "Ver información ahora"

#### Pasaporte del Producto (`/products/:uuid`)
- **Información completa**: Datos públicos del producto
- **Verificación oficial**: Sello de autenticidad
- **Sin autenticación**: Acceso libre para verificación

### Información Mostrada Públicamente

#### Datos del Producto
- Nombre, marca y modelo
- Características técnicas
- Origen y tipo de certificación
- Estado actual

#### Información del Fabricante
- Nombre del fabricante
- Planta de fabricación
- Dirección legal

#### Certificación y Normas
- Normas de aplicación
- Número de informe de ensayo
- Laboratorio certificador
- Fechas de emisión y vencimiento

#### Información del Titular
- Razón social
- CUIT formateado

#### Documentos Públicos
- Enlaces a certificados (si están disponibles)
- Enlaces a DJC (si están disponibles)

#### Fechas Importantes
- Fecha de emisión
- Fecha de vencimiento
- Días restantes (si aplica)

### Estados Públicos

- **🟢 Vigente**: Certificación válida
- **🟡 Vence en X días**: Próximo a vencer (≤30 días)
- **🔴 Vencido**: Certificación expirada
- **⚪ Sin fecha**: Sin vencimiento definido

---

## 📊 Funciones de Exportación

### Exportar Productos
- **Formato**: CSV (compatible con Excel)
- **Columnas**: Solo las columnas visibles en la tabla
- **Filtros**: Respeta los filtros aplicados
- **Nombre**: `productos_YYYY-MM-DD.csv`

### Exportar Clientes
- **Formato**: CSV
- **Información completa**: Todos los campos del cliente
- **Nombre**: `clientes_YYYY-MM-DD.csv`

---

## 🔄 Sincronización y Actualizaciones

### Sincronización Manual
- **Botón Sincronizar**: En cada sección
- **Indicador**: Ícono de carga durante el proceso
- **Confirmación**: Mensaje de éxito/error

### Sincronización Automática
- **Dashboard**: Cada 5 minutos
- **Productos**: Cada 5 minutos
- **Tiempo real**: Cambios inmediatos al editar

### Indicadores de Estado
- **Última sincronización**: Timestamp en cada sección
- **Estado de conexión**: Indicadores visuales
- **Errores**: Notificaciones automáticas

---

## 📱 Uso en Dispositivos Móviles

### Navegación Móvil
- **Menú hamburguesa**: Acceso a todas las secciones
- **Sidebar deslizable**: Navegación lateral en móviles
- **Botones táctiles**: Tamaños optimizados para touch

### Tablas Responsivas
- **Scroll horizontal**: Para tablas anchas
- **Columnas prioritarias**: Se mantienen visibles
- **Acciones simplificadas**: Botones más grandes

### Formularios Móviles
- **Campos apilados**: Disposición vertical
- **Teclados optimizados**: Tipos de input apropiados
- **Validación visual**: Feedback inmediato

---

## 🔐 Seguridad y Permisos

### Autenticación
- **Email y contraseña**: Método único de acceso
- **Sesiones persistentes**: Mantiene la sesión activa
- **Cierre automático**: Por inactividad prolongada

### Permisos de Usuario
- **Usuarios autenticados**: Acceso completo al sistema privado
- **Público general**: Solo acceso a verificación de productos

### Seguridad de Datos
- **RLS (Row Level Security)**: Políticas de acceso a nivel de base de datos
- **HTTPS**: Comunicación encriptada
- **Backup automático**: Respaldo de datos

---

## 📈 Monitoreo y Logs

### Sistema de Logs
- **Errores automáticos**: Se registran automáticamente
- **Actividades**: Registro de acciones importantes
- **Contexto**: Información adicional para debugging

### Métricas del Sistema
- **Performance**: Tiempo de carga de páginas
- **Uso**: Estadísticas de utilización
- **Errores**: Frecuencia y tipos de errores

---

## ❓ Preguntas Frecuentes

### ¿Cómo genero un código QR?
1. Ir a **Gestión de Productos**
2. Hacer clic en un producto
3. Ir a la pestaña **Código QR**
4. Hacer clic en **Generar Código QR**

### ¿Qué hago si un QR no funciona?
1. Verificar que la **URL base** esté configurada correctamente
2. **Probar la URL** antes de imprimir
3. **Regenerar el QR** si es necesario
4. Verificar que el producto tenga todos los **datos obligatorios**

### ¿Cómo subo archivos masivos?
1. Ir a **Validación de Información**
2. **Validar** primero el archivo Excel
3. Corregir errores si los hay
4. Contactar al administrador para la carga masiva

### ¿Puedo personalizar las columnas de las tablas?
Sí, en todas las tablas puedes:
- **Mostrar/ocultar** columnas con las casillas
- **Reordenar** arrastrando los encabezados
- **Restablecer** la configuración por defecto

### ¿Qué significa "Pendiente regeneración" en QR?
Significa que los datos del producto han cambiado y se recomienda regenerar el código QR para reflejar la información actualizada.

### ¿Cómo funciona la verificación pública?
1. El usuario **escanea el QR** con su móvil
2. Es dirigido a una **página de transición**
3. Luego ve la **información pública** del producto
4. **No necesita** crear cuenta ni iniciar sesión

### ¿Puedo cambiar el texto "AR" en los códigos QR?
Sí, usando la **QRModTool** (solo en desarrollo):
1. Hacer clic en el botón 🔧 flotante
2. Ir a la pestaña **AR**
3. Cambiar el **Texto AR**
4. **Aplicar** la configuración

### ¿Cómo configuro las URLs para producción?
1. Ir a **Gestión de Productos**
2. Hacer clic en **Config QR**
3. Seleccionar **Producción - argqr.com**
4. **Guardar configuración**

---

## 🆘 Soporte y Contacto

### Problemas Técnicos
- **Errores de carga**: Verificar conexión a internet
- **Problemas de QR**: Revisar configuración de URLs
- **Archivos Excel**: Verificar formato y estructura

### Solicitudes de Mejora
- **Nuevas funcionalidades**: Contactar al equipo de desarrollo
- **Cambios en el diseño**: Sugerencias de UX/UI
- **Integraciones**: APIs externas o sistemas adicionales

### Capacitación
- **Manual de usuario**: Este documento
- **Videos tutoriales**: Disponibles bajo solicitud
- **Sesiones de entrenamiento**: Coordinables con el equipo

---

## 📝 Notas Importantes

### Datos Obligatorios para QR
Para generar un código QR, el producto debe tener:
- ✅ **Titular**
- ✅ **Producto** (nombre)
- ✅ **Marca**

### Recomendaciones de Uso

#### Para Códigos QR
- **Imprimir en alta calidad** (300 DPI mínimo)
- **Usar papel blanco mate** para mejor contraste
- **No reducir** el tamaño por debajo de 20mm x 20mm
- **Verificar** que sea escaneable antes de imprimir en masa

#### Para DJCs
- **Completar todos los campos** antes de generar
- **Verificar información** del cliente y producto
- **Guardar copia** del documento generado
- **Firmar digitalmente** cuando sea posible

#### Para Archivos Excel
- **Usar plantillas** proporcionadas
- **Validar antes** de solicitar carga masiva
- **Revisar duplicados** en los datos
- **Mantener formato** de fechas consistente

### Limitaciones Conocidas

- **Registro de usuarios**: Deshabilitado por seguridad
- **Carga masiva**: Requiere validación previa
- **QRModTool**: Solo disponible en desarrollo
- **Tamaño de archivos**: Límite de 10MB por documento

---

## 🔄 Actualizaciones y Mantenimiento

### Frecuencia de Actualizaciones
- **Mensuales**: Actualizaciones de funcionalidades
- **Semanales**: Correcciones de errores
- **Inmediatas**: Parches de seguridad

### Notificaciones de Cambios
- **Banner informativo**: Cambios importantes
- **Notas de versión**: Detalles de actualizaciones
- **Comunicaciones**: Avisos por email

---

*Manual generado automáticamente - Versión 1.0*  
*Última actualización: Enero 2025*  
*Sistema de Gestión de Certificados y DJC*