SELECT '[' || codigo_cpc_n9 || ']' AS codigo, LENGTH(codigo_cpc_n9) AS longitud,
       descripcion_cpc, umbral_vae, fecha_umbral
FROM cpc_productos
WHERE codigo_cpc_n9 LIKE '%35260530546%';
