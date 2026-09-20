#!/usr/bin/env bash
# Funciones comunes de los scripts de deploy/. No se ejecuta directamente.
# Define DC = comando "docker compose" correcto:
#  - en el servidor (.env con COMPOSE_FILE):  docker compose
#  - en tu PC (solo .env.production):         docker compose --env-file .env.production -f docker-compose.prod.yml
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"
if [ -f .env ] && grep -q '^COMPOSE_FILE=' .env; then
  DC="docker compose"
elif [ -f .env.production ]; then
  DC="docker compose --env-file .env.production -f docker-compose.prod.yml"
else
  echo "No encuentro .env ni .env.production en $RAIZ" >&2
  exit 1
fi
