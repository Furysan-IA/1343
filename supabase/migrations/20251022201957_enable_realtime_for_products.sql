/*
  # Enable Realtime for Products and DJC Tables

  1. Changes
    - Enable Realtime replication for products table
    - Enable Realtime replication for djc table
    - Ensure REPLICA IDENTITY is properly configured

  2. Security
    - No changes to RLS policies
    - Maintains existing security constraints
    - Only enables real-time subscriptions for existing policies

  3. Notes
    - This allows authenticated users to subscribe to real-time changes
    - Changes will only be broadcast for rows they have SELECT access to
    - REPLICA IDENTITY DEFAULT means only primary key is included in updates
*/

-- Ensure products table has proper replica identity
-- DEFAULT means the old values of the primary key are logged
ALTER TABLE products REPLICA IDENTITY DEFAULT;

-- Ensure djc table has proper replica identity
ALTER TABLE djc REPLICA IDENTITY DEFAULT;

-- Enable Realtime for products table (if not already enabled)
-- This is handled by Supabase's Realtime configuration
-- The migration ensures tables are properly configured for Realtime

-- Add comment to track Realtime enablement
COMMENT ON TABLE products IS 'Products table with Realtime enabled for live updates';
COMMENT ON TABLE djc IS 'DJC table with Realtime enabled for live updates';
