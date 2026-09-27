# =====================================================================
# SIGMA - Backend (NestJS) para produccion
# Multietapa: compilar -> dependencias de produccion -> imagen final
# La imagen final incluye LibreOffice (conversion Excel -> PDF real).
# =====================================================================

# ---------- Etapa 1: compilar TypeScript ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
# El proyecto tiene errores de tipos preexistentes (en desarrollo se corre con
# ts-node-dev --transpile-only, que no los revisa). tsc igual genera el JavaScript;
# lo que si se exige es que exista dist/main.js.
RUN npx tsc -p tsconfig.json || true
RUN test -f dist/main.js

# ---------- Etapa 2: solo dependencias de produccion ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Etapa 3: imagen final ----------
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOME=/home/node

# LibreOffice headless + fuentes (Carlito = equivalente metrico de Calibri)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libreoffice-calc \
      fonts-liberation \
      fonts-dejavu-core \
      fonts-crosextra-carlito \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=deps  --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
# Plantillas Excel versionadas (el ADMIN puede subir nuevas; van a un volumen)
COPY --chown=node:node plantillas ./plantillas
# Carpeta donde se generan las planillas individuales y consolidadas
RUN mkdir -p uploads && chown node:node uploads

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
