SELECT numero_tramite, planilla_id, id
FROM tramites
WHERE numero_tramite IN ('1','2','3','4','5','6','7','8','9','10')
ORDER BY numero_tramite::int, planilla_id;
