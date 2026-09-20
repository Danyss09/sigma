#!/usr/bin/env bash
# =====================================================================
# Restaura la BASE DE DATOS desde un respaldo cifrado (db-*.sql.gz.age).
# ATENCION: reemplaza por completo la base de datos actual.
# Uso:  ./deploy/restore.sh /ruta/clave-privada.txt /var/backups/sigma/db-YYYYMMDD-HHMMSS.sql.gz.age
# (Los volumenes *.tar.gz.age se restauran a mano: age -d -i clave.txt archivo | tar -xz -C <carpeta>)
# =====================================================================
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_comun.sh"

[ $# -eq 2 ] || { echo "Uso: $0 clave-privada.txt db-YYYYMMDD-HHMMSS.sql.gz.age" >&2; exit 1; }
CLAVE="$1"; ARCHIVO="$2"
[ -f "$CLAVE" ]   || { echo "No existe $CLAVE" >&2; exit 1; }
[ -f "$ARCHIVO" ] || { echo "No existe $ARCHIVO" >&2; exit 1; }

echo "Esto REEMPLAZA la base de datos actual por el contenido de $ARCHIVO."
read -r -p "Escribe SI para continuar: " OK
[ "$OK" = "SI" ] || { echo "Cancelado."; exit 1; }

$DC stop nest-api fastapi-ml
$DC exec -T postgres sh -c \
  'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\" WITH (FORCE);" -c "CREATE DATABASE \"$POSTGRES_DB\";"'
age -d -i "$CLAVE" "$ARCHIVO" | gunzip \
  | $DC exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -q'
$DC start nest-api fastapi-ml
echo "Restauracion terminada."
