-- Rastro auditable POR CAMPO de cada autocompletado real (seccion 14):
-- que campo cambio, de que valor a que valor, con que fuente/version.
CREATE TABLE autocompletados_campos (
    id SERIAL PRIMARY KEY,
    detalle_servicio_id INTEGER NOT NULL REFERENCES detalles_servicios(id) ON DELETE CASCADE,
    campo VARCHAR(50) NOT NULL,
    valor_original TEXT,
    valor_nuevo TEXT,
    fuente VARCHAR(50),
    version_fuente INTEGER REFERENCES catalogo_versiones(id),
    tipo_match VARCHAR(20),
    origen VARCHAR(20) NOT NULL DEFAULT 'SISTEMA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_autocompletados_detalle ON autocompletados_campos(detalle_servicio_id);
