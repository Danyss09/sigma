-- Stub minimo de las tablas base que ya existen en el proyecto real,
-- solo para poder PROBAR las migraciones de catalogos aqui mismo.
CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(150));
CREATE TABLE planillas (id SERIAL PRIMARY KEY, nombre_archivo VARCHAR(300));
CREATE TABLE tramites (id SERIAL PRIMARY KEY, planilla_id INTEGER REFERENCES planillas(id), numero_tramite VARCHAR(50));
CREATE TABLE expedientes (id SERIAL PRIMARY KEY, tramite_id INTEGER REFERENCES tramites(id));
CREATE TABLE detalles_servicios (id SERIAL PRIMARY KEY, expediente_id INTEGER REFERENCES expedientes(id), codigo_original VARCHAR(20));
CREATE TABLE decisiones_auditoria (id SERIAL PRIMARY KEY, detalle_servicio_id INTEGER REFERENCES detalles_servicios(id));
CREATE TABLE predicciones_riesgo (id SERIAL PRIMARY KEY, detalle_servicio_id INTEGER REFERENCES detalles_servicios(id), nivel_riesgo VARCHAR(20), puntaje NUMERIC(5,2));
CREATE TABLE medicamentos_insumos (id SERIAL PRIMARY KEY, codigo_as400 VARCHAR(20), descripcion TEXT, tipo VARCHAR(20), precio_oficial NUMERIC(10,4), unidad_medida VARCHAR(20), fecha_vigencia_desde DATE);
INSERT INTO users (id, email) VALUES (1, 'admin@sigma.ec'), (2, 'auditor@sigma.ec');
