-- Trámite real EMR-07 (Hospital del Día Chimbacalle - IESS, servicio
-- EMERGENCIA, marzo 2021), extraido de fuente oficial (Informe de
-- Liquidacion No. 0159-MSP-RPIS-2026). SIN nombres ni cedulas -- solo
-- los montos agregados a nivel de tramite. 37 expedientes reales.

BEGIN;

INSERT INTO base_historica_tramites (
    version_id, subsistema, tipo_servicio_normalizado, anio, mes_normalizado,
    numero_planillas, valor_solicitado, valor_objetado, valor_aprobado,
    resultado_economico_conocido, fue_objetado, porcentaje_objetado,
    consistencia_economica, estado_calidad_registro, elegible_modelo_preliminar,
    observacion_original
)
SELECT
    id, 'IESS', 'EMERGENCIA', 2021, 'MARZO',
    1, 414.48, 344.12, 70.36,
    'SI', TRUE, ROUND(344.12/414.48, 4),
    'CUADRA', 'REAL_VERIFICADO_ANONIMIZADO', TRUE,
    'Trámite real EMR-07, Hospital del Día Chimbacalle - IESS. Extraído de Informe de Liquidación No. 0159-MSP-RPIS-2026 (INFLIQ). ' ||
    '37 expedientes agregados a nivel de trámite (no por línea/código). Identificadores de pacientes NO almacenados -- ' ||
    'solo montos agregados, confirmados por el usuario como autorizados para anonimizar e incorporar.'
FROM catalogo_versiones WHERE tipo_catalogo = 'BASE_HISTORICA_IA' AND version = '1.0';

COMMIT;

-- Verificacion
SELECT subsistema, tipo_servicio_normalizado, anio, valor_solicitado, valor_objetado, valor_aprobado, fue_objetado
FROM base_historica_tramites WHERE estado_calidad_registro = 'REAL_VERIFICADO_ANONIMIZADO';
