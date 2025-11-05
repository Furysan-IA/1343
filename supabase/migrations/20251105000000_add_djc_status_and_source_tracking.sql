/*
  # Add DJC Status and Source Tracking

  1. Changes
    - Add `djc_source` column to track if DJC is auto-generated or manually uploaded
    - Add `djc_version` column to track version number
    - Add `is_active` column to mark which DJC is currently active
    - Add `replaced_by` column to link to newer versions
    - Add indexes for better query performance

  2. Purpose
    - Distinguish between auto-generated and manually uploaded DJCs
    - Track version history when DJCs are replaced
    - Ensure Product Passport shows the correct (most recent signed) version
    - Enable proper DJC lifecycle management

  3. Notes
    - Existing records will default to 'auto_generated' source
    - All existing records will be marked as active
    - Version starts at 1 for existing records
*/

-- Add new columns to djc table
DO $$
BEGIN
  -- Add djc_source column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'djc_source'
  ) THEN
    ALTER TABLE djc ADD COLUMN djc_source text DEFAULT 'auto_generated' CHECK (djc_source IN ('auto_generated', 'manually_uploaded'));
  END IF;

  -- Add djc_version column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'djc_version'
  ) THEN
    ALTER TABLE djc ADD COLUMN djc_version integer DEFAULT 1;
  END IF;

  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE djc ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  -- Add replaced_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'replaced_by'
  ) THEN
    ALTER TABLE djc ADD COLUMN replaced_by uuid REFERENCES djc(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_djc_codigo_producto_active ON djc(codigo_producto) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_djc_source ON djc(djc_source);
CREATE INDEX IF NOT EXISTS idx_djc_is_active ON djc(is_active);
CREATE INDEX IF NOT EXISTS idx_djc_created_at ON djc(created_at DESC);

-- Add comment to document the schema changes
COMMENT ON COLUMN djc.djc_source IS 'Source of the DJC: auto_generated (from DJC Generator) or manually_uploaded (signed version uploaded by user)';
COMMENT ON COLUMN djc.djc_version IS 'Version number of the DJC, increments when replaced';
COMMENT ON COLUMN djc.is_active IS 'Whether this DJC version is currently active/displayed';
COMMENT ON COLUMN djc.replaced_by IS 'UUID of the DJC that replaced this one (if any)';
