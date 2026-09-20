#!/usr/bin/env bash
# =====================================================================
# Respaldo CIFRADO de SIGMA: base de datos + archivos generados + plantillas + almacenamiento.
#
# Preparacion (una sola vez):
#   1. En TU PC (no en el servidor):   age-keygen -o clave-privada.txt
#      Guarda clave-privada.txt en un lugar seguro y fuera del servidor: sin ella NO se puede restaurar.
#   2. Copia la linea "Public key: age1..." (solo el texto age1...) a deploy/age-recipient.txt en el servidor.
#   3. En el servidor:  sudo apt install age
#   4. Programa una tarea diaria (crontab -e):
#        30 2 * * *  /opt/sigma/deploy/backup.sh >> /var/log/sigma-backup.log 2>&1
#
# Variables opcionales: BACKUP_DIR (por defecto /var/backups/sigma), BACKUP_RETENCION_DIAS (14),
#   RCLONE_REMOTE (ej. "onedrive:SIGMA-backups") para copiar tambien fuera del servidor.
# =====================================================================
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_comun.sh"

DESTINO="${BACKUP_DIR:-/var/backups/sigma}"
RETENCION_DIAS="${BACKUP_RETENCION_DIAS:-14}"
RECEPTOR="${AGE_RECIPIENT_FILE:-$RAIZ/deploy/age-recipient.txt}"
FECHA="$(date +%Y%m%d-%H%M%S)"

command -v age >/dev/null || { echo "Falta 'age' (sudo apt install age)" >&2; exit 1; }
[ -s "$RECEPTOR" ] || { echo "Falta la clave publica en $RECEPTOR (ver instrucciones al inicio de este script)" >&2; exit 1; }

umask 077
mkdir -p "$DESTINO"

echo "[$(date -Is)] Respaldando base de datos..."
$DC exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' \
  | gzip -9 | age -R "$RECEPTOR" > "$DESTINO/db-$FECHA.sql.gz.age"

for vol in backend_uploads backend_plantillas minio_data; do
  echo "[$(date -Is)] Respaldando volumen $vol..."
  docker run --rm -v "sigma_${vol}:/datos:ro" alpine tar -C /datos -czf - . \
    | age -R "$RECEPTOR" > "$DESTINO/${vol}-$FECHA.tar.gz.age"
done

echo "[$(date -Is)] Borrando respaldos de mas de $RETENCION_DIAS dias..."
find "$DESTINO" -name '*.age' -mtime +"$RETENCION_DIAS" -delete

if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "[$(date -Is)] Copiando a $RCLONE_REMOTE ..."
  rclone copy "$DESTINO" "$RCLONE_REMOTE" --include "*-$FECHA.*.age"
fi

echo "[$(date -Is)] Respaldo terminado: $DESTINO/*-$FECHA.*"
