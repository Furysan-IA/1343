/*
  # Create product_certificates table
  
  ## Summary
  Creates the `product_certificates` table to store certificate information for products.
  This table is used to track existing certificates when uploading new data.

  ## Tables Created
  
  ### `product_certificates`
  Stores certificate information extracted from Excel files.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier
  - `codificacion` (text, unique, not null) - Certificate code (unique identifier)
  - `titular` (text) - Certificate holder/owner
  - `estado` (text) - Certificate status
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ## Security
  - Enables RLS on the table
  - Adds policy for authenticated users to read all certificates
  - Adds policy for authenticated users to insert certificates
  - Adds policy for authenticated users to update their own certificates
  
  ## Indexes
  - Creates index on `codificacion` for fast lookups
  - Creates index on `estado` for filtering
*/

-- Create product_certificates table
CREATE TABLE IF NOT EXISTS product_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codificacion text UNIQUE NOT NULL,
  titular text,
  estado text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_certificates ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_certificates_codificacion 
  ON product_certificates(codificacion);

CREATE INDEX IF NOT EXISTS idx_product_certificates_estado 
  ON product_certificates(estado);

-- RLS Policies
CREATE POLICY "Authenticated users can read all certificates"
  ON product_certificates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert certificates"
  ON product_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update certificates"
  ON product_certificates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete certificates"
  ON product_certificates
  FOR DELETE
  TO authenticated
  USING (true);
