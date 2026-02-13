/*
  # Create DJC Templates System

  1. New Tables
    - `djc_templates`
      - `id` (uuid, primary key)
      - `name` (text) - Template name
      - `description` (text) - Template description
      - `template_json` (jsonb) - Full template configuration
      - `user_id` (uuid) - User who created the template
      - `is_default` (boolean) - Whether this is a default system template
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `template_id` column to `djc` table to track which template was used
    - Add `template_name` column to `djc` table for historical reference

  3. Security
    - Enable RLS on `djc_templates` table
    - Add policies for authenticated users to manage their own templates
    - Add policy for reading default templates
*/

-- Create djc_templates table
CREATE TABLE IF NOT EXISTS djc_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_json jsonb NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add template tracking to djc table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE djc ADD COLUMN template_id uuid REFERENCES djc_templates(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'djc' AND column_name = 'template_name'
  ) THEN
    ALTER TABLE djc ADD COLUMN template_name text;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_djc_templates_user_id ON djc_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_djc_templates_is_default ON djc_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_djc_template_id ON djc(template_id);

-- Enable Row Level Security
ALTER TABLE djc_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own templates
CREATE POLICY "Users can view own templates"
  ON djc_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_default = true);

-- Policy: Users can insert their own templates
CREATE POLICY "Users can insert own templates"
  ON djc_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON djc_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON djc_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_djc_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_djc_templates_updated_at ON djc_templates;
CREATE TRIGGER set_djc_templates_updated_at
  BEFORE UPDATE ON djc_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_djc_templates_updated_at();
