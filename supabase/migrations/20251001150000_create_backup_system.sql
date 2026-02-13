/*
  # Sistema de Backup y Restauración

  1. Nuevas Tablas
    - `backup_snapshots`
      - `id` (uuid, primary key)
      - `batch_id` (uuid, referencia a upload_batches)
      - `snapshot_type` (text: 'before_processing')
      - `total_clients_backed_up` (integer)
      - `total_products_backed_up` (integer)
      - `created_by` (uuid, referencia a auth.users)
      - `created_at` (timestamp)
      - `metadata` (jsonb)

    - `backup_clients`
      - `id` (uuid, primary key)
      - `snapshot_id` (uuid, referencia a backup_snapshots)
      - `original_client_id` (uuid)
      - `client_data` (jsonb) - copia completa del registro
      - `backed_up_at` (timestamp)

    - `backup_products`
      - `id` (uuid, primary key)
      - `snapshot_id` (uuid, referencia a backup_snapshots)
      - `original_product_id` (uuid)
      - `product_data` (jsonb) - copia completa del registro
      - `backed_up_at` (timestamp)

    - `restore_history`
      - `id` (uuid, primary key)
      - `snapshot_id` (uuid, referencia a backup_snapshots)
      - `restored_by` (uuid, referencia a auth.users)
      - `restored_at` (timestamp)
      - `clients_restored` (integer)
      - `products_restored` (integer)
      - `status` (text: 'completed', 'failed', 'partial')
      - `error_log` (jsonb)

  2. Seguridad
    - Enable RLS en todas las tablas
    - Políticas para usuarios autenticados
*/

-- Tabla de snapshots
CREATE TABLE IF NOT EXISTS backup_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES upload_batches(id) ON DELETE CASCADE,
  snapshot_type text NOT NULL DEFAULT 'before_processing',
  total_clients_backed_up integer DEFAULT 0,
  total_products_backed_up integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Tabla de backup de clientes
CREATE TABLE IF NOT EXISTS backup_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid REFERENCES backup_snapshots(id) ON DELETE CASCADE,
  original_client_id uuid,
  client_data jsonb NOT NULL,
  backed_up_at timestamptz DEFAULT now()
);

-- Tabla de backup de productos
CREATE TABLE IF NOT EXISTS backup_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid REFERENCES backup_snapshots(id) ON DELETE CASCADE,
  original_product_id uuid,
  product_data jsonb NOT NULL,
  backed_up_at timestamptz DEFAULT now()
);

-- Tabla de historial de restauraciones
CREATE TABLE IF NOT EXISTS restore_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid REFERENCES backup_snapshots(id) ON DELETE CASCADE,
  restored_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  restored_at timestamptz DEFAULT now(),
  clients_restored integer DEFAULT 0,
  products_restored integer DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  error_log jsonb DEFAULT '{}'::jsonb
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_backup_snapshots_batch_id ON backup_snapshots(batch_id);
CREATE INDEX IF NOT EXISTS idx_backup_snapshots_created_at ON backup_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_clients_snapshot_id ON backup_clients(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_backup_products_snapshot_id ON backup_products(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_restore_history_snapshot_id ON restore_history(snapshot_id);

-- Enable RLS
ALTER TABLE backup_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE restore_history ENABLE ROW LEVEL SECURITY;

-- Políticas para backup_snapshots
CREATE POLICY "Users can view own backups"
  ON backup_snapshots FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can create backups"
  ON backup_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Políticas para backup_clients
CREATE POLICY "Users can view backup clients"
  ON backup_clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM backup_snapshots
      WHERE backup_snapshots.id = backup_clients.snapshot_id
      AND backup_snapshots.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create backup clients"
  ON backup_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM backup_snapshots
      WHERE backup_snapshots.id = backup_clients.snapshot_id
      AND backup_snapshots.created_by = auth.uid()
    )
  );

-- Políticas para backup_products
CREATE POLICY "Users can view backup products"
  ON backup_products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM backup_snapshots
      WHERE backup_snapshots.id = backup_products.snapshot_id
      AND backup_snapshots.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create backup products"
  ON backup_products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM backup_snapshots
      WHERE backup_snapshots.id = backup_products.snapshot_id
      AND backup_snapshots.created_by = auth.uid()
    )
  );

-- Políticas para restore_history
CREATE POLICY "Users can view restore history"
  ON restore_history FOR SELECT
  TO authenticated
  USING (restored_by = auth.uid());

CREATE POLICY "Users can create restore records"
  ON restore_history FOR INSERT
  TO authenticated
  WITH CHECK (restored_by = auth.uid());
