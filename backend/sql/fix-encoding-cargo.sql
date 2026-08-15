-- =====================================================================
-- FIX: corrupción de tildes por codificación al piped SQL en PowerShell
-- =====================================================================
-- "type archivo.sql | docker compose exec -T postgres psql ..." en
-- PowerShell no respeta UTF-8 por defecto, corrompiendo tildes/ñ.
-- Este script usa CHR(codigo_unicode) en vez de escribir el caracter
-- directo, así el fix funciona sin importar cómo lo pipees.
--
-- CHR(211) = Ó   |   CHR(209) = Ñ   |   CHR(193)=Á CHR(201)=É CHR(205)=Í CHR(218)=Ú

-- 1. Arreglar el DEFAULT de la columna (para que las planillas NUEVAS
--    ya no se creen con el default corrupto)
ALTER TABLE planillas ALTER COLUMN revisado_cargo
  SET DEFAULT ('ANALISTA - FACTURACI' || CHR(211) || 'N');

-- 2. Arreglar las filas YA existentes que quedaron con "??"
UPDATE planillas
SET revisado_cargo = ('ANALISTA - FACTURACI' || CHR(211) || 'N')
WHERE revisado_cargo LIKE 'ANALISTA%';

-- 3. Verificación
SELECT id, revisado_cargo FROM planillas;
