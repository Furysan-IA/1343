-- Add shared_qr_from column
ALTER TABLE products ADD COLUMN IF NOT EXISTS shared_qr_from text;

-- Add is_qr_master column
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_qr_master boolean DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_shared_qr_from ON products(shared_qr_from) WHERE shared_qr_from IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_qr_master ON products(is_qr_master) WHERE is_qr_master = true;
