/*
  # Add Product Validation Support

  ## Overview
  Extends the validation system to support both client and product data uploads

  ## Changes
  1. Add entity_type column to upload_batches to distinguish between clients and products
  2. Create product_audit_log table for product changes
  3. Create product_potential_duplicates table for product duplicate detection

  ## New Tables
  - product_audit_log: Tracks all product data changes
  - product_potential_duplicates: Stores detected product duplicates
*/

-- Add entity_type column to upload_batches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'upload_batches' AND column_name = 'entity_type'
  ) THEN
    ALTER TABLE upload_batches ADD COLUMN entity_type TEXT DEFAULT 'client';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_upload_batches_entity_type ON upload_batches(entity_type);

-- Product audit log table
CREATE TABLE IF NOT EXISTS product_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_uuid UUID REFERENCES products(uuid),
  batch_id UUID REFERENCES upload_batches(id),
  operation_type TEXT NOT NULL,
  changed_fields JSONB DEFAULT '{}'::jsonb,
  previous_values JSONB DEFAULT '{}'::jsonb,
  new_values JSONB DEFAULT '{}'::jsonb,
  performed_by UUID REFERENCES auth.users(id) NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_product_audit_log_product_uuid ON product_audit_log(product_uuid);
CREATE INDEX IF NOT EXISTS idx_product_audit_log_batch_id ON product_audit_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_product_audit_log_performed_at ON product_audit_log(performed_at);
CREATE INDEX IF NOT EXISTS idx_product_audit_log_operation_type ON product_audit_log(operation_type);

-- Product potential duplicates table
CREATE TABLE IF NOT EXISTS product_potential_duplicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES upload_batches(id) NOT NULL,
  existing_product_uuid UUID REFERENCES products(uuid),
  uploaded_product_data JSONB NOT NULL,
  confidence_score NUMERIC(5,2) NOT NULL,
  match_criteria TEXT[] DEFAULT ARRAY[]::TEXT[],
  resolution_status TEXT DEFAULT 'pending',
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_duplicates_batch_id ON product_potential_duplicates(batch_id);
CREATE INDEX IF NOT EXISTS idx_product_duplicates_status ON product_potential_duplicates(resolution_status);
CREATE INDEX IF NOT EXISTS idx_product_duplicates_existing_product ON product_potential_duplicates(existing_product_uuid);

-- Enable RLS
ALTER TABLE product_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_potential_duplicates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_audit_log
CREATE POLICY "Users can view product audit logs"
  ON product_audit_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert product audit logs"
  ON product_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- RLS Policies for product_potential_duplicates
CREATE POLICY "Users can view product duplicates from own batches"
  ON product_potential_duplicates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM upload_batches
      WHERE upload_batches.id = product_potential_duplicates.batch_id
      AND upload_batches.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert product duplicates"
  ON product_potential_duplicates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM upload_batches
      WHERE upload_batches.id = product_potential_duplicates.batch_id
      AND upload_batches.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Users can update product duplicate resolutions"
  ON product_potential_duplicates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM upload_batches
      WHERE upload_batches.id = product_potential_duplicates.batch_id
      AND upload_batches.uploaded_by = auth.uid()
    )
  )
  WITH CHECK (resolved_by = auth.uid());
