-- =====================================================================
-- Reglas base ILUSTRATIVAS. Confirmar con Facturacion/un medico antes
-- de usar en produccion -- estas demuestran el MECANISMO, no son un
-- protocolo clinico validado.
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- REGLAS DOCUMENTALES (6)
-- ---------------------------------------------------------------------
INSERT INTO reglas_documentales (tipo_agrupador, valor_agrupador, documento_requerido, obligatorio, observacion) VALUES
('HOJA_FUENTE', 'SI-IMAGEN', 'Pedido médico', TRUE, 'Ejemplo dado por el usuario'),
('HOJA_FUENTE', 'SI-IMAGEN', 'Informe Imagenológico', TRUE, 'Ejemplo dado por el usuario'),
('TIPO_REGISTRO', 'ANESTESIA', 'Protocolo de Anestesia', TRUE, 'Ejemplo dado por el usuario'),
('HOJA_FUENTE', 'SI- HOTELERIA', 'Bitácora de traslado', TRUE, 'Ejemplo dado por el usuario (ambulancia)'),
('HOJA_FUENTE', 'SI-LABORATORIO', 'Orden de laboratorio', TRUE, 'Requisito estándar de laboratorio'),
('TIPO_REGISTRO', 'PRESTACION_INTEGRAL', 'Informe médico de justificación', TRUE, 'Paquetes integrales requieren justificación explícita');

-- ---------------------------------------------------------------------
-- REGLAS DE PERTINENCIA CLINICA (5) -- ILUSTRATIVAS, no autoritativas
-- ---------------------------------------------------------------------

-- 1. Ambulancia (397153) solo pertinente para traumatismos S00-T98
INSERT INTO reglas_pertinencia_clinica (nivel_aplicacion, valor_aplicacion, cie10_patron, descripcion_bloque_cie10, tipo_regla, motivo_alerta, fuente_clinica) VALUES
('CODIGO', '397153', '^(S[0-9]{2}|T[0-8][0-9]|T9[0-8])', 'Traumatismos y envenenamientos (S00-T98)', 'PERMITIDO',
 'El código 397153 (transporte/ambulancia) requiere un diagnóstico de traumatismo (CIE-10 S00-T98). El CIE-10 reportado no corresponde a este bloque.',
 'Ejemplo dado por el usuario -- confirmar con protocolo institucional');

-- 2. Categoria "CIRUGÍA DE MANO" pertinente para lesiones de mano/muñeca S60-S69
INSERT INTO reglas_pertinencia_clinica (nivel_aplicacion, valor_aplicacion, cie10_patron, descripcion_bloque_cie10, tipo_regla, motivo_alerta, fuente_clinica) VALUES
('CATEGORIA', 'CIRUGÍA DE MANO', '^S6[0-9]', 'Traumatismos de muñeca y mano (S60-S69)', 'PERMITIDO',
 'La categoría "CIRUGÍA DE MANO" espera un diagnóstico de lesión de mano/muñeca (S60-S69). Revisar pertinencia con el CIE-10 reportado.',
 'ILUSTRATIVO -- requiere validación clínica real antes de producción');

-- 3. Bloqueante explicito: procedimientos obstetricos (parto) NUNCA con CIE-10 odontologico K00-K14
INSERT INTO reglas_pertinencia_clinica (nivel_aplicacion, valor_aplicacion, cie10_patron, descripcion_bloque_cie10, tipo_regla, motivo_alerta, fuente_clinica) VALUES
('CATEGORIA', 'ATENCION DEL PARTO', '^K(0[0-9]|1[0-4])', 'Enfermedades de la cavidad bucal (K00-K14)', 'BLOQUEANTE',
 'Un procedimiento de atención de parto no es compatible con un diagnóstico odontológico. Revisar el CIE-10 registrado.',
 'ILUSTRATIVO -- ejemplo de regla de exclusion, no de inclusion');

-- 4. Hoja fuente SI-IMAGEN con categoria de control de embarazo -> bloque O00-O99 / Z34
INSERT INTO reglas_pertinencia_clinica (nivel_aplicacion, valor_aplicacion, cie10_patron, descripcion_bloque_cie10, tipo_regla, motivo_alerta, fuente_clinica) VALUES
('CATEGORIA', 'ESTUDIOS DE EMBARAZO', '^(O[0-9]{2}|Z34)', 'Embarazo, parto y puerperio (O00-O99) / Supervisión de embarazo normal (Z34)', 'PERMITIDO',
 'Los estudios de seguimiento de embarazo esperan un diagnóstico obstétrico (O00-O99) o de supervisión de embarazo (Z34).',
 'ILUSTRATIVO -- confirmar nombre exacto de categoria contra el catalogo real');

-- 5. Dialisis/hemodialisis pertinente para enfermedad renal cronica N18
INSERT INTO reglas_pertinencia_clinica (nivel_aplicacion, valor_aplicacion, cie10_patron, descripcion_bloque_cie10, tipo_regla, motivo_alerta, fuente_clinica) VALUES
('TIPO_REGISTRO', 'HEMODIALISIS', '^N18', 'Enfermedad renal crónica (N18)', 'PERMITIDO',
 'Los procedimientos de hemodiálisis esperan un diagnóstico de enfermedad renal crónica (N18).',
 'ILUSTRATIVO -- confirmar valor exacto de tipo_registro contra el catalogo real');

COMMIT;

-- Verificacion
SELECT tipo_agrupador, valor_agrupador, COUNT(*) FROM reglas_documentales GROUP BY 1,2;
SELECT nivel_aplicacion, valor_aplicacion, tipo_regla FROM reglas_pertinencia_clinica;
