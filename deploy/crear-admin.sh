#!/usr/bin/env bash
# =====================================================================
# Define la contrasena del usuario administrador (por defecto admin@sigma.ec).
# El seed 04-seed.sql trae un hash que NO corresponde a ninguna contrasena conocida;
# este script lo reemplaza por el de la clave que tu elijas (bcrypt, generado dentro del backend).
# Uso:  ./deploy/crear-admin.sh [correo]
# =====================================================================
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_comun.sh"

EMAIL="${1:-admin@sigma.ec}"

read -r -s -p "Nueva contrasena para $EMAIL (minimo 8 caracteres): " PASS; echo
read -r -s -p "Repitela: " PASS2; echo
[ "$PASS" = "$PASS2" ] || { echo "No coinciden." >&2; exit 1; }
[ "${#PASS}" -ge 8 ]   || { echo "Es muy corta (minimo 8)." >&2; exit 1; }

HASH=$($DC exec -T -e SIGMA_PASS="$PASS" nest-api \
  node -e "console.log(require('bcrypt').hashSync(process.env.SIGMA_PASS, 10))")

RESULTADO=$($DC exec -T postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -v h="$1" -v e="$2"' _ "$HASH" "$EMAIL" <<'SQL'
UPDATE users SET password_hash = :'h', activo = true WHERE email = :'e';
SQL
)

if [ "$RESULTADO" = "UPDATE 1" ]; then
  echo "Listo: la contrasena de $EMAIL quedo actualizada."
else
  echo "No se actualizo ningun usuario ($RESULTADO). Revisa que $EMAIL exista en la tabla users." >&2
  exit 1
fi
