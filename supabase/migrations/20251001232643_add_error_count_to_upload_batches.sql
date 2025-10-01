/*
  # Add error_count column to upload_batches

  1. Changes
    - Add `error_count` column to `upload_batches` table
    - Default value is 0
    - This column tracks the number of errors during batch processing

  2. Security
    - No changes to RLS policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'upload_batches' AND column_name = 'error_count'
  ) THEN
    ALTER TABLE upload_batches ADD COLUMN error_count integer DEFAULT 0;
  END IF;
END $$;
