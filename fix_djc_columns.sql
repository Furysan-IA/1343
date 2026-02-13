/*
  # Fix DJC Table - Add Missing Columns

  This migration adds all required columns to the djc table to fix the 400 errors.

  1. Columns Added:
    - djc_source: Tracks if DJC is auto-generated or manually uploaded
    - djc_version: Version number for tracking replacements
    - is_active: Marks which DJC version is currently active
    - replaced_by: Links to newer versions
    - is_simplified: Tracks if simplified template was used

  2. Purpose:
    - Fixes PGRST204 errors about missing columns
    - Enables proper DJC lifecycle management
    - Supports version tracking and replacement workflow

  3. Safety:
    - Uses IF NOT EXISTS checks - safe to run multiple times
    - Sets sensible defaults for existing records
    - Creates indexes for better performance
*/

-- Add all required DJC tracking columns
DO $$
BEGIN
  -- Add djc_source column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'djc_source'
  ) THEN
    ALTER TABLE djc ADD COLUMN djc_source text DEFAULT 'auto_generated' CHECK (djc_source IN ('auto_generated', 'manually_uploaded'));
    RAISE NOTICE 'Added djc_source column';
  ELSE
    RAISE NOTICE 'djc_source column already exists';
  END IF;

  -- Add djc_version column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'djc_version'
  ) THEN
    ALTER TABLE djc ADD COLUMN djc_version integer DEFAULT 1;
    RAISE NOTICE 'Added djc_version column';
  ELSE
    RAISE NOTICE 'djc_version column already exists';
  END IF;

  -- Add is_active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE djc ADD COLUMN is_active boolean DEFAULT true;
    RAISE NOTICE 'Added is_active column';
  ELSE
    RAISE NOTICE 'is_active column already exists';
  END IF;

  -- Add replaced_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'replaced_by'
  ) THEN
    ALTER TABLE djc ADD COLUMN replaced_by uuid REFERENCES djc(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added replaced_by column';
  ELSE
    RAISE NOTICE 'replaced_by column already exists';
  END IF;

  -- Add is_simplified column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'is_simplified'
  ) THEN
    ALTER TABLE djc ADD COLUMN is_simplified boolean DEFAULT false NOT NULL;
    RAISE NOTICE 'Added is_simplified column';
  ELSE
    RAISE NOTICE 'is_simplified column already exists';
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_djc_codigo_producto_active ON djc(codigo_producto) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_djc_source ON djc(djc_source);
CREATE INDEX IF NOT EXISTS idx_djc_is_active ON djc(is_active);
CREATE INDEX IF NOT EXISTS idx_djc_created_at ON djc(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_djc_is_simplified ON djc(is_simplified);

-- Add comments to document the schema
COMMENT ON COLUMN djc.djc_source IS 'Source of the DJC: auto_generated (from DJC Generator) or manually_uploaded (signed version uploaded by user)';
COMMENT ON COLUMN djc.djc_version IS 'Version number of the DJC, increments when replaced';
COMMENT ON COLUMN djc.is_active IS 'Whether this DJC version is currently active/displayed';
COMMENT ON COLUMN djc.replaced_by IS 'UUID of the DJC that replaced this one (if any)';
COMMENT ON COLUMN djc.is_simplified IS 'Indicates if simplified DJC version was used (true) or full version (false)';

-- Verify the changes
DO $$
DECLARE
  column_count integer;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'djc'
  AND column_name IN ('djc_source', 'djc_version', 'is_active', 'replaced_by', 'is_simplified');

  RAISE NOTICE '✓ Migration complete! Added % columns to djc table', column_count;
END $$;
