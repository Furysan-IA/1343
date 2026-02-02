/*
  # Add Simplified Version Support to DJC Table

  1. Changes
    - Add `is_simplified` column to `djc` table
      - Type: boolean
      - Default: false
      - Not null

  2. Purpose
    - Track whether a DJC was generated in simplified version (without fabricante field)
    - Maintain historical record of DJC generation preferences
    - Enable future filtering and reporting capabilities
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'is_simplified'
  ) THEN
    ALTER TABLE djc ADD COLUMN is_simplified BOOLEAN DEFAULT false NOT NULL;
    COMMENT ON COLUMN djc.is_simplified IS 'Indicates if the DJC was generated in simplified version (without fabricante field in product information section)';
  END IF;
END $$;
