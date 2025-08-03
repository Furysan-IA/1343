/*
  # Create clients table

  1. New Tables
    - `clients`
      - `cuit` (bigint, primary key) - CUIT del cliente
      - `razon_social` (text, required) - Razón Social
      - `direccion` (text, required) - Dirección
      - `email` (text, required) - Email
      - `created_at` (timestamptz, default: now())
      - `updated_at` (timestamptz, default: now())

  2. Security
    - Enable RLS on `clients` table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS clients (
  cuit BIGINT PRIMARY KEY,
  razon_social TEXT NOT NULL,
  direccion TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

-- Create trigger for clients table
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS clients_cuit_idx ON clients(cuit);
CREATE INDEX IF NOT EXISTS clients_email_idx ON clients(email);