# Documento de Diseño del Sistema
## Sistema de Gestión de Certificados y DJC

### Versión: 1.0
### Fecha: Enero 2025

---

## 1. Resumen Ejecutivo

El Sistema de Gestión de Certificados y DJC es una aplicación web moderna diseñada para gestionar certificaciones de productos y generar Declaraciones Juradas de Conformidad (DJC) de acuerdo con las regulaciones argentinas.

### 1.1 Objetivos Principales
- Gestionar clientes y productos certificados
- Generar y administrar DJCs automáticamente
- Crear códigos QR para verificación pública de productos
- Validar información antes de la carga masiva
- Proporcionar acceso público a información de productos certificados

---

## 2. Arquitectura del Sistema

### 2.1 Estructura de Aplicaciones

El sistema está dividido en **DOS aplicaciones separadas**:

#### 2.1.1 Aplicación Principal (Privada)
- **Propósito**: Gestión interna para empleados de la empresa
- **Autenticación**: Requerida (Supabase Auth)
- **Primera página**: `LoginForm.tsx`
- **Usuarios**: Personal interno de certificación
- **Funcionalidades**:
  - Dashboard con estadísticas
  - Gestión de productos y clientes
  - Generación de DJCs
  - Validación de información
  - Configuración de QR

#### 2.1.2 Aplicación Pública (Separada)
- **Propósito**: Verificación pública de productos
- **Autenticación**: No requerida
- **Primera página**: `Welcome.tsx`
- **Usuarios**: Público general que escanea QRs
- **Funcionalidades**:
  - Página de bienvenida
  - Verificación de productos por QR
  - Información pública de certificados

### 2.2 Stack Tecnológico

#### Frontend
- **Framework**: React 18 con TypeScript
- **Bundler**: Vite
- **Estilos**: Tailwind CSS + CSS personalizado
- **Iconos**: Lucide React
- **Routing**: React Router DOM v7
- **Estado**: Context API (Auth, Language)
- **Notificaciones**: React Hot Toast

#### Backend
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Storage**: Supabase Storage
- **Políticas**: Row Level Security (RLS)

#### Librerías Especializadas
- **QR Generation**: qrcode
- **PDF Generation**: jsPDF, html2pdf.js
- **Excel Parsing**: xlsx
- **Image Processing**: html-to-image
- **File Saving**: file-saver
- **Date Handling**: date-fns

---

## 3. Esquema de Base de Datos

### 3.1 Tabla: `clients`
```sql
CREATE TABLE clients (
  cuit BIGINT PRIMARY KEY,
  razon_social TEXT NOT NULL,
  direccion TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  contacto TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices**:
- `clients_cuit_idx` (UNIQUE)
- `clients_email_idx`

**Políticas RLS**:
- Usuarios autenticados pueden insertar, actualizar y ver todos los clientes

### 3.2 Tabla: `products`
```sql
CREATE TABLE products (
  codificacion TEXT PRIMARY KEY,
  cuit BIGINT NOT NULL REFERENCES clients(cuit) ON DELETE CASCADE,
  titular TEXT,
  tipo_certificacion TEXT,
  estado TEXT,
  en_proceso_renovacion TEXT,
  direccion_legal_empresa TEXT,
  fabricante TEXT,
  planta_fabricacion TEXT,
  origen TEXT,
  producto TEXT,
  marca TEXT,
  modelo TEXT,
  caracteristicas_tecnicas TEXT,
  normas_aplicacion TEXT,
  informe_ensayo_nro TEXT,
  laboratorio TEXT,
  ocp_extranjero TEXT,
  n_certificado_extranjero TEXT,
  fecha_emision_certificado_extranjero DATE,
  disposicion_convenio TEXT,
  cod_rubro INTEGER,
  cod_subrubro INTEGER,
  nombre_subrubro TEXT,
  fecha_emision DATE,
  vencimiento DATE,
  fecha_cancelacion DATE,
  motivo_cancelacion TEXT,
  dias_para_vencer INTEGER,
  djc_status TEXT DEFAULT 'No Generada',
  certificado_status TEXT DEFAULT 'Pendiente Subida',
  enviado_cliente TEXT DEFAULT 'Pendiente',
  certificado_path TEXT,
  djc_path TEXT,
  qr_path TEXT,
  qr_link TEXT,
  qr_status TEXT DEFAULT 'No generado',
  qr_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices Principales**:
- `products_codificacion_idx` (UNIQUE)
- `products_cuit_idx`
- `products_vencimiento_idx`
- `products_djc_status_idx`
- `products_qr_status_idx`

**Políticas RLS**:
- Lectura pública para verificación de QR
- Usuarios autenticados pueden insertar, actualizar y ver todos los productos

### 3.3 Tabla: `djc`
```sql
CREATE TABLE djc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resolucion TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  cuit BIGINT REFERENCES clients(cuit) ON DELETE CASCADE,
  marca TEXT NOT NULL,
  domicilio_legal TEXT NOT NULL,
  domicilio_planta TEXT NOT NULL,
  telefono TEXT,
  email TEXT NOT NULL,
  representante_nombre TEXT,
  representante_domicilio TEXT,
  representante_cuit TEXT,
  codigo_producto TEXT NOT NULL REFERENCES products(codificacion) ON DELETE CASCADE,
  fabricante TEXT NOT NULL,
  identificacion_producto TEXT NOT NULL,
  reglamentos TEXT,
  normas_tecnicas TEXT,
  documento_evaluacion TEXT,
  enlace_declaracion TEXT,
  fecha_lugar TEXT NOT NULL,
  firma_url TEXT,
  pdf_url TEXT,
  numero_djc TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Políticas RLS**:
- Solo el usuario que creó la DJC puede verla, editarla y eliminarla

### 3.4 Tabla: `logs`
```sql
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  error_message TEXT NOT NULL,
  context JSONB DEFAULT '{}'
);
```

**Políticas RLS**:
- Usuarios pueden insertar logs y ver solo sus propios logs

---

## 4. Arquitectura de Componentes

### 4.1 Estructura de Directorios
```
src/
├── components/
│   ├── Auth/
│   │   └── LoginForm.tsx
│   ├── Common/
│   │   ├── LoadingSpinner.tsx
│   │   └── StatusBadge.tsx
│   ├── DJC/
│   │   ├── DJCGenerator.tsx
│   │   ├── DJCPreview.jsx
│   │   └── index.js
│   ├── Layout/
│   │   ├── Header.tsx
│   │   ├── Layout.tsx
│   │   ├── MobileSidebar.tsx
│   │   └── Sidebar.tsx
│   ├── ProductDetailView.tsx
│   ├── QRCodeModal.tsx
│   ├── QRConfigModal.tsx
│   ├── QRGenerator.tsx
│   ├── QRModTool.tsx
│   └── SignatureCanvas.tsx
├── contexts/
│   ├── AuthContext.tsx
│   └── LanguageContext.tsx
├── hooks/
│   └── useSupabaseConnection.ts
├── lib/
│   ├── supabase.ts
│   └── supabase-public.ts
├── pages/
│   ├── ClientManagement.tsx
│   ├── Dashboard.tsx
│   ├── DJCManagement.tsx
│   ├── InformationValidation.tsx
│   ├── ProductDetailView.tsx
│   ├── ProductManagement.tsx
│   ├── ProductPassport.tsx
│   └── QRLanding.tsx
├── services/
│   ├── djc.service.js
│   └── qrConfig.service.ts
├── styles/
│   ├── fonts.css
│   └── modern-design.css
└── utils/
    ├── djc.js
    ├── excelParser.ts
    ├── excelParsingService.ts
    ├── formatters.ts
    └── qrModConfig.ts
```

### 4.2 Componentes Principales

#### 4.2.1 Layout Components
- **Layout.tsx**: Contenedor principal con sidebar y header
- **Header.tsx**: Barra superior con navegación y usuario
- **Sidebar.tsx**: Navegación lateral para desktop
- **MobileSidebar.tsx**: Navegación móvil con overlay

#### 4.2.2 Auth Components
- **LoginForm.tsx**: Formulario de autenticación con soporte multiidioma

#### 4.2.3 Management Components
- **Dashboard.tsx**: Panel principal con estadísticas y resúmenes
- **ProductManagement.tsx**: Gestión completa de productos
- **ClientManagement.tsx**: Gestión de clientes
- **DJCManagement.tsx**: Administración de DJCs
- **InformationValidation.tsx**: Validación de archivos Excel

#### 4.2.4 QR Components
- **QRGenerator.tsx**: Generación de códigos QR con configuración avanzada
- **QRCodeModal.tsx**: Modal para mostrar y descargar QRs
- **QRConfigModal.tsx**: Configuración de URLs base para QRs
- **QRModTool.tsx**: Herramienta de desarrollo para ajustar QRs

#### 4.2.5 Public Components
- **QRLanding.tsx**: Página de transición para QRs escaneados
- **ProductPassport.tsx**: Información pública del producto

---

## 5. Flujos de Usuario

### 5.1 Flujo de Autenticación
1. Usuario accede a la aplicación
2. Si no está autenticado → `LoginForm.tsx`
3. Ingresa credenciales (email/password)
4. Supabase Auth valida credenciales
5. Si es válido → Redirección a Dashboard
6. Si es inválido → Mensaje de error

### 5.2 Flujo de Gestión de Productos
1. Usuario navega a "Gestión de Productos"
2. Ve lista de productos con estadísticas
3. Puede filtrar, buscar y exportar
4. Selecciona producto → Modal de detalle
5. Edita información en pestañas organizadas
6. Genera QR si es necesario
7. Guarda cambios → Actualización en base de datos

### 5.3 Flujo de Generación de DJC
1. Usuario navega a "Gestión de DJC"
2. Selecciona cliente y producto
3. Elige resolución aplicable
4. Sistema genera vista previa de DJC
5. Usuario revisa información
6. Confirma generación → PDF creado y guardado
7. DJC se almacena en Supabase Storage

### 5.4 Flujo de Verificación Pública (QR)
1. Usuario escanea código QR
2. Redirección a `/qr/:uuid` (QRLanding)
3. Página de transición con countdown
4. Redirección automática a `/products/:uuid`
5. ProductPassport muestra información pública
6. No requiere autenticación

---

## 6. Configuración de QR

### 6.1 Servicio de Configuración
- **Archivo**: `qrConfig.service.ts`
- **Propósito**: Gestionar URLs base para códigos QR
- **Almacenamiento**: localStorage del navegador
- **Configuración por defecto**: Detecta automáticamente desarrollo vs producción

### 6.2 Estructura de URLs
```
Desarrollo: http://localhost:3000/qr/[CODIGO_PRODUCTO]
Producción: https://verificar.argentina.gob.ar/qr/[CODIGO_PRODUCTO]
```

### 6.3 Herramienta de Modificación QR
- **Componente**: `QRModTool.tsx`
- **Propósito**: Ajustar diseño de etiquetas QR en desarrollo
- **Características**:
  - Ajuste de posiciones y tamaños
  - Carga de fuentes personalizadas
  - Vista previa en tiempo real
  - Exportación de configuraciones

---

## 7. Gestión de Archivos

### 7.1 Supabase Storage
- **Bucket**: `documents` (público)
- **Tipos de archivo**: PDF, JPG, PNG
- **Estructura de nombres**: `{tipo}_{codigo_producto}_{timestamp}.{ext}`

### 7.2 Tipos de Documentos
- **Certificados**: Almacenados en `certificado_path`
- **DJCs**: Almacenados en `djc_path`
- **QRs**: Datos base64 en `qr_path`

---

## 8. Validación de Datos

### 8.1 Validación de Excel
- **Servicio**: `excelParsingService.ts`
- **Formatos soportados**: .xlsx, .xls
- **Validaciones**:
  - Estructura de headers
  - Tipos de datos
  - Campos obligatorios
  - Duplicados

### 8.2 Campos Obligatorios

#### Productos
- `codificacion` (único)
- `producto`
- `marca`
- `titular`
- `cuit` (referencia a cliente)
- `origen`
- `fabricante`
- `normas_aplicacion`
- `informe_ensayo_nro`

#### Clientes
- `cuit` (único)
- `razon_social`
- `direccion`
- `email`
- `telefono`

---

## 9. Estados y Flujos de Trabajo

### 9.1 Estados de DJC
1. **No Generada**: Estado inicial
2. **Generada Pendiente de Firma**: DJC creada, esperando firma
3. **Firmada**: DJC firmada y lista para envío

### 9.2 Estados de Certificado
1. **Pendiente Subida**: Esperando carga de archivo
2. **Subido**: Certificado cargado y disponible

### 9.3 Estados de Envío
1. **Pendiente**: No enviado al cliente
2. **Enviado**: Entregado al cliente

### 9.4 Estados de QR
1. **No generado**: Sin código QR
2. **Generado**: QR creado y funcional
3. **Pendiente regeneración**: Requiere actualización por cambios en datos

---

## 10. Seguridad

### 10.1 Autenticación
- **Método**: Email y contraseña
- **Proveedor**: Supabase Auth
- **Sesiones**: Persistentes con refresh automático
- **Confirmación**: Deshabilitada por defecto

### 10.2 Row Level Security (RLS)

#### Tabla `products`
```sql
-- Lectura pública para QR
CREATE POLICY "Allow public product read for QR" ON products
  FOR SELECT TO public USING (true);

-- Gestión para usuarios autenticados
CREATE POLICY "Users can manage products" ON products
  FOR ALL TO authenticated USING (true);
```

#### Tabla `clients`
```sql
-- Solo usuarios autenticados
CREATE POLICY "Users can manage clients" ON clients
  FOR ALL TO authenticated USING (true);
```

#### Tabla `djc`
```sql
-- Solo el creador puede gestionar sus DJCs
CREATE POLICY "Users can manage own DJCs" ON djc
  FOR ALL TO authenticated 
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
```

### 10.3 Storage Security
- **Bucket `documents`**: Acceso público de lectura
- **Archivos**: Accesibles por URL directa
- **Subida**: Solo usuarios autenticados

---

## 11. Internacionalización

### 11.1 Idiomas Soportados
- **Español (es)**: Idioma principal
- **Inglés (en)**: Idioma secundario

### 11.2 Implementación
- **Context**: `LanguageContext.tsx`
- **Almacenamiento**: Estado local del componente
- **Traducciones**: Objeto estático con claves

---

## 12. Responsive Design

### 12.1 Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### 12.2 Adaptaciones Móviles
- Sidebar colapsable
- Tablas con scroll horizontal
- Formularios apilados verticalmente
- Botones de tamaño táctil
- Navegación simplificada

---

## 13. Performance y Optimización

### 13.1 Carga de Datos
- **Paginación**: Lotes de 1000 registros para productos
- **Lazy Loading**: Componentes cargados bajo demanda
- **Caché**: localStorage para configuraciones

### 13.2 Optimizaciones de Bundle
- **Code Splitting**: Por rutas principales
- **Tree Shaking**: Eliminación de código no usado
- **Minificación**: Automática en producción

---

## 14. Monitoreo y Logs

### 14.1 Sistema de Logs
- **Tabla**: `logs`
- **Tipos**: Errores, actividades, validaciones
- **Contexto**: Información adicional en formato JSON
- **Retención**: Definida por políticas de base de datos

### 14.2 Métricas del Dashboard
- Total de productos y clientes
- Productos vigentes vs vencidos
- Productos con/sin QR
- Productos con/sin DJC
- Datos faltantes por completar

---

## 15. Configuración de Desarrollo

### 15.1 Variables de Entorno
```env
VITE_SUPABASE_URL=https://[proyecto].supabase.co
VITE_SUPABASE_ANON_KEY=[clave_anonima]
```

### 15.2 Scripts de Desarrollo
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint ."
}
```

### 15.3 Herramientas de Desarrollo
- **QRModTool**: Ajuste visual de etiquetas QR
- **Hot Reload**: Recarga automática en desarrollo
- **TypeScript**: Verificación de tipos en tiempo real

---

## 16. Deployment y Producción

### 16.1 Build Process
1. TypeScript compilation
2. Vite bundling y optimización
3. Asset optimization
4. Static file generation

### 16.2 Consideraciones de Producción
- **HTTPS**: Requerido para funcionalidades de QR
- **CDN**: Para assets estáticos
- **Backup**: Base de datos y storage
- **Monitoring**: Logs de errores y performance

---

## 17. Mantenimiento y Actualizaciones

### 17.1 Actualizaciones de Datos
- **Sincronización**: Manual desde interfaz
- **Validación**: Antes de cada carga
- **Backup**: Antes de cambios masivos

### 17.2 Versionado
- **Semantic Versioning**: MAJOR.MINOR.PATCH
- **Migrations**: SQL para cambios de esquema
- **Rollback**: Capacidad de revertir cambios

---

## 18. Casos de Uso Principales

### 18.1 Gestión de Certificación
1. **Carga de Cliente**: Registro de nueva empresa
2. **Carga de Producto**: Asociación con cliente y datos técnicos
3. **Validación**: Verificación de completitud de datos
4. **Generación de QR**: Código para verificación pública
5. **Creación de DJC**: Documento oficial de conformidad
6. **Entrega**: Envío de documentos al cliente

### 18.2 Verificación Pública
1. **Escaneo de QR**: Usuario final escanea código
2. **Redirección**: A página de verificación
3. **Consulta**: Información pública del producto
4. **Validación**: Confirmación de autenticidad

---

## 19. Consideraciones Técnicas Especiales

### 19.1 Generación de QR
- **Tamaño**: 25mm x 30mm para impresión
- **Resolución**: 300 DPI para calidad profesional
- **Formato**: PNG con fondo blanco
- **Contenido**: URL de verificación pública

### 19.2 Generación de PDF
- **Formato**: A4 para DJCs
- **Fuentes**: Embebidas para compatibilidad
- **Calidad**: Alta resolución para impresión
- **Estructura**: Conforme a regulaciones argentinas

### 19.3 Manejo de Fechas
- **Formato**: ISO 8601 en base de datos
- **Visualización**: dd/MM/yyyy para usuarios argentinos
- **Cálculos**: Días para vencimiento automáticos
- **Zona horaria**: UTC en base de datos, local en interfaz

---

## 20. Roadmap y Mejoras Futuras

### 20.1 Funcionalidades Planificadas
- [ ] Notificaciones automáticas de vencimientos
- [ ] Integración con APIs gubernamentales
- [ ] Firma digital de DJCs
- [ ] Dashboard de analytics avanzado
- [ ] API REST para integraciones externas

### 20.2 Optimizaciones Técnicas
- [ ] Implementación de PWA
- [ ] Caché offline para datos críticos
- [ ] Compresión de imágenes automática
- [ ] Búsqueda full-text en productos

---

## 21. Contacto y Soporte

### 21.1 Documentación Técnica
- **Código fuente**: Comentado y documentado
- **APIs**: Documentación de endpoints
- **Base de datos**: Esquemas y relaciones

### 21.2 Mantenimiento
- **Actualizaciones**: Mensuales para dependencias
- **Seguridad**: Parches inmediatos
- **Performance**: Monitoreo continuo

---

*Documento generado automáticamente - Versión 1.0*
*Última actualización: Enero 2025*