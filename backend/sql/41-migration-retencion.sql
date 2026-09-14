-- Politica de retencion LOPDP: 5 anios. NO se implementa borrado
-- automatico (demasiado riesgoso para un sistema en produccion sin
-- supervision -- un cron mal configurado podria borrar planillas
-- reales). En su lugar: se calcula y se muestra la fecha en que
-- CADA planilla CUMPLE el periodo de retencion, y el ADMIN decide
-- manualmente si eliminarla via el endpoint ya existente
-- DELETE /planillas/:id (que ya queda registrado en audit_log).

ALTER TABLE planillas ADD COLUMN IF NOT EXISTS fecha_fin_retencion DATE
    GENERATED ALWAYS AS (created_at::date + INTERVAL '5 years') STORED;

-- Verificacion
SELECT id, created_at, fecha_fin_retencion FROM planillas LIMIT 5;
