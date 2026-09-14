SELECT d.id, d.codigo_original, d.expediente_id, d.estado_fila, d.created_at
FROM detalles_servicios d
LEFT JOIN expedientes e ON e.id = d.expediente_id
WHERE e.id IS NULL;
