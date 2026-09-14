-- Tasa historica de rechazo total (pertinencia medica / documentacion,
-- NO discrepancia de tarifa) por codigo TPSNS. Es una estadistica
-- agregada del codigo, NO del resultado de una linea especifica --
-- no es data leakage. Solo se calcula con codigos que tienen al menos
-- 3 apariciones reales, para no reportar tasas basadas en 1 solo caso.

CREATE VIEW vista_tasa_rechazo_codigo AS
SELECT
    codigo_tpsns,
    COUNT(*) AS total_apariciones,
    COUNT(*) FILTER (WHERE fue_objetado AND valor_aprobado = 0) AS rechazos_totales,
    ROUND(
        COUNT(*) FILTER (WHERE fue_objetado AND valor_aprobado = 0)::numeric
        / COUNT(*)::numeric,
        4
    ) AS tasa_rechazo
FROM objeciones_linea_real
GROUP BY codigo_tpsns
HAVING COUNT(*) >= 3;

-- Verificacion
SELECT * FROM vista_tasa_rechazo_codigo ORDER BY tasa_rechazo DESC LIMIT 15;
