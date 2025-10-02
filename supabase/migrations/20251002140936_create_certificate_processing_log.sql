/*
  # Create Certificate Processing Log Table

  1. New Tables
    - `certificate_processing_log`
      - Tracks every certificate that is processed or skipped during Excel upload
      - Records detailed reasons for skipping certificates
      - Links to upload_batches for full traceability
      
  2. Fields
    - `id` (uuid, primary key): Unique identifier
    - `batch_id` (uuid, foreign key): Links to upload_batches table
    - `row_number` (integer): Original row number in Excel file
    - `action_taken` (text): Action performed (insert_both, update_both, skip, etc.)
    - `skip_reason` (text): Detailed reason if certificate was skipped
    - `certificate_date` (timestamptz): fecha_emision from the certificate
    - `existing_date` (timestamptz): Date of existing record in database (if applicable)
    - `cuit` (text): Client CUIT from certificate
    - `codificacion` (text): Product codification from certificate
    - `razon_social` (text): Client business name
    - `missing_fields` (jsonb): Array of missing required fields
    - `raw_data` (jsonb): Full certificate data for debugging
    - `created_at` (timestamptz): When this log entry was created
    
  3. Security
    - Enable RLS on certificate_processing_log table
    - Only authenticated users can read their processing logs
    - Only authenticated users can insert logs
    
  4. Indexes
    - Index on batch_id for fast filtering by batch
    - Index on action_taken for analytics
    - Index on skip_reason for reporting
*/

CREATE TABLE IF NOT EXISTS certificate_processing_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,
  row_number integer,
  action_taken text NOT NULL,
  skip_reason text,
  certificate_date timestamptz,
  existing_date timestamptz,
  cuit text,
  codificacion text,
  razon_social text,
  missing_fields jsonb DEFAULT '[]'::jsonb,
  raw_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE certificate_processing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own processing logs"
  ON certificate_processing_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM upload_batches
      WHERE upload_batches.id = certificate_processing_log.batch_id
      AND upload_batches.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own processing logs"
  ON certificate_processing_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM upload_batches
      WHERE upload_batches.id = certificate_processing_log.batch_id
      AND upload_batches.uploaded_by = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_cert_log_batch ON certificate_processing_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_cert_log_action ON certificate_processing_log(action_taken);
CREATE INDEX IF NOT EXISTS idx_cert_log_skip_reason ON certificate_processing_log(skip_reason);