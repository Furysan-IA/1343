/*
  # Add Simplified Version Code Field

  1. Changes
    - Add `codigo_version_simplificada` column to products table
      - Stores the simplified version code from column AN
      - This is used when generating simplified DJC versions
      - Can be edited manually or populated from Excel uploads

  2. Notes
    - Field is optional (nullable) for backward compatibility
    - Existing products without this field can still generate standard DJCs
    - Column AE (ESTADO ENSAYOS) will now be mapped to the existing estado field

  INSTRUCTIONS:
  Run this SQL in your Supabase SQL Editor to add the new column.
*/

-- Add codigo_version_simplificada column
ALTER TABLE products
ADD COLUMN IF NOT EXISTS codigo_version_simplificada text;

-- Add comment for documentation
COMMENT ON COLUMN products.codigo_version_simplificada IS 'Código de versión simplificada para DJC (columna AN del Excel)';
