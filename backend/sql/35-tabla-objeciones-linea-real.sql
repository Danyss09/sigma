-- Ground truth REAL a nivel de LINEA (codigo TPSNS), la granularidad
-- que de verdad necesita el modelo (ratio_valor por codigo especifico).
-- Separada de base_historica_tramites porque esa es a nivel de tramite.
CREATE TABLE objeciones_linea_real (
    id SERIAL PRIMARY KEY,
    fuente_documento VARCHAR(200) NOT NULL,
    codigo_tpsns VARCHAR(20) NOT NULL,
    descripcion TEXT,
    cantidad NUMERIC(10,2),
    valor_unitario NUMERIC(12,4),
    valor_solicitado NUMERIC(12,4),
    valor_objetado NUMERIC(12,4),
    valor_aprobado NUMERIC(12,4),
    fue_objetado BOOLEAN NOT NULL,
    motivo_codigo VARCHAR(20), -- CTM.xxx / LQD.xxx / REV.xxx cuando se conoce
    motivo_texto TEXT,
    identificador_anonimo VARCHAR(20), -- el que ya trae la fuente (ej. "prueba0001"), NUNCA cedula real
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_objeciones_linea_codigo ON objeciones_linea_real(codigo_tpsns);
