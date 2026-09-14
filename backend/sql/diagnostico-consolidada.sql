-- Reemplaza XX por el planilla_id real de la prueba (la de
-- PRUEBA_DASHBOARD). Muestra, por cada linea de detalle:
-- el valor ORIGINAL solicitado, si fue corregida, a que se corrigio,
-- y el valor ACTUAL que tiene valorSolicitado en detalles_servicios
-- (que es el campo que suma generador-consolidadas.service.ts).

SELECT
    e.identificacion,
    e.nombre_paciente,
    t.numero_tramite,
    d.id AS detalle_id,
    d.codigo_original,
    d.cantidad,
    d.valor_unitario_solicitado AS valor_unitario_actual,
    d.subtotal AS subtotal_actual,
    d.valor_solicitado AS valor_solicitado_actual,  -- <- esto es lo que SUMA la consolidada
    ca.valor_anterior AS correccion_valor_anterior,
    ca.valor_corregido AS correccion_valor_corregido,
    ca.created_at AS fecha_correccion
FROM detalles_servicios d
JOIN expedientes e ON e.id = d.expediente_id
JOIN tramites t ON t.id = e.tramite_id
LEFT JOIN correcciones_automaticas ca ON ca.detalle_servicio_id = d.id
WHERE t.planilla_id = 14
ORDER BY e.identificacion, t.numero_tramite;

-- Y el total agrupado por beneficiario, exactamente como lo calcula
-- generador-consolidadas.service.ts (SUMA de valor_solicitado):
SELECT
    e.identificacion,
    e.nombre_paciente,
    SUM(d.valor_solicitado) AS total_que_deberia_salir_en_consolidada
FROM detalles_servicios d
JOIN expedientes e ON e.id = d.expediente_id
JOIN tramites t ON t.id = e.tramite_id
WHERE t.planilla_id = XX
GROUP BY e.identificacion, e.nombre_paciente
ORDER BY e.identificacion;
