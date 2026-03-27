/*
  # Add Fields Tracking to Certificate Processing Log

  ## Summary
  Adds columns to track which product fields were extracted and updated from certificate files.
  This enables detailed field-level diagnostics and reporting.

  ## Changes
  1. New Columns
    - `fields_updated` (jsonb) - Array of field names that were extracted from certificate
    - `fields_count` (integer) - Count of fields extracted for quick statistics

  ## Notes
  - These fields help diagnose which data is being captured from certificate files
  - Enables reporting on field coverage and data completeness
  - Supports the new dynamic field mapping system
*/

-- Add new columns for field-level tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certificate_processing_log' AND column_name = 'fields_updated'
  ) THEN
    ALTER TABLE certificate_processing_log ADD COLUMN fields_updated jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certificate_processing_log' AND column_name = 'fields_count'
  ) THEN
    ALTER TABLE certificate_processing_log ADD COLUMN fields_count integer DEFAULT 0;
  END IF;
END $$;

-- Create index for analytics on field count
CREATE INDEX IF NOT EXISTS idx_cert_log_fields_count ON certificate_processing_log(fields_count);
