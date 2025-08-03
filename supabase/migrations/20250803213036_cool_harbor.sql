/*
  # Add telefono and contacto columns to clients table

  1. New Columns
    - `telefono` (text, nullable) - Phone number for client contact
    - `contacto` (text, nullable) - Contact person name
  
  2. Purpose
    - Required for DJC generation (telefono is mandatory for legal documents)
    - Useful for client management and communication
    
  3. Notes
    - Both fields are nullable to maintain backward compatibility
    - No default values to allow empty fields to show as blank
*/

DO $$
BEGIN
  -- Add telefono column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'telefono'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN telefono text;
  END IF;

  -- Add contacto column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'contacto'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN contacto text;
  END IF;
END $$;