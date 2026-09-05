-- Limpia los duplicados de CMT.15 creados por corridas repetidas del
-- script 18 anterior (no idempotente). Seguro: son placeholders
-- sinteticos nuestros, no datos de la fuente original.
DELETE FROM motivos_objecion WHERE codigo_original = 'CMT.15';

INSERT INTO motivos_objecion (version_id, grupo, codigo_original, codigo_canonico, descripcion,
    respaldo_normativo, estado_validacion, observacion)
SELECT id, 'PERTINENCIA_MEDICA', 'CMT.15', 'CMT.15', NULL, 'AM 00140-2023', 'AUSENTE_EN_FUENTE',
    'INCIDENCIA DOCUMENTADA: este codigo no aparece en la fuente cruda original ' ||
    '(Documentos.xlsx, AYUDANTIA > 2023) ni en el catalogo maestro. No se invento ' ||
    'descripcion. Requiere confirmacion de Facturacion sobre si el codigo existe, ' ||
    'fue renumerado, o nunca existio.'
FROM catalogo_versiones WHERE tipo_catalogo='MOTIVOS_OBJECION' AND version='1.0';

UPDATE catalogo_versiones SET total_registros = (SELECT COUNT(*) FROM motivos_objecion)
WHERE tipo_catalogo='MOTIVOS_OBJECION' AND version='1.0';

SELECT COUNT(*) FROM motivos_objecion;  -- debe dar 95 (94 + 1 CMT.15)
