-- Amplia base_historica_tramites para conservar TODAS las 41 columnas
-- de la fuente, no solo el subconjunto resumido de la migracion 13.
-- Aditivo, no borra columnas existentes.

ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS fila_origen_excel INTEGER;
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS secuencial_original VARCHAR(50);
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS secuencial_duplicado VARCHAR(50);
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS estado_original VARCHAR(50);
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS fase_original VARCHAR(50);
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS fase_normalizada VARCHAR(50);
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(80);
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS numero_oficio_completo VARCHAR(100);
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS numero_oficio_corto VARCHAR(50);
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS fecha_documento_original VARCHAR(50);
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS fecha_documento_normalizada DATE;
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS tipo_servicio_original VARCHAR(80);
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS mes_original VARCHAR(30);
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS porcentaje_aprobado NUMERIC(6, 4);
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS diferencia_cuadre NUMERIC(14, 2);
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS numero_tramite_entrega VARCHAR(50);
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS falta_informe BOOLEAN;
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS falta_planilla BOOLEAN;
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS falta_factura BOOLEAN;
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS falta_oficio BOOLEAN;
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS falta_cur BOOLEAN;
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS documentacion_incompleta_detectada BOOLEAN;
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS observacion_temporalidad_feature TEXT;
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS enlace_original TEXT;
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS motivo_no_elegible TEXT;
-- resultado_economico_conocido faltaba del diseño original tambien:
ALTER TABLE base_historica_tramites ADD COLUMN IF NOT EXISTS resultado_economico_conocido VARCHAR(30);
