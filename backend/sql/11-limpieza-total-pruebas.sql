-- Borra TODO el histórico de procesamiento de prueba (no las tarifas ni
-- usuarios) para volver a probar limpio con el bug ya arreglado.
-- Orden importa por las FK.

DELETE FROM decisiones_auditoria;
DELETE FROM predicciones_riesgo;
DELETE FROM resultados_planilla;
DELETE FROM detalles_servicios;
DELETE FROM expedientes;
DELETE FROM tramites;

-- Las planillas (filas de metadatos) las dejamos — solo vuelve a correr
-- /planillas/:id/procesar sobre cada una que quieras probar de nuevo.
