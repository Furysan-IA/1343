/*
  # Create logs table

  1. New Tables
    - `logs`
      - `id` (uuid, primary key)
      - `timestamp` (timestamptz, default: now())
      - `user_id` (uuid, foreign key to auth.users)
      - `error_message` (text, required)
      - `context` (jsonb) - Additional details

  2. Security
    - Enable RLS on `logs` table
    - Add policies for authenticated users to view their own logs
*/

CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  error_message TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logs"
  ON logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert logs"
  ON logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS logs_user_id_idx ON logs(user_id);
CREATE INDEX IF NOT EXISTS logs_timestamp_idx ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS logs_context_idx ON logs USING GIN(context);

-- Function to log errors automatically
CREATE OR REPLACE FUNCTION log_error(
  error_msg TEXT,
  error_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO logs (user_id, error_message, context)
  VALUES (auth.uid(), error_msg, error_context)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ language plpgsql SECURITY DEFINER;