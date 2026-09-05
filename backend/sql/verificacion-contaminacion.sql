-- 1. ¿El catálogo de medicamentos/insumos tiene datos? (debería estar vacío)
SELECT COUNT(*) AS total_medicamentos_insumos FROM medicamentos_insumos;

-- 2. ¿Hay descripciones IDÉNTICAS repetidas en códigos DISTINTOS?
-- (si aparece algo aquí, sería evidencia real de copiado incorrecto)
SELECT descripcion, COUNT(DISTINCT codigo_original) AS codigos_distintos,
       array_agg(DISTINCT codigo_original) AS codigos
FROM detalles_servicios
WHERE tipo_item = 'MEDICAMENTO' AND descripcion IS NOT NULL AND descripcion <> ''
GROUP BY descripcion
HAVING COUNT(DISTINCT codigo_original) > 1;
