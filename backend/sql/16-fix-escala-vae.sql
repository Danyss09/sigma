-- Corrige la escala de umbral_vae: debe ser la proporcion 0-1, no el
-- porcentaje 0-100. Confirmado 100% uniforme en el generador (una sola
-- linea de codigo, sin ramas, aplicada a las 30098 filas por igual),
-- asi que la correccion /100 es segura para toda la tabla.

ALTER TABLE cpc_productos ALTER COLUMN umbral_vae TYPE NUMERIC(6, 4);

UPDATE cpc_productos SET umbral_vae = umbral_vae / 100 WHERE umbral_vae IS NOT NULL;

ALTER TABLE cpc_productos ADD CONSTRAINT chk_umbral_vae_rango CHECK (umbral_vae IS NULL OR (umbral_vae >= 0 AND umbral_vae <= 1));

-- Verificacion
SELECT MIN(umbral_vae), MAX(umbral_vae), COUNT(*) FILTER (WHERE umbral_vae > 1) AS mayores_a_uno
FROM cpc_productos;
