-- Corrige el tipo de mes_normalizado: la fuente real trae nombres de
-- mes en texto (ENERO..DICIEMBRE, mas NO_REGISTRADO), nunca un numero.
-- Error de diseno mio en la migracion 13 (asumi "normalizado"=numerico
-- sin verificar contra la fuente).
ALTER TABLE base_historica_tramites ALTER COLUMN mes_normalizado TYPE VARCHAR(20);
