-- Limpia TODO lo relacionado a las planillas 5, 6 y 7 (los trámites,
-- aunque digan planilla_id=5, en realidad tienen datos mezclados de las
-- 3 corridas) para poder reprocesar limpio una vez aplicado el fix.

DELETE FROM correcciones_automaticas WHERE detalle_servicio_id IN (
  SELECT ds.id FROM detalles_servicios ds
  JOIN expedientes e ON ds.expediente_id = e.id
  JOIN tramites t ON e.tramite_id = t.id
  WHERE t.planilla_id IN (5, 6, 7)
);

DELETE FROM predicciones_riesgo WHERE detalle_servicio_id IN (
  SELECT ds.id FROM detalles_servicios ds
  JOIN expedientes e ON ds.expediente_id = e.id
  JOIN tramites t ON e.tramite_id = t.id
  WHERE t.planilla_id IN (5, 6, 7)
);

DELETE FROM decisiones_auditoria WHERE detalle_servicio_id IN (
  SELECT ds.id FROM detalles_servicios ds
  JOIN expedientes e ON ds.expediente_id = e.id
  JOIN tramites t ON e.tramite_id = t.id
  WHERE t.planilla_id IN (5, 6, 7)
);

DELETE FROM resultados_planilla WHERE planilla_id IN (5, 6, 7);

DELETE FROM detalles_servicios WHERE expediente_id IN (
  SELECT e.id FROM expedientes e
  JOIN tramites t ON e.tramite_id = t.id
  WHERE t.planilla_id IN (5, 6, 7)
);

DELETE FROM expedientes WHERE tramite_id IN (
  SELECT id FROM tramites WHERE planilla_id IN (5, 6, 7)
);

DELETE FROM tramites WHERE planilla_id IN (5, 6, 7);

-- Las planillas (metadatos) se quedan, solo se limpió lo procesado.
SELECT id, estado FROM planillas WHERE id IN (5, 6, 7);
