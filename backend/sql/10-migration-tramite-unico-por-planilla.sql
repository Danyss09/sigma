-- =====================================================================
-- MIGRACIÓN: numero_tramite único POR PLANILLA, no global
-- =====================================================================
-- Bug real encontrado: el trámite "1" de la planilla A y el trámite "1"
-- de la planilla B son trámites DISTINTOS que casualmente comparten
-- número (cada hospital numera sus propios trámites desde 1) — pero el
-- UNIQUE global sobre numero_tramite hacía que el sistema los tratara
-- como el MISMO trámite, reutilizando datos de una planilla en otra.

ALTER TABLE tramites DROP CONSTRAINT IF EXISTS tramites_numero_tramite_key;

ALTER TABLE tramites ADD CONSTRAINT tramites_numero_planilla_unique
  UNIQUE (numero_tramite, planilla_id);

-- Nota: planilla_id puede ser NULL en teoría (ON DELETE SET NULL), lo
-- cual permitiría en principio 2 trámites con el mismo número y ambos
-- planilla_id NULL — caso borde que no debería darse en la práctica
-- (un trámite sin planilla es un trámite huérfano de una planilla
-- eliminada, no algo que se cree así desde el procesamiento normal).
