# SIGMA — Sistema de Gestión de Planillas Médicas

Sistema para el procesamiento, evaluación de riesgo y auditoría de planillas de facturación médica de un hospital público en Ecuador (Centro Clínico Quirúrgico Ambulatorio Hospital del Día Chimbacalle). Proyecto de tesis.

## Qué hace

1. **Carga** la MATRIZ original (.xlsx/.xlsm) que trae los trámites/beneficiarios/códigos de un período.
2. **Procesa** la matriz: valida cada código contra catálogos oficiales (TPSNS, medicamentos AS400, CPC/VAE), autocompleta datos seguros, y separa lo que sí se puede procesar automáticamente de lo que necesita revisión humana.
3. **Evalúa el riesgo** de cada línea con un modelo RandomForest + explicabilidad SHAP, y corrige automáticamente discrepancias claras de valor contra catálogo.
4. **Sugiere motivos de objeción** (CTM/LQD/REV) según la causa del riesgo — nunca decide, solo sugiere.
5. Permite la **auditoría humana** de todo lo que no se pudo resolver automáticamente.
6. **Genera** las planillas individuales y consolidadas (Excel + PDF real) con las firmas configuradas.
7. Mantiene **trazabilidad LOPDP** de cada acceso/acción sobre los archivos.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend de negocio | NestJS + TypeScript + TypeORM |
| Microservicio ML | Python 3.11 + FastAPI + scikit-learn (RandomForest) + SHAP |
| Base de datos | PostgreSQL 15 |
| Almacenamiento de archivos | MinIO (self-hosted, compatible S3) |
| Generación de documentos | ExcelJS + LibreOffice headless (conversión a PDF real) |
| Orquestación | Docker Compose |

No se usa ningún servicio de pago ni dependencia de nube externa — todo corre self-hosted.

## Estructura del proyecto

```
sigma/
├── backend/              # NestJS
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/              # JWT, login, roles
│   │   │   ├── users/             # Gestión de usuarios (solo ADMIN)
│   │   │   ├── planillas/         # Subida, procesamiento, generación de documentos
│   │   │   ├── tramites/          # Entidad Trámite
│   │   │   ├── expedientes/       # Entidad Expediente (beneficiario)
│   │   │   ├── detalles/          # Entidad DetalleServicio (línea de código)
│   │   │   ├── matching/          # Motor de matching AS400/TPSNS (EXACTA/NORMALIZADA_UNICA/AMBIGUA/NO_ENCONTRADO)
│   │   │   ├── predicciones/      # Evaluación de riesgo, corrección automática, SHAP
│   │   │   ├── auditoria/         # Auditoría de facturación (decisiones, motivos)
│   │   │   ├── motivos-objecion/  # Catálogo CTM/LQD/REV
│   │   │   ├── catalogos/         # Versiones de catálogos oficiales (activar/desactivar)
│   │   │   ├── responsables/      # Firmas y responsables (Director/Revisores)
│   │   │   ├── dashboard/         # Indicadores globales del sistema
│   │   │   ├── audit-log/         # Trazabilidad LOPDP
│   │   │   └── minio/             # Cliente de almacenamiento
│   │   └── common/                # Guards, decoradores, enums compartidos
│   └── sql/                       # Migraciones y seeds (numeradas en orden)
├── frontend/             # React
│   └── src/
│       ├── pages/                 # Una página por pantalla
│       ├── api/                   # Clientes HTTP por módulo
│       ├── components/            # Layout, componentes compartidos
│       └── styles/                # Tema visual (variables CSS)
├── ml/                   # FastAPI
│   ├── main.py                    # Endpoints /predecir-riesgo, /validar-pertinencia
│   ├── entrenar_modelo.py         # Script de entrenamiento del RandomForest
│   ├── modelo_riesgo.pkl          # Modelo entrenado (no versionar cambios sin reentrenar con justificación)
│   └── columnas_modelo.json       # Orden de features esperado por el modelo
└── docker-compose.postgres.yml    # Postgres + MinIO para desarrollo
```

## Requisitos previos

- Node.js 18+ y npm
- Python 3.11+
- Docker y Docker Compose
- LibreOffice instalado en el sistema (para conversión a PDF) — `soffice` debe estar en el PATH

## Instalación y arranque (desarrollo local)

### 1. Base de datos y almacenamiento

```powershell
docker compose -f docker-compose.postgres.yml up -d
```

Levanta PostgreSQL (puerto 5432) y MinIO (API 9000, consola web 9001).

### 2. Migraciones y catálogos

Aplica las migraciones en orden numérico (`sql/01-...` hasta la más reciente):

```powershell
docker compose -f docker-compose.postgres.yml cp sql/NN-archivo.sql postgres:/tmp/mig.sql
docker compose -f docker-compose.postgres.yml exec postgres psql -U sigma_user -d sigma_db -f /tmp/mig.sql
```

**Importante**: usa siempre `docker cp` + `psql -f`, nunca un pipe de PowerShell (`Get-Content | docker exec psql`) — corrompe el UTF-8 de los acentos.

### 3. Backend

```powershell
cd backend
npm install
# Configura .env (ver sección de variables de entorno abajo)
npm run start:dev
```

Corre en `http://localhost:3000`. Documentación Swagger en `http://localhost:3000/api` (si está habilitado).

### 4. Microservicio ML

```powershell
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt --break-system-packages
uvicorn main:app --reload --port 8000
```

### 5. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Corre en `http://localhost:5173`.

## Variables de entorno

### Backend (`.env`)

```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=sigma_user
POSTGRES_PASSWORD=<tu_password>
POSTGRES_DB=sigma_db

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=<tu_access_key>
MINIO_SECRET_KEY=<tu_secret_key>
MINIO_BUCKET=sigma-planillas
MINIO_USE_SSL=false

JWT_SECRET=<un_secreto_largo_y_aleatorio>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

FASTAPI_URL=http://127.0.0.1:8000
```

**Nota**: usa `127.0.0.1`, no `localhost`, para `FASTAPI_URL` en Windows (evita problemas de resolución IPv4/IPv6).

### ML (`.env` o variables de entorno del sistema)

```
SIGMA_DB_DSN=host=127.0.0.1 dbname=sigma_db user=sigma_user password=<tu_password>
```

(usada por el módulo de validación de pertinencia clínica, que sí consulta Postgres directamente)

## Usuarios y roles

Tres roles: `ADMIN`, `AUDITOR`, `DIGITADOR`.

| Rol | Puede |
|---|---|
| DIGITADOR | Subir y procesar planillas, consultar resultados |
| AUDITOR | Todo lo del DIGITADOR + decidir en Auditoría + generar documentos |
| ADMIN | Todo + gestionar usuarios, catálogos, firmas/responsables, auditoría LOPDP |

El primer usuario ADMIN debe crearse manualmente en base de datos (`INSERT` directo con contraseña ya hasheada con bcrypt) — no hay bootstrap automático por seguridad.

## Flujo funcional completo

```
MATRIZ (.xlsx)
  ↓ Subir (wizard)
  ↓ Procesar → valida contra catálogo, clasifica cada línea
  ↓   ├── EXACTA / NORMALIZADA_UNICA → autocompleta, sigue
  ↓   ├── AMBIGUA / NO_ENCONTRADO (TPSNS) → RECHAZADO automático
  ↓   └── sin catálogo (medicamento) → PENDIENTE, va a Auditoría
  ↓ Evaluar riesgo (RandomForest + SHAP)
  ↓   ├── BAJO/MEDIO → sigue
  ↓   └── ALTO/CRÍTICO con discrepancia de valor → corrección automática
  ↓ Auditoría (líneas que necesitan revisión humana)
  ↓   ├── motivo sugerido (CTM/LQD/REV) según causa del riesgo
  ↓   └── decisión del auditor + reevaluación si cambió el valor
  ↓ Generación de documentos
  ↓   ├── Individual por trámite (PDF real vía LibreOffice)
  ↓   ├── Consolidada por servicio (suma por beneficiario, valores ya corregidos)
  ↓   └── Descarga: individual, ZIP de todas, o unidas en un solo PDF
  ↓ Dashboard global (indicadores agregados de todo el sistema)
```

## Catálogos oficiales

SIGMA usa 6 fuentes de catálogo versionadas (tabla `catalogo_versiones`), cada una con estados `BORRADOR → ACTIVO → HISTORICO`:

1. **Tarifario** — procedimientos TPSNS, honorarios, con código+nivel+rol profesional
2. **Medicamentos/insumos** — catálogo AS400, con normalización de código 13→10 dígitos
3. **CPC/VAE** — clasificación de compras públicas y umbral de valor agregado ecuatoriano
4. **Motivos de objeción** — catálogo CTM (pertinencia médica) / LQD (control de tarifas) / REV (revisión documental)
5. **Precios históricos de medicamentos** — referencia, nunca tarifa oficial
6. **Base histórica de trámites** — para eventual reentrenamiento del modelo, solo con evidencia real suficiente

Solo puede haber **una versión ACTIVA por tipo** a la vez. Mientras ningún catálogo esté activo, el sistema usa las tablas legacy (`tarifas`, `medicamentos_insumos`) automáticamente — no hay que esperar a activar nada para que SIGMA funcione.

La importación de una versión NUEVA de catálogo se hace hoy con scripts Python + SQL (no hay upload web todavía) — ver `sql/README-catalogos.md` si existe, o los scripts en la carpeta de importación.

## Modelo de Machine Learning

- **RandomForest** entrenado con dataset **sintético** (900 filas, 3 tipos de anomalía) — esto está documentado y es intencional: el dataset real disponible (310 líneas reales acumuladas de auditorías reales) todavía no es suficiente para un reentrenamiento defendible.
- Features: `ratio_valor` (solicitado/oficial), `cantidad`, `veces_repetido_beneficiario` (repetición del mismo código+beneficiario, con alcance limitado a la misma planilla).
- Explicabilidad vía **SHAP** — cada predicción incluye la contribución de cada feature.
- El modelo actual **solo detecta objeciones por discrepancia de tarifa** (grupo LQD). Un hallazgo real del proyecto: ~45% de las objeciones reales observadas corresponden a pertinencia médica o documentación, fuera del alcance de este modelo por diseño (requeriría una tabla clínica CIE-10↔procedimiento y registro de completitud documental, que no existen todavía).

## Pruebas

Ver `SIGMA_Plan_Pruebas_QA.docx` — plan de pruebas de calidad formal con casos de prueba por módulo y casos de regresión de bugs reales encontrados durante el desarrollo.

## Limitaciones conocidas

- Sin servidor de correo: la recuperación de contraseña es manual (el ADMIN resetea desde Usuarios).
- Importación de catálogos nuevos requiere acceso a scripts Python, no está expuesta en el frontend.
- Política de retención LOPDP de 5 años calculada pero sin verificación en vivo contra una base de datos con volumen real de varios años.
- El modelo de riesgo cubre discrepancias de tarifa; no cubre pertinencia médica ni completitud documental (ver sección de ML).
- Solo 1 revisor + 1 aprobador por documento (la plantilla Excel actual no tiene espacio para un segundo revisor; requeriría rediseñar la plantilla).

## Autor / Contexto

Proyecto de tesis — Ingeniería en Sistemas / Software. Ecuador, 2026.
