-- Documenta explicitamente la anomalia CMT.14/CMT.15 para que sea
-- descubrible por consulta, no solo "ausente en silencio".

UPDATE motivos_objecion
SET observacion = 'INCIDENCIA DOCUMENTADA: la fuente cruda original (Documentos.xlsx, ' ||
  'hoja AYUDANTIA > 2023) contenia 2 filas para este codigo (filas 89442 y 89443). ' ||
  'El catalogo maestro CATALOGO_MOTIVOS_OBJECION_SIGMA_LLENADO.xlsx ya las habia ' ||
  'consolidado en 1 registro (fila_origen=89442) antes de esta importacion -- SIGMA ' ||
  'no perdio informacion, hereda la consolidacion ya hecha en el maestro. ' ||
  'codigos_maestros_CMT14 = 1. Requiere validacion manual de Facturacion.'
WHERE codigo_original = 'CMT.14';

-- Placeholder explicito para CMT.15: no existe en ninguna fuente
-- (ni en la cruda ni en el maestro), se documenta como AUSENTE, no se
-- inventa contenido.
INSERT INTO motivos_objecion (version_id, grupo, codigo_original, codigo_canonico, descripcion,
    respaldo_normativo, estado_validacion, observacion)
SELECT id, 'PERTINENCIA_MEDICA', 'CMT.15', 'CMT.15', NULL, 'AM 00140-2023', 'AUSENTE_EN_FUENTE',
    'INCIDENCIA DOCUMENTADA: este codigo no aparece en la fuente cruda original ' ||
    '(Documentos.xlsx, AYUDANTIA > 2023) ni en el catalogo maestro. No se invento ' ||
    'descripcion. Requiere confirmacion de Facturacion sobre si el codigo existe, ' ||
    'fue renumerado, o nunca existio.'
FROM catalogo_versiones WHERE tipo_catalogo='MOTIVOS_OBJECION' AND version='1.0';

-- Verificacion
SELECT codigo_original, estado_validacion, LEFT(observacion, 80) FROM motivos_objecion
WHERE codigo_original IN ('CMT.14', 'CMT.15');
