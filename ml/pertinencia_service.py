"""
Validador de pertinencia clinica y documental. Se ejecuta ANTES de que
una linea se marque como valida -- si no cumple, se levanta una alerta
preventiva para evitar la objecion (glosa) real despues.

Requiere conexion a PostgreSQL (las reglas viven ahi, no en el .pkl del
modelo de riesgo -- son cosas distintas: esto es reglas deterministas,
el RandomForest es el score de riesgo de VALOR).
"""
from pydantic import BaseModel, Field
from typing import List, Optional
import psycopg2
import psycopg2.extras
import os

DB_DSN = os.environ.get("SIGMA_DB_DSN", "host=127.0.0.1 dbname=sigma_db user=sigma_user password=CAMBIAR")


class PayloadValidacionPertinencia(BaseModel):
    codigo_tarifario: str = Field(..., description="Código TPSNS de la línea a validar")
    cie_10_reportado: str = Field(..., description="Código CIE-10 del expediente, ej. 'S72.0'")
    documentos_adjuntos: List[str] = Field(default_factory=list, description="Nombres de los documentos que sí se adjuntaron")


class ResultadoValidacionPertinencia(BaseModel):
    cumple_documental: bool
    cumple_clinica: bool
    documentos_faltantes: List[str] = Field(default_factory=list)
    motivo_bloqueo_clinico: Optional[str] = None
    bloqueado: bool
    detalle: str


def _conectar():
    return psycopg2.connect(DB_DSN)


def _obtener_metadata_tarifario(conn, codigo: str) -> Optional[dict]:
    """Trae categoria/hoja_fuente/tipo_registro del catalogo maestro
    para el codigo dado (toma la primera fila que coincida -- el
    codigo puede repetirse por nivel/rol, pero para este chequeo
    documental/clinico esos 3 campos deberian ser iguales entre filas
    del mismo codigo)."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT categoria, hoja_fuente, tipo_registro
               FROM tarifario_maestro WHERE codigo = %s LIMIT 1""",
            (codigo,),
        )
        return cur.fetchone()


def _validar_documental(conn, hoja_fuente: Optional[str], tipo_registro: Optional[str], documentos_adjuntos: List[str]) -> List[str]:
    """Devuelve la lista de documentos que FALTAN (vacia si cumple)."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT documento_requerido FROM reglas_documentales
               WHERE activo = TRUE AND obligatorio = TRUE
                 AND (
                    (tipo_agrupador = 'HOJA_FUENTE' AND valor_agrupador = %s)
                    OR (tipo_agrupador = 'TIPO_REGISTRO' AND valor_agrupador = %s)
                 )""",
            (hoja_fuente, tipo_registro),
        )
        requeridos = [fila["documento_requerido"] for fila in cur.fetchall()]

    adjuntos_normalizados = {d.strip().lower() for d in documentos_adjuntos}
    faltantes = [doc for doc in requeridos if doc.strip().lower() not in adjuntos_normalizados]
    return faltantes


def _validar_pertinencia_clinica(conn, codigo: str, categoria: Optional[str], hoja_fuente: Optional[str],
                                   tipo_registro: Optional[str], cie10: str) -> Optional[str]:
    """Devuelve el motivo de bloqueo si corresponde, o None si pasa."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # 1. Reglas BLOQUEANTE aplicables (cualquier nivel que coincida)
        cur.execute(
            """SELECT motivo_alerta FROM reglas_pertinencia_clinica
               WHERE activo = TRUE AND tipo_regla = 'BLOQUEANTE'
                 AND %s ~ cie10_patron
                 AND (
                    (nivel_aplicacion = 'CODIGO' AND valor_aplicacion = %s)
                    OR (nivel_aplicacion = 'CATEGORIA' AND valor_aplicacion = %s)
                    OR (nivel_aplicacion = 'HOJA_FUENTE' AND valor_aplicacion = %s)
                    OR (nivel_aplicacion = 'TIPO_REGISTRO' AND valor_aplicacion = %s)
                 )
               LIMIT 1""",
            (cie10, codigo, categoria, hoja_fuente, tipo_registro),
        )
        fila_bloqueante = cur.fetchone()
        if fila_bloqueante:
            return fila_bloqueante["motivo_alerta"]

        # 2. Reglas PERMITIDO: si EXISTEN reglas para este codigo/grupo,
        #    el CIE-10 debe coincidir con AL MENOS UNA. Si no existe
        #    ninguna regla PERMITIDO para este codigo/grupo, no hay
        #    restriccion (pasa libre).
        cur.execute(
            """SELECT motivo_alerta,
                      (%s ~ cie10_patron) AS coincide
               FROM reglas_pertinencia_clinica
               WHERE activo = TRUE AND tipo_regla = 'PERMITIDO'
                 AND (
                    (nivel_aplicacion = 'CODIGO' AND valor_aplicacion = %s)
                    OR (nivel_aplicacion = 'CATEGORIA' AND valor_aplicacion = %s)
                    OR (nivel_aplicacion = 'HOJA_FUENTE' AND valor_aplicacion = %s)
                    OR (nivel_aplicacion = 'TIPO_REGISTRO' AND valor_aplicacion = %s)
                 )""",
            (cie10, codigo, categoria, hoja_fuente, tipo_registro),
        )
        filas_permitido = cur.fetchall()
        if filas_permitido and not any(f["coincide"] for f in filas_permitido):
            return filas_permitido[0]["motivo_alerta"]

    return None


def validar_pertinencia(payload: PayloadValidacionPertinencia) -> ResultadoValidacionPertinencia:
    conn = _conectar()
    try:
        meta = _obtener_metadata_tarifario(conn, payload.codigo_tarifario)
        categoria = meta["categoria"] if meta else None
        hoja_fuente = meta["hoja_fuente"] if meta else None
        tipo_registro = meta["tipo_registro"] if meta else None

        faltantes = _validar_documental(conn, hoja_fuente, tipo_registro, payload.documentos_adjuntos)
        motivo_clinico = _validar_pertinencia_clinica(
            conn, payload.codigo_tarifario, categoria, hoja_fuente, tipo_registro, payload.cie_10_reportado
        )

        cumple_documental = len(faltantes) == 0
        cumple_clinica = motivo_clinico is None
        bloqueado = not cumple_documental or not cumple_clinica

        detalle_partes = []
        if not cumple_documental:
            detalle_partes.append(f"Faltan documentos: {', '.join(faltantes)}")
        if not cumple_clinica:
            detalle_partes.append(motivo_clinico)
        detalle = " | ".join(detalle_partes) if detalle_partes else "Cumple pertinencia documental y clínica."

        return ResultadoValidacionPertinencia(
            cumple_documental=cumple_documental,
            cumple_clinica=cumple_clinica,
            documentos_faltantes=faltantes,
            motivo_bloqueo_clinico=motivo_clinico,
            bloqueado=bloqueado,
            detalle=detalle,
        )
    finally:
        conn.close()
