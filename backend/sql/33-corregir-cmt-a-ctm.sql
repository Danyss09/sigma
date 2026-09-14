-- Correccion confirmada por el usuario: los documentos reales de
-- objecion (INFREVDOC/CONSOLIDADA MSP) usan el prefijo CTM, no CMT
-- como tenia el catalogo original. Se corrige codigo_original y
-- codigo_canonico, conservando el resto de la fila intacta.

BEGIN;

UPDATE motivos_objecion
SET codigo_original = REPLACE(codigo_original, 'CMT', 'CTM'),
    codigo_canonico = REPLACE(codigo_canonico, 'CMT', 'CTM'),
    observacion = COALESCE(observacion || ' | ', '') || 'Prefijo corregido de CMT a CTM (confirmado contra documentos reales de objecion, 2026-09).'
WHERE codigo_original LIKE 'CMT%';

COMMIT;

-- Verificacion
SELECT codigo_original, grupo FROM motivos_objecion WHERE codigo_original LIKE 'CTM%' ORDER BY codigo_original LIMIT 10;
SELECT COUNT(*) AS total_ctm FROM motivos_objecion WHERE codigo_original LIKE 'CTM%';
