-- =====================================================================
-- MIGRACIÓN: ampliar columnas de identificación (VARCHAR(20) es muy
-- corto para datos reales — pasaportes, RUC extendido, etc. pueden
-- pasar de 20 caracteres, y es lo que está causando el error
-- "value too long for type character varying(20)".
-- =====================================================================

ALTER TABLE planillas ALTER COLUMN revisado_identificacion TYPE VARCHAR(50);
ALTER TABLE planillas ALTER COLUMN aprobado_identificacion TYPE VARCHAR(50);
ALTER TABLE expedientes ALTER COLUMN identificacion TYPE VARCHAR(50);

-- periodo también es VARCHAR(20) pero ese sí es correcto para "MM-YYYY"
-- (7 caracteres), no lo toques a menos que uses otro formato.
