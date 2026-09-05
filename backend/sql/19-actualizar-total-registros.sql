-- Calcula total_registros REAL contando cada tabla hija, para las
-- versiones ya cargadas (correccion retroactiva de lo que ya existe).
UPDATE catalogo_versiones cv SET total_registros = sub.total FROM (
    SELECT version_id, COUNT(*) AS total FROM tarifario_maestro GROUP BY version_id
) sub WHERE cv.id = sub.version_id;

UPDATE catalogo_versiones cv SET total_registros = sub.total FROM (
    SELECT version_id, COUNT(*) AS total FROM medicamentos_insumos WHERE version_id IS NOT NULL GROUP BY version_id
) sub WHERE cv.id = sub.version_id;

UPDATE catalogo_versiones cv SET total_registros = sub.total FROM (
    SELECT version_id, COUNT(*) AS total FROM motivos_objecion GROUP BY version_id
) sub WHERE cv.id = sub.version_id;

UPDATE catalogo_versiones cv SET total_registros = sub.total FROM (
    SELECT version_id, COUNT(*) AS total FROM historico_precios_medicamentos GROUP BY version_id
) sub WHERE cv.id = sub.version_id;

UPDATE catalogo_versiones cv SET total_registros = sub.total FROM (
    SELECT
        (SELECT id FROM catalogo_versiones WHERE tipo_catalogo='CPC' AND version='2025-12-29') AS version_id,
        COUNT(*) AS total FROM cpc_productos
) sub WHERE cv.id = sub.version_id;

UPDATE catalogo_versiones cv SET total_registros = sub.total FROM (
    SELECT version_id, COUNT(*) AS total FROM base_historica_tramites GROUP BY version_id
) sub WHERE cv.id = sub.version_id;

SELECT tipo_catalogo, version, total_registros FROM catalogo_versiones ORDER BY tipo_catalogo;
