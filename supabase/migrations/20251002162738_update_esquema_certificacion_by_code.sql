/*
  # Actualizar esquemas de certificación según codificación

  1. Cambios
    - Productos con codificación CSE* → Licencia de Marca (Sistema Nº 5)
    - Productos con codificación TCSE* → Licencia de Tipo (Sistema Nº 2)

  2. Estadísticas
    - ~1000 productos CSE (Licencia de Marca)
    - ~742 productos TCSE (Licencia de Tipo)
    - ~235 productos con otros códigos (sin cambios)

  3. Notas
    - Solo actualiza productos que coincidan con los patrones CSE% o TCSE%
    - Los productos con otros códigos mantienen su esquema actual
*/

-- Actualizar productos que inician con CSE
UPDATE products
SET esquema_certificacion = 'Licencia de Marca (Sistema Nº 5)'
WHERE codificacion LIKE 'CSE%';

-- Actualizar productos que inician con TCSE
UPDATE products
SET esquema_certificacion = 'Licencia de Tipo (Sistema Nº 2)'
WHERE codificacion LIKE 'TCSE%';
