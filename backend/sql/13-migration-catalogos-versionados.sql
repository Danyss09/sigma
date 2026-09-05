-- =====================================================================
-- MIGRACION 13: Sistema de catalogos versionados
-- NO borra ni modifica tarifas/medicamentos_insumos existentes.
-- Las tablas nuevas son ADITIVAS; tarifas/medicamentos_insumos se
-- amplian con columnas nuevas (nullable, no rompen filas existentes).
-- =====================================================================

CREATE TYPE estado_catalogo_enum AS ENUM ('BORRADOR', 'ACTIVO', 'HISTORICO', 'RECHAZADO');

CREATE TABLE catalogo_versiones (
    id SERIAL PRIMARY KEY,
    tipo_catalogo VARCHAR(50) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    version VARCHAR(30) NOT NULL,
    nombre_archivo_original VARCHAR(300),
    hash_sha256 VARCHAR(64),
    vigencia_desde DATE,
    vigencia_hasta DATE,
    fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cargado_por INTEGER REFERENCES users(id),
    estado estado_catalogo_enum NOT NULL DEFAULT 'BORRADOR',
    total_registros INTEGER,
    observacion TEXT,
    UNIQUE (tipo_catalogo, version)
);

CREATE INDEX idx_catalogo_versiones_tipo_estado ON catalogo_versiones(tipo_catalogo, estado);

CREATE TABLE tarifario_maestro (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES catalogo_versiones(id),
    codigo VARCHAR(20) NOT NULL,
    descripcion TEXT,
    tipo_registro VARCHAR(50),
    categoria TEXT,
    nivel_atencion VARCHAR(10),
    rol_profesional VARCHAR(60),
    uvr NUMERIC(10, 4),
    fcm NUMERIC(10, 4),
    valor_calculado_usd NUMERIC(12, 4),
    valor_aplicable_usd NUMERIC(12, 2),
    fuente_primaria VARCHAR(100),
    hoja_fuente VARCHAR(100),
    fila_fuente INTEGER,
    estado_registro VARCHAR(30),
    observacion TEXT,
    UNIQUE (version_id, codigo, nivel_atencion, rol_profesional)
);

CREATE INDEX idx_tarifario_maestro_codigo ON tarifario_maestro(codigo);
CREATE INDEX idx_tarifario_maestro_version ON tarifario_maestro(version_id);

ALTER TABLE medicamentos_insumos ADD COLUMN IF NOT EXISTS version_id INTEGER REFERENCES catalogo_versiones(id);
ALTER TABLE medicamentos_insumos ADD COLUMN IF NOT EXISTS codigo_as400_original VARCHAR(20);
ALTER TABLE medicamentos_insumos ADD COLUMN IF NOT EXISTS codigo_as400_normalizado VARCHAR(20);
ALTER TABLE medicamentos_insumos ADD COLUMN IF NOT EXISTS descripcion_compras_2022 TEXT;
ALTER TABLE medicamentos_insumos ADD COLUMN IF NOT EXISTS descripcion_anexos_previa TEXT;
ALTER TABLE medicamentos_insumos ADD COLUMN IF NOT EXISTS forma_farmaceutica VARCHAR(100);
ALTER TABLE medicamentos_insumos ADD COLUMN IF NOT EXISTS concentracion VARCHAR(100);
ALTER TABLE medicamentos_insumos ADD COLUMN IF NOT EXISTS presentacion VARCHAR(150);
ALTER TABLE medicamentos_insumos ADD COLUMN IF NOT EXISTS catalogado_sercop_2022 VARCHAR(20);
ALTER TABLE medicamentos_insumos ADD COLUMN IF NOT EXISTS uso_en_sigma VARCHAR(60);
ALTER TABLE medicamentos_insumos ADD COLUMN IF NOT EXISTS estado_validacion VARCHAR(40);
ALTER TABLE medicamentos_insumos ADD COLUMN IF NOT EXISTS observacion TEXT;

CREATE INDEX IF NOT EXISTS idx_medicamentos_codigo_normalizado ON medicamentos_insumos(codigo_as400_normalizado);
CREATE INDEX IF NOT EXISTS idx_medicamentos_codigo_original ON medicamentos_insumos(codigo_as400_original);

CREATE TABLE cpc_productos (
    id SERIAL PRIMARY KEY,
    codigo_cpc_n9 VARCHAR(20) NOT NULL UNIQUE,
    descripcion_cpc TEXT,
    umbral_vae NUMERIC(5, 2),
    fecha_umbral DATE,
    fuente VARCHAR(200)
);

CREATE TABLE medicamento_cpc (
    id SERIAL PRIMARY KEY,
    medicamento_id INTEGER NOT NULL REFERENCES medicamentos_insumos(id),
    cpc_id INTEGER NOT NULL REFERENCES cpc_productos(id),
    fuente_relacion VARCHAR(200),
    vigencia_desde DATE,
    vigencia_hasta DATE,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    UNIQUE (medicamento_id, cpc_id)
);

CREATE TABLE historico_precios_medicamentos (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES catalogo_versiones(id),
    codigo_as400_base VARCHAR(20) NOT NULL,
    codigo_compra_13 VARCHAR(20),
    descripcion_compra TEXT,
    forma_farmaceutica VARCHAR(100),
    presentacion VARCHAR(150),
    cantidad NUMERIC(12, 2),
    precio_unitario NUMERIC(12, 4),
    precio_total NUMERIC(14, 2),
    fuente_mercado VARCHAR(100),
    catalogado_sercop VARCHAR(20),
    tipo_procedimiento VARCHAR(100),
    fecha_proceso DATE,
    documento_fuente VARCHAR(300),
    calidad_extraccion VARCHAR(20)
);

CREATE INDEX idx_historico_precios_codigo ON historico_precios_medicamentos(codigo_as400_base);

CREATE TABLE motivos_objecion (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES catalogo_versiones(id),
    grupo VARCHAR(30) NOT NULL,
    codigo_original VARCHAR(20) NOT NULL,
    codigo_canonico VARCHAR(20) NOT NULL,
    descripcion TEXT,
    respaldo_normativo VARCHAR(200),
    estado_validacion VARCHAR(40) DEFAULT 'REQUIERE_VALIDACION',
    observacion TEXT
);

ALTER TABLE decisiones_auditoria ADD COLUMN IF NOT EXISTS motivo_objecion_id INTEGER REFERENCES motivos_objecion(id);

CREATE TABLE base_historica_tramites (
    id SERIAL PRIMARY KEY,
    version_id INTEGER NOT NULL REFERENCES catalogo_versiones(id),
    subsistema VARCHAR(30),
    tipo_servicio_normalizado VARCHAR(50),
    anio INTEGER,
    mes_normalizado VARCHAR(20),
    numero_planillas INTEGER,
    valor_solicitado NUMERIC(14, 2),
    valor_objetado NUMERIC(14, 2),
    valor_aprobado NUMERIC(14, 2),
    fue_objetado BOOLEAN,
    porcentaje_objetado NUMERIC(6, 4),
    observacion_original TEXT,
    elegible_modelo_preliminar BOOLEAN DEFAULT FALSE,
    consistencia_economica VARCHAR(30),
    estado_calidad_registro VARCHAR(30)
);

CREATE TABLE planilla_catalogos_usados (
    id SERIAL PRIMARY KEY,
    planilla_id INTEGER NOT NULL REFERENCES planillas(id) ON DELETE CASCADE,
    tarifario_version_id INTEGER REFERENCES catalogo_versiones(id),
    medicamentos_version_id INTEGER REFERENCES catalogo_versiones(id),
    motivos_version_id INTEGER REFERENCES catalogo_versiones(id),
    fecha_validacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (planilla_id)
);

CREATE TABLE detalle_match_catalogo (
    id SERIAL PRIMARY KEY,
    detalle_servicio_id INTEGER NOT NULL REFERENCES detalles_servicios(id) ON DELETE CASCADE,
    codigo_recibido VARCHAR(20) NOT NULL,
    codigo_encontrado VARCHAR(20),
    tipo_coincidencia VARCHAR(20) NOT NULL,
    fuente VARCHAR(50),
    version_id INTEGER REFERENCES catalogo_versiones(id),
    confianza VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE predicciones_riesgo ADD COLUMN IF NOT EXISTS vigente BOOLEAN DEFAULT TRUE;
ALTER TABLE predicciones_riesgo ADD COLUMN IF NOT EXISTS version_modelo VARCHAR(30);
