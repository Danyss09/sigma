-- Encuentra detalles_servicios cuyo expediente ya no existe (huerfanos
-- reales) -- para saber si viene de un borrado de prueba o de un bug
-- real de integridad referencial.
SELECT d.id, d.codigo_original, d.expediente_id, d.estado_fila, d.created_at
FROM detalles_servicios d
LEFT JOIN expedientes e ON e.id = d.expediente_id
WHERE e.id IS NULL;

-- Si expediente SI existe pero el tramite no:
SELECT d.id, d.codigo_original, e.id AS expediente_id, e.tramite_id
FROM detalles_servicios d
JOIN expedientes e ON e.id = d.expediente_id
LEFT JOIN tramites t ON t.id = e.tramite_id
WHERE t.id IS NULL;
