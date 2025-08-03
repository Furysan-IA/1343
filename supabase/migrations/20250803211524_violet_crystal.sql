/*
  # Fix Storage Bucket and Policies for Documents

  1. Storage Setup
    - Create 'documents' bucket if it doesn't exist
    - Configure public access and file limits
    - Set allowed MIME types for documents and images

  2. Security Policies
    - Allow authenticated users to upload files (with owner check)
    - Allow authenticated users to manage their own files
    - Allow public read access to all documents
    - Remove conflicting broad policies
*/

-- Create bucket for documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  true, 
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']::text[];

-- Remove existing policies that might cause conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads from documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations for authenticated users on documents" ON storage.objects;

-- Allow authenticated users to upload (insert) files, setting themselves as the owner
CREATE POLICY "Allow authenticated uploads to documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND owner = auth.uid());

-- Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates to documents" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND owner = auth.uid())
WITH CHECK (bucket_id = 'documents' AND owner = auth.uid());

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated deletes from documents" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND owner = auth.uid());

-- Allow public read access to all files in the 'documents' bucket
CREATE POLICY "Allow public downloads from documents" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'documents');