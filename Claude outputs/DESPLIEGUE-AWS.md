# Despliegue de SIGMA en AWS — resumen

Este documento resume cómo está desplegado SIGMA en el servidor de AWS Academy Learner Lab, para poder repetir el proceso o levantarlo de nuevo si algo se pierde. Está armado a partir de los scripts y archivos de despliegue del repositorio (`deploy/`, `docker-compose.prod.yml`, `.env.production.example`, workflow de GitHub Actions).

## 1. Dónde vive y arquitectura

- **Laboratorio**: AWS Academy Learner Lab [187865] (cuenta de aula, temporal — hay que darle "Start Lab" en Canvas cada vez que se va a usar).
- **Instancia EC2**: `sigma-servidor`.
- **IP pública**: `98.94.237.95`, reservada como **IP elástica**, por eso no cambia cada vez que se apaga/prende la instancia.
- **Acceso SSH**: `ssh -i sigma-key.pem ubuntu@98.94.237.95` (la llave vive en la PC del usuario, en `C:\TESIS\sigma`).
- **Dominio de acceso**: `https://98.94.237.95.nip.io` — nip.io resuelve automáticamente ese subdominio a la propia IP, así que no hace falta comprar un dominio para tener un nombre válido con el que sacar un certificado HTTPS real.

Todo el stack corre con **Docker Compose** en un solo contenedor por servicio:

| Servicio | Rol | Expuesto a internet |
|---|---|---|
| `web` (Caddy) | HTTPS automático (Let's Encrypt) + sirve el frontend compilado + proxy inverso hacia la API | Sí (80/443) |
| `nest-api` | Backend NestJS | No, solo red interna |
| `fastapi-ml` | Microservicio de ML | No, solo red interna |
| `postgres` | Base de datos | No, solo red interna |
| `minio` + `minio-init` | Almacenamiento de archivos (compatible S3) | No, solo red interna |

Solo Caddy publica puertos; todo lo demás vive en la red interna de Docker (`interna`, definida en `docker-compose.prod.yml`) y no es accesible directamente desde fuera del servidor. Esa es una diferencia importante frente al `docker-compose.yml` de desarrollo (el de tu máquina), que sí publica los puertos de Postgres, MinIO, etc. — en producción eso se cerró a propósito.

## 2. Caddy y HTTPS

El `Caddyfile` (`deploy/Caddyfile`) hace tres cosas:

1. Pide el certificado HTTPS automáticamente a Let's Encrypt para el dominio en `DOMAIN` (con nip.io, eso es `98.94.237.95.nip.io`), usando el correo de `ACME_EMAIL` para avisos de vencimiento.
2. Sirve el frontend de React ya compilado (`/srv`, generado en el build de la imagen `web`) como SPA (cualquier ruta desconocida cae a `index.html`).
3. Redirige `/backend/*` hacia `nest-api:3000`, quitando el prefijo `/backend` antes de mandarlo — y bloquea explícitamente el Swagger (`/api`, `/api-json`, etc.) para que no quede expuesto al público.

También agrega cabeceras de seguridad estándar (HSTS, `X-Content-Type-Options`, `X-Frame-Options`, etc.).

## 3. Variables de entorno de producción

La plantilla es `.env.production.example` (sin secretos, sí se sube a git). En el servidor existe un `.env.production` real (o un `.env` con `COMPOSE_FILE=docker-compose.prod.yml`) que **no** se sube al repositorio — está en `.gitignore` a propósito. Ahí se definen, entre otras cosas:

- `DOMAIN` y `ACME_EMAIL` (para el certificado).
- Credenciales de Postgres, MinIO y los secretos JWT — generadas con `openssl rand -hex 24` / `openssl rand -base64 48`, **nunca** reutilizando lo que trae el `.env.example` del repo (esas claves están públicas en GitHub).
- Opcionalmente `REGISTRY`/`TAG`, si las imágenes las construye GitHub Actions en vez de compilarlas en el propio servidor.

## 4. Puesta en marcha desde cero (o reconstrucción total)

En el servidor, dentro de `/opt/sigma` (o la ruta donde esté clonado el repo):

```bash
cp .env.production.example .env.production   # y editar los valores CAMBIAR
echo "COMPOSE_FILE=docker-compose.prod.yml" >> .env

docker compose up -d --build                 # construye y levanta todo

# Aplicar migraciones y seeds (una sola vez cada una; es seguro repetirlo)
docker compose --profile setup run --rm db-migrate

# Definir la contraseña del usuario admin@sigma.ec
./deploy/crear-admin.sh
```

`aplicar-migraciones.sh` corre todos los `.sql` de `backend/sql/` en orden numérico, dejando registro en una tabla `schema_migraciones` para no reaplicar nada dos veces.

`crear-admin.sh` pide la contraseña por teclado (dos veces, sin mostrarla en pantalla), la hashea con bcrypt **dentro del contenedor del backend** y actualiza directamente la fila del usuario en Postgres. La contraseña en texto plano nunca queda escrita en ningún archivo ni log — por diseño.

## 5. Rutina diaria: prender/apagar el laboratorio

Como el Learner Lab se paga por horas de uso, la instancia se apaga cuando no se usa. Para volver a levantarla:

1. Canvas → curso AWS Academy Learner Lab [187865] → Modules → **Start Lab** (esperar círculo verde).
2. Consola de AWS → EC2 → Instancias → `sigma-servidor` → Estado de la instancia → **Iniciar instancia**.
3. La IP elástica sigue siendo `98.94.237.95`.
4. Todos los servicios tienen `restart: unless-stopped`, y el propio Docker se levanta con el sistema operativo al arrancar la instancia — por eso los contenedores vuelven a estar corriendo solos, sin intervención manual, unos 1-2 minutos después de que la instancia esté "En ejecución". Si por algo no arrancaron solos: `cd ~/sigma && docker compose up -d`.
5. Verificar con `docker compose ps` (deben verse `postgres`, `minio`, `nest-api`, `fastapi-ml`, `web`) y luego probar `https://98.94.237.95.nip.io`.

## 6. Backups

`deploy/backup.sh` hace un respaldo **cifrado** (con [`age`](https://github.com/FiloSottile/age)) de la base de datos (`pg_dump`) y de los volúmenes `backend_uploads`, `backend_plantillas` y `minio_data`, con retención configurable (14 días por defecto) y copia opcional a un remoto vía `rclone`. Pensado para correr diario por `cron` en el servidor.

`deploy/restore.sh` hace lo inverso sobre la base de datos: pide confirmación explícita (hay que escribir "SI"), para y reinicia `nest-api`/`fastapi-ml`, y reemplaza la base completa. Los volúmenes de archivos se restauran a mano (el propio script indica el comando).

La clave privada de `age` **no vive en el servidor** — se genera en la PC del usuario y solo se sube al servidor la clave pública (`deploy/age-recipient.txt`). Sin la clave privada, los respaldos no se pueden abrir; conviene confirmar que esa clave está guardada en un lugar seguro y separado del servidor.

## 7. CI/CD (opcional, ya configurado en el repo)

El workflow `.github/workflows/imagenes.yml` construye las tres imágenes (backend, web, ml) en cada push a la rama `servidor` y en pull requests (solo build, sin publicar, en PRs). Si se publican, van a GHCR (`ghcr.io/<usuario>/sigma-<servicio>`). Si además se activa la variable de repositorio `DESPLEGAR=true` y se configuran los secrets `SSH_HOST`, `SSH_USER`, `SSH_KEY`, el propio workflow se conecta por SSH al servidor y corre `git pull` + `docker compose pull` + `docker compose up -d`. Ahora mismo esto es una opción disponible, no necesariamente la forma en la que se está actualizando el servidor día a día.

## 8. Pendiente conocido

El microservicio de MinIO tiene un problema de despliegue detectado y ya resuelto a nivel de código (ver el informe aparte), pero **ese arreglo todavía no está commiteado ni desplegado en el servidor** — ver la sección siguiente antes de tocar MinIO en producción.
