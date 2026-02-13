/*
  # Add QR Sharing System for Product Revisions

  1. Changes
    - Add `shared_qr_from` column to track QR reuse from other products
    - Add `is_qr_master` column to identify products whose QRs are being shared
    - Create indexes for efficient QR sharing queries
    - Create view for QR sharing relationships
    - Add constraint to prevent circular references

  2. Purpose
    - Enable products (especially revisions like R1, R2) to reuse QR codes
    - Maintain same physical QR while showing updated information
    - Track which products share QRs from which sources
    - Support multiple products sharing the same QR

  3. Use Cases
    - Product "ABC123" has QR generated
    - Product "ABC123-R1" can reuse the same QR
    - When QR is scanned, shows latest revision information
    - Physical QR doesn't change, but data displayed does

  4. Notes
    - shared_qr_from is nullable (NULL = uses own QR)
    - is_qr_master tracks if other products use this product's QR
    - Validation ensures referenced product exists and has QR
*/

-- Add shared_qr_from column to track QR reuse
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'shared_qr_from'
  ) THEN
    ALTER TABLE products ADD COLUMN shared_qr_from text;
    COMMENT ON COLUMN products.shared_qr_from IS 'Codificacion of the product from which this product reuses the QR code. NULL means uses own QR.';
  END IF;
END $$;

-- Add is_qr_master column to identify products whose QRs are shared
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_qr_master'
  ) THEN
    ALTER TABLE products ADD COLUMN is_qr_master boolean DEFAULT false;
    COMMENT ON COLUMN products.is_qr_master IS 'Indicates if this product QR is being reused by other products';
  END IF;
END $$;

-- Create index for shared_qr_from lookups
CREATE INDEX IF NOT EXISTS idx_products_shared_qr_from ON products(shared_qr_from) WHERE shared_qr_from IS NOT NULL;

-- Create index for finding QR master products
CREATE INDEX IF NOT EXISTS idx_products_is_qr_master ON products(is_qr_master) WHERE is_qr_master = true;

-- Add foreign key constraint to ensure referenced product exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_products_shared_qr_from'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT fk_products_shared_qr_from
    FOREIGN KEY (shared_qr_from)
    REFERENCES products(codificacion)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create view for QR sharing relationships
CREATE OR REPLACE VIEW qr_sharing_relationships AS
SELECT
  p1.codificacion as producto_revision,
  p1.producto as nombre_producto_revision,
  p1.uuid as uuid_revision,
  p1.shared_qr_from as producto_original,
  p2.producto as nombre_producto_original,
  p2.uuid as uuid_original,
  p2.qr_link as qr_compartido,
  p2.qr_path as qr_image_path,
  p2.qr_status as estado_qr,
  p2.qr_generated_at as qr_generado_en,
  COUNT(*) OVER (PARTITION BY p1.shared_qr_from) as total_productos_usando_este_qr
FROM products p1
INNER JOIN products p2 ON p1.shared_qr_from = p2.codificacion
WHERE p1.shared_qr_from IS NOT NULL;

-- Grant access to view
GRANT SELECT ON qr_sharing_relationships TO authenticated;

-- Function to detect if a product code is a revision (ends with R1, R2, etc.)
CREATE OR REPLACE FUNCTION is_revision_code(code text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Check if code ends with -R followed by one or more digits
  RETURN code ~ '.*-R\d+$';
END;
$$;

-- Function to get base product code from revision code
CREATE OR REPLACE FUNCTION get_base_product_code(revision_code text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Remove -R# suffix to get base code
  IF is_revision_code(revision_code) THEN
    RETURN regexp_replace(revision_code, '-R\d+$', '');
  ELSE
    RETURN revision_code;
  END IF;
END;
$$;

-- Function to get all products sharing a specific QR
CREATE OR REPLACE FUNCTION get_products_using_qr(source_codificacion text)
RETURNS TABLE (
  codificacion text,
  producto text,
  uuid uuid,
  marca text,
  modelo text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.codificacion,
    p.producto,
    p.uuid,
    p.marca,
    p.modelo,
    p.created_at
  FROM products p
  WHERE p.shared_qr_from = source_codificacion
  ORDER BY p.codificacion;
END;
$$;

-- Function to validate QR sharing (prevent circular references)
CREATE OR REPLACE FUNCTION validate_qr_sharing(
  product_code text,
  share_from_code text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  source_shared_from text;
BEGIN
  -- Can't share from yourself
  IF product_code = share_from_code THEN
    RAISE EXCEPTION 'Un producto no puede compartir QR consigo mismo';
  END IF;

  -- Check if source product exists
  IF NOT EXISTS (SELECT 1 FROM products WHERE codificacion = share_from_code) THEN
    RAISE EXCEPTION 'El producto origen % no existe', share_from_code;
  END IF;

  -- Check if source product has QR generated
  IF NOT EXISTS (
    SELECT 1 FROM products
    WHERE codificacion = share_from_code
    AND qr_path IS NOT NULL
    AND qr_link IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'El producto origen % no tiene QR generado', share_from_code;
  END IF;

  -- Check for circular reference (source is also sharing from somewhere)
  SELECT shared_qr_from INTO source_shared_from
  FROM products
  WHERE codificacion = share_from_code;

  IF source_shared_from IS NOT NULL THEN
    RAISE EXCEPTION 'El producto origen % ya está compartiendo QR de otro producto. No se permiten referencias encadenadas.', share_from_code;
  END IF;

  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_revision_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_base_product_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_products_using_qr(text) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_qr_sharing(text, text) TO authenticated;

-- Create trigger to automatically update is_qr_master flag
CREATE OR REPLACE FUNCTION update_qr_master_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a product starts sharing from another, mark that product as master
  IF NEW.shared_qr_from IS NOT NULL AND (OLD.shared_qr_from IS NULL OR OLD.shared_qr_from != NEW.shared_qr_from) THEN
    UPDATE products
    SET is_qr_master = true
    WHERE codificacion = NEW.shared_qr_from;
  END IF;

  -- When a product stops sharing, check if the old source still has dependents
  IF OLD.shared_qr_from IS NOT NULL AND (NEW.shared_qr_from IS NULL OR NEW.shared_qr_from != OLD.shared_qr_from) THEN
    -- Check if old source still has other products sharing from it
    IF NOT EXISTS (
      SELECT 1 FROM products
      WHERE shared_qr_from = OLD.shared_qr_from
      AND codificacion != NEW.codificacion
    ) THEN
      UPDATE products
      SET is_qr_master = false
      WHERE codificacion = OLD.shared_qr_from;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on products table
DROP TRIGGER IF EXISTS trigger_update_qr_master_status ON products;
CREATE TRIGGER trigger_update_qr_master_status
  AFTER INSERT OR UPDATE OF shared_qr_from ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_qr_master_status();

-- Add helpful comments
COMMENT ON FUNCTION validate_qr_sharing IS 'Validates that QR sharing is safe and prevents circular references';
COMMENT ON FUNCTION get_products_using_qr IS 'Returns all products that are reusing the QR from a specific product';
COMMENT ON FUNCTION is_revision_code IS 'Checks if a product code is a revision (ends with -R# pattern)';
COMMENT ON FUNCTION get_base_product_code IS 'Extracts the base product code from a revision code';
