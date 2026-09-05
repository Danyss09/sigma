-- El VAE quedo corrompido por division doble (perdida de precision
-- irreversible en valores pequenos, redondeados a 0.0000). Se recarga
-- completo desde la fuente original en vez de intentar "deshacer" la
-- transformacion -- es la unica forma segura de garantizar datos
-- correctos, ya que la perdida de precision es irreversible.

BEGIN;

DELETE FROM medicamento_cpc;
DELETE FROM cpc_productos;
DELETE FROM catalogo_versiones WHERE tipo_catalogo = 'CPC';

COMMIT;
