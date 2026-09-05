-- Configuracion editable (ADMIN) de Director Administrativo y Revisores.
-- No se borra nunca fisicamente un responsable ya usado en documentos --
-- se desactiva (activo=false) para preservar el historico.

CREATE TABLE responsables_firma (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(30) NOT NULL, -- DIRECTOR_ADMINISTRATIVO | REVISOR
    nombre_completo VARCHAR(200) NOT NULL,
    cargo VARCHAR(150),
    firma_path VARCHAR(300),
    orden INTEGER, -- solo aplica a REVISOR (1, 2, 3...); NULL para DIRECTOR_ADMINISTRATIVO
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    nunca_usado BOOLEAN NOT NULL DEFAULT TRUE, -- se pone en FALSE la primera vez que se snapshotea en una planilla; controla si se puede ELIMINAR de verdad o solo desactivar
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_responsables_tipo_activo ON responsables_firma(tipo, activo);

-- Snapshot inmutable: se llena UNA VEZ al crear/procesar la planilla,
-- copiando lo que estaba activo en responsables_firma en ESE momento.
-- Un cambio posterior en responsables_firma NUNCA modifica esto.
CREATE TABLE planilla_responsables_snapshot (
    id SERIAL PRIMARY KEY,
    planilla_id INTEGER NOT NULL REFERENCES planillas(id) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL,
    nombre_completo VARCHAR(200) NOT NULL,
    cargo VARCHAR(150),
    firma_path VARCHAR(300),
    orden INTEGER,
    responsable_origen_id INTEGER REFERENCES responsables_firma(id), -- solo trazabilidad, NUNCA se relee en vivo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_snapshot_planilla ON planilla_responsables_snapshot(planilla_id);
