/*
  # Add QR Tracking Columns to Products Table

  1. Changes
    - Add `qr_status` (text) - Track QR code generation status (e.g., 'generated', 'pending', 'shared')
    - Add `qr_generated_at` (timestamptz) - Timestamp when QR code was generated
    - Add `qr_config` (jsonb) - Store QR configuration settings (size, color, format, etc.)

  2. Purpose
    - Enable proper tracking of QR code lifecycle
    - Support QR sharing functionality
    - Store QR customization settings

  3. Notes
    - These columns are optional (nullable)
    - qr_status defaults to 'pending' for new products
    - qr_config stores JSON data for flexibility

  INSTRUCTIONS:
  Execute this SQL in your Supabase SQL Editor at:
  https://supabase.com/dashboard/project/gmwwvowphjxmertcedtt/sql/new
*/

-- Add qr_status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'qr_status'
  ) THEN
    ALTER TABLE products ADD COLUMN qr_status TEXT DEFAULT 'pending';
    RAISE NOTICE 'Column qr_status added successfully';
  ELSE
    RAISE NOTICE 'Column qr_status already exists';
  END IF;
END $$;

-- Add qr_generated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'qr_generated_at'
  ) THEN
    ALTER TABLE products ADD COLUMN qr_generated_at TIMESTAMPTZ;
    RAISE NOTICE 'Column qr_generated_at added successfully';
  ELSE
    RAISE NOTICE 'Column qr_generated_at already exists';
  END IF;
END $$;

-- Add qr_config column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'qr_config'
  ) THEN
    ALTER TABLE products ADD COLUMN qr_config JSONB;
    RAISE NOTICE 'Column qr_config added successfully';
  ELSE
    RAISE NOTICE 'Column qr_config already exists';
  END IF;
END $$;

-- Create index for qr_status for better query performance
CREATE INDEX IF NOT EXISTS products_qr_status_idx ON products(qr_status);

-- Update existing products with null qr_path to have 'pending' status
UPDATE products
SET qr_status = 'pending'
WHERE qr_path IS NULL AND (qr_status IS NULL OR qr_status = '');

-- Update existing products with qr_path to have 'generated' status
UPDATE products
SET qr_status = 'generated'
WHERE qr_path IS NOT NULL AND (qr_status IS NULL OR qr_status = 'pending');

-- Confirm completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
END $$;
