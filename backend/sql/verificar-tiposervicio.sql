-- Reemplaza XX por el planilla_id de una matriz REAL que hayas procesado
-- (la que tiene EMERGENCIA/AMBULATORIO/PREHOSPITALARIO mezclados)
SELECT tipo_servicio, COUNT(*) AS tramites
FROM tramites
WHERE planilla_id = 14
GROUP BY tipo_servicio;
