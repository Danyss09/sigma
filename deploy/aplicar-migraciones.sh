#!/usr/bin/env bash
# =====================================================================
# Aplica las migraciones y seeds de backend/sql en orden, UNA sola vez cada una.
# Se ejecuta dentro del contenedor "db-migrate":
#     docker compose --profile setup run --rm db-migrate
# Lleva el registro en la tabla schema_migraciones, asi que es seguro repetirlo:
# solo aplica lo que falte. Excluye 00-stub-esquema-base.sql (es solo para pruebas)
# y los scripts sueltos sin numero (diagnosticos y correcciones puntuales).
# Si un archivo falla, se detiene e indica cual: puede haber quedado aplicado a medias.
# En una base NUEVA se resuelve borrando el volumen (docker compose down -v) y repitiendo.
# =====================================================================
set -euo pipefail
export PGCLIENTENCODING=UTF8

psql -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migraciones (
  nombre      text PRIMARY KEY,
  aplicada_en timestamptz NOT NULL DEFAULT now()
);
SQL

aplicadas=0
omitidas=0

# LC_ALL=C: orden estable (13-... antes que 13b-...)
for archivo in $(cd /sql && LC_ALL=C ls | grep -E '^[0-9]{2}[a-z]?-.*\.sql$' | grep -v '^00-' | LC_ALL=C sort); do
  ya=$(psql -tA -c "SELECT 1 FROM schema_migraciones WHERE nombre = '$archivo'")
  if [ "$ya" = "1" ]; then
    omitidas=$((omitidas + 1))
    continue
  fi
  echo "==> Aplicando $archivo ..."
  if ! psql -v ON_ERROR_STOP=1 -q -f "/sql/$archivo"; then
    echo "" >&2
    echo "ERROR en $archivo. Se detiene aqui (puede haber quedado aplicado parcialmente)." >&2
    exit 1
  fi
  psql -v ON_ERROR_STOP=1 -q -c "INSERT INTO schema_migraciones (nombre) VALUES ('$archivo')"
  aplicadas=$((aplicadas + 1))
done

echo ""
echo "Listo: $aplicadas aplicadas, $omitidas ya estaban aplicadas."
echo "Siguiente paso: ./deploy/crear-admin.sh   (define la clave del administrador)"
