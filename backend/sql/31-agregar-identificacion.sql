-- La plantilla actual usa identificacion (cedula) del revisor/aprobador,
-- que faltaba en el diseño anterior de responsables_firma.
ALTER TABLE responsables_firma ADD COLUMN IF NOT EXISTS identificacion VARCHAR(20);
ALTER TABLE planilla_responsables_snapshot ADD COLUMN IF NOT EXISTS identificacion VARCHAR(20);
