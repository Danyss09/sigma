-- =====================================================================
-- Reglas documentales y de pertinencia clinica. Aditivo puro -- NO
-- modifica tarifario_maestro, solo referencia sus valores por texto
-- (no FK dura, porque tarifario_maestro tiene clave compuesta
-- codigo+nivel+rol_profesional y varias filas pueden compartir el
-- mismo codigo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Reglas documentales: por HOJA_FUENTE o TIPO_REGISTRO, nunca por
--    codigo individual. Una agrupacion puede exigir VARIOS documentos
--    (una fila por documento requerido).
-- ---------------------------------------------------------------------
CREATE TABLE reglas_documentales (
    id SERIAL PRIMARY KEY,
    tipo_agrupador VARCHAR(20) NOT NULL CHECK (tipo_agrupador IN ('HOJA_FUENTE', 'TIPO_REGISTRO')),
    valor_agrupador VARCHAR(100) NOT NULL,
    documento_requerido VARCHAR(150) NOT NULL,
    obligatorio BOOLEAN NOT NULL DEFAULT TRUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    observacion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tipo_agrupador, valor_agrupador, documento_requerido)
);

CREATE INDEX idx_reglas_doc_agrupador ON reglas_documentales(tipo_agrupador, valor_agrupador) WHERE activo = TRUE;

-- ---------------------------------------------------------------------
-- 2. Reglas de pertinencia clinica: cruce CIE-10 (via patron regex)
--    contra un nivel de aplicacion (codigo especifico, categoria,
--    hoja_fuente o tipo_registro del tarifario).
--
--    tipo_regla = 'PERMITIDO'  -> lista blanca: si existen reglas
--       PERMITIDO para este codigo/grupo y el CIE-10 reportado no
--       coincide con NINGUNA, se bloquea (el codigo exige un
--       diagnostico de cierto tipo y no lo tiene).
--    tipo_regla = 'BLOQUEANTE' -> lista negra explicita: si el CIE-10
--       coincide con el patron, se bloquea SIEMPRE, sin importar si
--       tambien hay una regla PERMITIDO que coincida.
-- ---------------------------------------------------------------------
CREATE TABLE reglas_pertinencia_clinica (
    id SERIAL PRIMARY KEY,
    nivel_aplicacion VARCHAR(20) NOT NULL CHECK (nivel_aplicacion IN ('CODIGO', 'CATEGORIA', 'HOJA_FUENTE', 'TIPO_REGISTRO')),
    valor_aplicacion VARCHAR(150) NOT NULL, -- codigo especifico, o el valor literal de categoria/hoja_fuente/tipo_registro
    cie10_patron VARCHAR(100) NOT NULL,     -- expresion regular POSIX (la que entiende el operador ~ de Postgres)
    descripcion_bloque_cie10 VARCHAR(200),  -- texto legible, ej. "Traumatismos y envenenamientos (S00-T98)"
    tipo_regla VARCHAR(20) NOT NULL CHECK (tipo_regla IN ('PERMITIDO', 'BLOQUEANTE')),
    motivo_alerta TEXT NOT NULL,            -- texto que se muestra al usuario cuando la regla dispara
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fuente_clinica VARCHAR(200),            -- de donde salio la regla (protocolo, guia clinica, criterio de Facturacion) -- trazabilidad, nunca "porque si"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reglas_clinicas_aplicacion ON reglas_pertinencia_clinica(nivel_aplicacion, valor_aplicacion) WHERE activo = TRUE;
