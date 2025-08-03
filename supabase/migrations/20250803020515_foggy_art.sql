/*
  # Create storage buckets

  1. Storage buckets
    - `certificates` - For certificate files
    - `djcs` - For DJC documents
    - `qrs` - For QR code images
    - `excels` - For Excel file backups

  2. Security
    - RLS policies for authenticated users
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('certificates', 'certificates', false),
  ('djcs', 'djcs', false),
  ('qrs', 'qrs', true),
  ('excels', 'excels', false)
ON CONFLICT (id) DO NOTHING;

-- Certificates bucket policies
CREATE POLICY "Users can upload certificates"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'certificates');

CREATE POLICY "Users can view certificates"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'certificates');

CREATE POLICY "Users can update certificates"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'certificates');

-- DJCs bucket policies
CREATE POLICY "Users can upload djcs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'djcs');

CREATE POLICY "Users can view djcs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'djcs');

CREATE POLICY "Users can update djcs"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'djcs');

-- QRs bucket policies (public read)
CREATE POLICY "Anyone can view qrs"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'qrs');

CREATE POLICY "Users can upload qrs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'qrs');

-- Excels bucket policies
CREATE POLICY "Users can upload excels"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'excels');

CREATE POLICY "Users can view excels"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'excels');