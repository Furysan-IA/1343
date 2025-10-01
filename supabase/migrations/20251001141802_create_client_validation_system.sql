/*
  # Client Validation and Update System

  This migration creates the infrastructure for validating and updating client data from spreadsheet uploads.

  ## New Tables

  1. **upload_batches**
     - Tracks each file upload and its processing status
     - Stores metadata: filename, file size, record counts, processing times
     - Links to the user who uploaded the file
     - Maintains processing statistics (new, updated, skipped, errors)

  2. **client_audit_log**
     - Complete audit trail for all client data changes
     - Tracks what changed, who made the change, and when
     - Stores previous and new values for accountability
     - Links to upload batches for traceability

  3. **potential_duplicates**
     - Stores detected potential duplicate clients for user review
     - Includes confidence scores and match criteria
     - Tracks resolution status (pending, added, merged, skipped)
     - Maintains uploaded data for comparison

  4. **undo_stack**
     - Session-based undo functionality
     - Stores last 5 actions per session
     - Allows rollback of add/skip/bulk operations

  ## Security
     - All tables have RLS enabled
     - Policies restrict access based on user authentication
     - Audit logs are immutable (insert-only for users)
*/

-- Upload batches table
CREATE TABLE IF NOT EXISTS upload_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  new_records INTEGER DEFAULT 0,
  updated_records INTEGER DEFAULT 0,
  skipped_records INTEGER DEFAULT 0,
  error_records INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing',
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  reference_date TIMESTAMPTZ,
  processing_time_ms INTEGER,
  error_summary JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_upload_batches_uploaded_by ON upload_batches(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_upload_batches_status ON upload_batches(status);
CREATE INDEX IF NOT EXISTS idx_upload_batches_uploaded_at ON upload_batches(uploaded_at);

-- Client audit log table
CREATE TABLE IF NOT EXISTS client_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_cuit BIGINT REFERENCES clients(cuit),
  batch_id UUID REFERENCES upload_batches(id),
  operation_type TEXT NOT NULL,
  changed_fields JSONB DEFAULT '{}'::jsonb,
  previous_values JSONB DEFAULT '{}'::jsonb,
  new_values JSONB DEFAULT '{}'::jsonb,
  performed_by UUID REFERENCES auth.users(id) NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_client_cuit ON client_audit_log(client_cuit);
CREATE INDEX IF NOT EXISTS idx_audit_log_batch_id ON client_audit_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at ON client_audit_log(performed_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation_type ON client_audit_log(operation_type);

-- Potential duplicates table
CREATE TABLE IF NOT EXISTS potential_duplicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES upload_batches(id) NOT NULL,
  existing_client_cuit BIGINT REFERENCES clients(cuit),
  uploaded_client_data JSONB NOT NULL,
  confidence_score NUMERIC(5,2) NOT NULL,
  match_criteria TEXT[] DEFAULT ARRAY[]::TEXT[],
  resolution_status TEXT DEFAULT 'pending',
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_duplicates_batch_id ON potential_duplicates(batch_id);
CREATE INDEX IF NOT EXISTS idx_duplicates_status ON potential_duplicates(resolution_status);
CREATE INDEX IF NOT EXISTS idx_duplicates_existing_client ON potential_duplicates(existing_client_cuit);

-- Undo stack table
CREATE TABLE IF NOT EXISTS undo_stack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  batch_id UUID REFERENCES upload_batches(id),
  action_type TEXT NOT NULL,
  action_data JSONB NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_undone BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_undo_stack_session_id ON undo_stack(session_id);
CREATE INDEX IF NOT EXISTS idx_undo_stack_batch_id ON undo_stack(batch_id);
CREATE INDEX IF NOT EXISTS idx_undo_stack_user_id ON undo_stack(user_id);
CREATE INDEX IF NOT EXISTS idx_undo_stack_created_at ON undo_stack(created_at);

-- Enable RLS on all tables
ALTER TABLE upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE potential_duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE undo_stack ENABLE ROW LEVEL SECURITY;

-- RLS Policies for upload_batches
CREATE POLICY "Users can view own batches"
  ON upload_batches FOR SELECT
  TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users can create batches"
  ON upload_batches FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can update own batches"
  ON upload_batches FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- RLS Policies for client_audit_log
CREATE POLICY "Users can view audit logs"
  ON client_audit_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert audit logs"
  ON client_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- RLS Policies for potential_duplicates
CREATE POLICY "Users can view duplicates from own batches"
  ON potential_duplicates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM upload_batches
      WHERE upload_batches.id = potential_duplicates.batch_id
      AND upload_batches.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert potential duplicates"
  ON potential_duplicates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM upload_batches
      WHERE upload_batches.id = potential_duplicates.batch_id
      AND upload_batches.uploaded_by = auth.uid()
    )
  );

CREATE POLICY "Users can update duplicate resolutions"
  ON potential_duplicates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM upload_batches
      WHERE upload_batches.id = potential_duplicates.batch_id
      AND upload_batches.uploaded_by = auth.uid()
    )
  )
  WITH CHECK (resolved_by = auth.uid());

-- RLS Policies for undo_stack
CREATE POLICY "Users can view own undo stack"
  ON undo_stack FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert to undo stack"
  ON undo_stack FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own undo stack"
  ON undo_stack FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Cleanup function for old undo stack entries (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_undo_stack()
RETURNS void AS $$
BEGIN
  DELETE FROM undo_stack
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
