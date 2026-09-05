SELECT tipo_catalogo, version, estado, total_registros FROM catalogo_versiones ORDER BY tipo_catalogo;
SELECT MIN(umbral_vae), MAX(umbral_vae), COUNT(*) FILTER (WHERE umbral_vae > 1) FROM cpc_productos;
SELECT codigo_original, estado_validacion, COUNT(*) FROM motivos_objecion WHERE codigo_original IN ('CMT.14','CMT.15') GROUP BY 1,2;
SELECT subsistema, COUNT(*) FROM base_historica_tramites GROUP BY subsistema ORDER BY subsistema;
SELECT resultado_economico_conocido, fue_objetado, COUNT(*) FROM base_historica_tramites GROUP BY 1,2 ORDER BY 1,2;
SELECT codigo, descripcion FROM tarifario_maestro WHERE codigo = '395281';
