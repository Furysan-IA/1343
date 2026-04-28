/*
  # Asegurar que Realtime esté habilitado para Products

  1. Cambios
    - Añade la tabla products a la publicación supabase_realtime
    - Verifica y habilita la replicación en tiempo real
    - Configura correctamente REPLICA IDENTITY para cambios completos

  2. Seguridad
    - No cambia las políticas RLS existentes
    - Las suscripciones respetan las políticas de seguridad
    - Solo usuarios autenticados pueden suscribirse

  3. Notas
    - Esto permite que DJCGenerator reciba actualizaciones automáticas
    - Especialmente importante para qr_link cuando se regenera el QR
    - REPLICA IDENTITY FULL envía todos los campos en las actualizaciones
*/

-- Configurar REPLICA IDENTITY FULL para enviar todos los campos en los cambios
-- Esto es importante para que la suscripción reciba el qr_link actualizado
ALTER TABLE products REPLICA IDENTITY FULL;

-- Añadir la tabla products a la publicación de Realtime
-- Esto habilita las suscripciones en tiempo real
DO $$
BEGIN
  -- Verificar si la tabla ya está en la publicación
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'products'
  ) THEN
    -- Agregar la tabla a la publicación
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
    RAISE NOTICE 'Realtime habilitado para la tabla products';
  ELSE
    RAISE NOTICE 'Realtime ya estaba habilitado para la tabla products';
  END IF;
END $$;

-- Verificación: Mostrar el estado actual
DO $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'products'
  ) INTO is_enabled;
  
  IF is_enabled THEN
    RAISE NOTICE '✅ Realtime está ACTIVO para products';
  ELSE
    RAISE WARNING '❌ Realtime NO está activo para products';
  END IF;
END $$;
