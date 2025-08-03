/*
  # Create validation functions for Excel processing

  1. New Functions
    - `log_error` - Function to log errors with context
    - `validate_client_exists` - Function to check if client exists by CUIT
    - `get_missing_clients` - Function to get list of missing clients for products

  2. Security
    - Functions are accessible to authenticated users
    - Proper error handling and logging

  3. Purpose
    - Support Excel validation process
    - Enable client-product relationship validation
    - Centralized error logging
*/

-- Function to log errors with context
CREATE OR REPLACE FUNCTION log_error(
  error_msg TEXT,
  error_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO logs (error_message, context, user_id)
  VALUES (error_msg, error_context, auth.uid())
  RETURNING id INTO log_id;
  
  RETURN log_id;
EXCEPTION
  WHEN OTHERS THEN
    -- If logging fails, at least return a UUID so the calling code doesn't break
    RETURN gen_random_uuid();
END;
$$;

-- Function to validate if a client exists by CUIT
CREATE OR REPLACE FUNCTION validate_client_exists(client_cuit BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_exists BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM clients WHERE cuit = client_cuit
  ) INTO client_exists;
  
  RETURN client_exists;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return false
    PERFORM log_error(
      'Error checking client existence: ' || SQLERRM,
      jsonb_build_object('cuit', client_cuit, 'function', 'validate_client_exists')
    );
    RETURN FALSE;
END;
$$;

-- Function to get missing clients for a list of CUITs
CREATE OR REPLACE FUNCTION get_missing_clients(cuit_list BIGINT[])
RETURNS BIGINT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  missing_cuits BIGINT[];
BEGIN
  SELECT ARRAY(
    SELECT unnest(cuit_list)
    EXCEPT
    SELECT cuit FROM clients WHERE cuit = ANY(cuit_list)
  ) INTO missing_cuits;
  
  RETURN missing_cuits;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return empty array
    PERFORM log_error(
      'Error getting missing clients: ' || SQLERRM,
      jsonb_build_object('cuit_list', cuit_list, 'function', 'get_missing_clients')
    );
    RETURN ARRAY[]::BIGINT[];
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION log_error(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_client_exists(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_missing_clients(BIGINT[]) TO authenticated;