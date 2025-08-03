/*
  # Create DJC Management Tables

  1. New Tables
    - `djc`
      - `id` (uuid, primary key)
      - `resolucion` (text, not null)
      - `razon_social` (text, not null)
      - `cuit` (bigint, references clients.cuit)
      - `marca` (text, not null)
      - `domicilio_legal` (text, not null)
      - `domicilio_planta` (text, not null)
      - `telefono` (text)
      - `email` (text, not null)
      - `representante_nombre` (text)
      - `representante_domicilio` (text)
      - `representante_cuit` (text)
      - `codigo_producto` (text, references products.codificacion)
      - `fabricante` (text, not null)
      - `identificacion_producto` (text, not null)
      - `reglamentos` (text)
      - `normas_tecnicas` (text)
      - `documento_evaluacion` (text)
      - `enlace_declaracion` (text)
      - `fecha_lugar` (text, not null)
      - `firma_url` (text)
      - `pdf_url` (text)
      - `numero_djc` (text)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `djc_history`
      - `id` (uuid, primary key)
      - `djc_id` (uuid, references djc.id)
      - `action` (text, not null)
      - `changed_fields` (jsonb)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)

    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `role` (user_role_enum)
      - `full_name` (text)
      - `company` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data
    - Add policies for super_admin and coordinator roles

  3. Indexes
    - Add indexes for performance optimization on frequently queried columns
*/

-- Tipo ENUM para estados de DJC
CREATE TYPE public.djc_estado_enum AS ENUM ('pendiente', 'cargado');

-- Tabla de Declaraciones Juradas (DJC)
CREATE TABLE IF NOT EXISTS public.djc (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resolucion text NOT NULL,
    razon_social text NOT NULL,
    cuit bigint, -- Cambiado a bigint para coincidir con clients.cuit
    marca text NOT NULL,
    domicilio_legal text NOT NULL,
    domicilio_planta text NOT NULL,
    telefono text, -- Puede ser nulo si no se obtiene de products/clients
    email text NOT NULL,
    representante_nombre text,
    representante_domicilio text,
    representante_cuit text,
    codigo_producto text NOT NULL, -- Referencia a products.codificacion
    fabricante text NOT NULL,
    identificacion_producto text NOT NULL,
    reglamentos text, -- Puede ser nulo si no se obtiene de products
    normas_tecnicas text, -- Puede ser nulo si no se obtiene de products
    documento_evaluacion text, -- Puede ser nulo si no se obtiene de products
    enlace_declaracion text,
    fecha_lugar text NOT NULL,
    firma_url text, -- URL de la firma digitalizada
    pdf_url text,   -- URL del PDF generado de la DJC
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id), -- Usuario que creó la DJC
    numero_djc text, -- Número de identificación de la DJC
    updated_at timestamp with time zone DEFAULT now() -- Columna para registrar la última actualización
);

-- Añadir clave foránea a products.codificacion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_djc_product_codificacion'
    ) THEN
        ALTER TABLE public.djc
        ADD CONSTRAINT fk_djc_product_codificacion
        FOREIGN KEY (codigo_producto) REFERENCES public.products(codificacion) ON DELETE CASCADE;
    END IF;
END $$;

-- Añadir clave foránea a clients.cuit
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_djc_client_cuit'
    ) THEN
        ALTER TABLE public.djc
        ADD CONSTRAINT fk_djc_client_cuit
        FOREIGN KEY (cuit) REFERENCES public.clients(cuit) ON DELETE CASCADE;
    END IF;
END $$;

-- Trigger para actualizar 'updated_at' en la tabla 'djc'
-- La función update_updated_at_column() ya existe en tu esquema
CREATE TRIGGER update_djc_updated_at
BEFORE UPDATE ON public.djc
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS djc_created_by_idx ON public.djc USING btree (created_by);
CREATE INDEX IF NOT EXISTS djc_codigo_producto_idx ON public.djc USING btree (codigo_producto);
CREATE INDEX IF NOT EXISTS djc_cuit_idx ON public.djc USING btree (cuit);

-- Tabla de Historial de DJC
CREATE TABLE IF NOT EXISTS public.djc_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    djc_id uuid REFERENCES public.djc(id) ON DELETE CASCADE, -- FK a la DJC
    action text NOT NULL, -- Ej: 'create', 'update', 'sign'
    changed_fields jsonb DEFAULT '{}' NOT NULL, -- Detalles de los campos modificados
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) -- Usuario que realizó la acción
);

-- Índices para el historial
CREATE INDEX IF NOT EXISTS djc_history_created_at_idx ON public.djc_history USING btree (created_at);
CREATE INDEX IF NOT EXISTS djc_history_created_by_idx ON public.djc_history USING btree (created_by);
CREATE INDEX IF NOT EXISTS djc_history_djc_id_idx ON public.djc_history USING btree (djc_id);

-- Tabla de Perfiles de Usuario (para roles y detalles adicionales)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id), -- FK a auth.users
    role user_role_enum DEFAULT 'client'::public.user_role_enum NOT NULL,
    full_name text,
    company text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Políticas para la tabla 'djc'
ALTER TABLE public.djc ENABLE ROW LEVEL SECURITY;

-- Permitir a usuarios autenticados seleccionar sus propias DJC
CREATE POLICY "enable_auth_select_djc"
ON public.djc FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Permitir a usuarios autenticados insertar sus propias DJC
CREATE POLICY "enable_auth_insert_djc"
ON public.djc FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Permitir a usuarios autenticados actualizar sus propias DJC
CREATE POLICY "enable_auth_update_djc"
ON public.djc FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Permitir a usuarios autenticados eliminar sus propias DJC
CREATE POLICY "enable_auth_delete_djc"
ON public.djc FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Políticas para la tabla 'djc_history'
ALTER TABLE public.djc_history ENABLE ROW LEVEL SECURITY;

-- Permitir a usuarios autenticados insertar historial para sus DJC
CREATE POLICY "enable_auth_insert_djc_history"
ON public.djc_history FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = created_by) AND (EXISTS ( SELECT 1 FROM djc WHERE ((djc.id = djc_history.djc_id) AND (djc.created_by = auth.uid())))));

-- Permitir a usuarios autenticados seleccionar historial de sus DJC
CREATE POLICY "enable_auth_select_djc_history"
ON public.djc_history FOR SELECT
TO authenticated
USING (EXISTS ( SELECT 1 FROM djc WHERE ((djc.id = djc_history.djc_id) AND (djc.created_by = auth.uid()))));

-- Políticas para la tabla 'user_profiles'
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden crear su propio perfil al registrarse
CREATE POLICY "users_create_own_profile"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Los usuarios pueden leer su propio perfil
CREATE POLICY "users_read_own_profile"
ON public.user_profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Los super_admins tienen acceso completo a los perfiles
CREATE POLICY "super_admin_full_access"
ON public.user_profiles FOR ALL
TO authenticated
USING (EXISTS ( SELECT 1 FROM auth.users WHERE ((auth.users.id = auth.uid()) AND (auth.users.id IN ( SELECT user_profiles_1.id FROM user_profiles user_profiles_1 WHERE (user_profiles_1.role = 'super_admin'::user_role_enum))))))
WITH CHECK (EXISTS ( SELECT 1 FROM auth.users WHERE ((auth.users.id = auth.uid()) AND (auth.users.id IN ( SELECT user_profiles_1.id FROM user_profiles user_profiles_1 WHERE (user_profiles_1.role = 'super_admin'::user_role_enum))))));

-- Los coordinadores pueden leer perfiles de clientes
CREATE POLICY "coordinator_read_clients"
ON public.user_profiles FOR SELECT
TO authenticated
USING (((EXISTS ( SELECT 1 FROM user_profiles user_profiles_1 WHERE ((user_profiles_1.id = auth.uid()) AND (user_profiles_1.role = 'coordinator'::user_role_enum)))) AND (role = 'client'::user_role_enum)));