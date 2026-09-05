-- =====================================================================
-- MIGRACIÓN: predicciones por línea de detalle + correcciones automáticas
-- =====================================================================
-- El esquema original ligaba predicciones_riesgo solo a expediente_id,
-- pero el riesgo real se evalúa por LÍNEA (código+valor), no por todo
-- el expediente (un paciente puede tener una línea normal y otra
-- fraudulenta en el mismo trámite). Se agrega detalle_servicio_id.

ALTER TABLE predicciones_riesgo
  ADD COLUMN detalle_servicio_id INTEGER REFERENCES detalles_servicios(id) ON DELETE CASCADE;

ALTER TABLE predicciones_riesgo
  ALTER COLUMN expediente_id DROP NOT NULL;

CREATE INDEX idx_predicciones_detalle ON predicciones_riesgo(detalle_servicio_id);

-- Tabla nueva: rastro auditable de cada corrección automática que hizo
-- la IA (nunca se corrige en silencio, cada corrección queda registrada
-- aquí + una decisión automática en decisiones_auditoria).
CREATE TABLE correcciones_automaticas (
    id SERIAL PRIMARY KEY,
    detalle_servicio_id INTEGER NOT NULL REFERENCES detalles_servicios(id) ON DELETE CASCADE,
    prediccion_id INTEGER REFERENCES predicciones_riesgo(id) ON DELETE SET NULL,
    valor_anterior NUMERIC(12, 2) NOT NULL,
    valor_corregido NUMERIC(12, 2) NOT NULL,
    nivel_riesgo nivel_riesgo_enum NOT NULL,
    puntaje NUMERIC(5, 2) NOT NULL,
    motivo TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_correcciones_detalle ON correcciones_automaticas(detalle_servicio_id);
