/*
  # Create products table

  1. New Tables
    - `products`
      - `codificacion` (text, primary key) - CODIFICACIÓN
      - `cuit` (bigint, foreign key) - Vinculación al cliente
      - Multiple product fields as specified
      - Status tracking fields for DJC workflow
      - File paths for storage integration

  2. Security
    - Enable RLS on `products` table
    - Add policies for authenticated users

  3. Functions
    - Trigger to calculate dias_para_vencer automatically
*/

CREATE TABLE IF NOT EXISTS products (
  codificacion TEXT PRIMARY KEY,
  cuit BIGINT NOT NULL REFERENCES clients(cuit) ON DELETE CASCADE,
  titular TEXT,
  tipo_certificacion TEXT,
  estado TEXT,
  en_proceso_renovacion TEXT,
  direccion_legal_empresa TEXT,
  fabricante TEXT,
  planta_fabricacion TEXT,
  origen TEXT,
  producto TEXT,
  marca TEXT,
  modelo TEXT,
  caracteristicas_tecnicas TEXT,
  normas_aplicacion TEXT,
  informe_ensayo_nro TEXT,
  laboratorio TEXT,
  ocp_extranjero TEXT,
  n_certificado_extranjero TEXT,
  fecha_emision_certificado_extranjero DATE,
  disposicion_convenio TEXT,
  cod_rubro INTEGER,
  cod_subrubro INTEGER,
  nombre_subrubro TEXT,
  fecha_emision DATE,
  vencimiento DATE,
  fecha_cancelacion DATE,
  motivo_cancelacion TEXT,
  dias_para_vencer INTEGER,
  djc_status TEXT DEFAULT 'No Generada',
  certificado_status TEXT DEFAULT 'Pendiente Subida',
  enviado_cliente TEXT DEFAULT 'Pendiente',
  certificado_path TEXT,
  djc_path TEXT,
  qr_path TEXT,
  qr_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create trigger for products table updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate dias_para_vencer
CREATE OR REPLACE FUNCTION calculate_dias_para_vencer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vencimiento IS NOT NULL THEN
    NEW.dias_para_vencer = NEW.vencimiento - CURRENT_DATE;
  ELSE
    NEW.dias_para_vencer = NULL;
  END IF;
  RETURN NEW;
END;
$$ language plpgsql;

-- Create trigger to calculate dias_para_vencer
CREATE TRIGGER calculate_dias_para_vencer_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION calculate_dias_para_vencer();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS products_codificacion_idx ON products(codificacion);
CREATE INDEX IF NOT EXISTS products_cuit_idx ON products(cuit);
CREATE INDEX IF NOT EXISTS products_djc_status_idx ON products(djc_status);
CREATE INDEX IF NOT EXISTS products_certificado_status_idx ON products(certificado_status);
CREATE INDEX IF NOT EXISTS products_enviado_cliente_idx ON products(enviado_cliente);
CREATE INDEX IF NOT EXISTS products_vencimiento_idx ON products(vencimiento);