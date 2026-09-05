-- Valores iniciales EXACTOS confirmados por el usuario -- no se inventa
-- ningun nombre ni cargo adicional. Cargo queda NULL hasta que se
-- edite desde Configuracion si se quiere agregar.

INSERT INTO responsables_firma (tipo, nombre_completo, cargo, orden, activo, nunca_usado)
VALUES
    ('DIRECTOR_ADMINISTRATIVO', 'Econ. Ximena Cobos', NULL, NULL, TRUE, TRUE),
    ('REVISOR', 'Ing. Verónica Cantos', NULL, 1, TRUE, TRUE);

-- Verificacion
SELECT tipo, nombre_completo, cargo, orden, activo FROM responsables_firma ORDER BY tipo;
