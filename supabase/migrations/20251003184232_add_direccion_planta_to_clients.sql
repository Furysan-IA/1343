/*
  # Agregar dirección de planta/depósito a clientes

  ## Resumen
  Agrega el campo `direccion_planta` a la tabla `clients` para almacenar
  la dirección de la planta de producción o depósito del importador.
  Este campo puede ser igual a la dirección legal o diferente.

  ## Cambios
  
  ### Columnas agregadas a `clients`:
  - `direccion_planta` (text, nullable) - Dirección de planta/depósito
    - Puede ser NULL si es igual a la dirección legal
    - Si tiene valor, es una dirección diferente a la legal

  ## Notas importantes
  - Si `direccion_planta` es NULL, se asume que es la misma que `direccion`
  - El checkbox en la UI controlará si se usa la dirección legal o una personalizada
*/

-- Agregar campo direccion_planta a la tabla clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS direccion_planta text;
