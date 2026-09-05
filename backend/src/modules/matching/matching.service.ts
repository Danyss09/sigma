import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import { DataSource, QueryRunner } from 'typeorm';
import { normalizarCodigoAS400 } from './normalizar-as400';

export type TipoCoincidencia = 'EXACTA' | 'NORMALIZADA_UNICA' | 'AMBIGUA' | 'NO_ENCONTRADO';

export interface ResultadoMatch {
  encontrado: boolean;
  tipoCoincidencia: TipoCoincidencia;
  codigoEncontrado: string | null;
  descripcion: string | null;
  valorOficial: number | null;
  fuente: 'TARIFARIO' | 'MEDICAMENTOS' | 'TARIFAS_LEGACY' | 'MEDICAMENTOS_LEGACY' | null;
  versionId: number | null;
  confianza: 'ALTA' | 'MEDIA' | 'BAJA' | null;
}

const SIN_MATCH: ResultadoMatch = {
  encontrado: false,
  tipoCoincidencia: 'NO_ENCONTRADO',
  codigoEncontrado: null,
  descripcion: null,
  valorOficial: null,
  fuente: null,
  versionId: null,
  confianza: null,
};

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) { }

  /**
   * Busca un codigo de procedimiento/servicio (TPSNS) contra el
   * catalogo ACTIVO (tarifario_maestro) si existe una version activa;
   * si no, cae de vuelta a la tabla legacy `tarifas` que ya funciona
   * hoy en produccion. Esto permite tener la infraestructura nueva
   * lista sin romper el procesamiento actual mientras Facturacion no
   * active un catalogo nuevo.
   */
  async buscarProcedimiento(codigo: string, nivel: string, rolProfesional?: string): Promise<ResultadoMatch> {
    const versionActiva = await this.obtenerVersionActiva('TARIFARIO');

    if (versionActiva) {
      const qb = this.dataSource
        .createQueryBuilder()
        .select('*')
        .from('tarifario_maestro', 't')
        .where('t.version_id = :versionId', { versionId: versionActiva })
        .andWhere('t.codigo = :codigo', { codigo })
        .andWhere('t.nivel_atencion = :nivel', { nivel });

      if (rolProfesional) {
        qb.andWhere('t.rol_profesional = :rol', { rol: rolProfesional });
      } else {
        qb.andWhere('t.rol_profesional IS NULL');
      }

      const fila = await qb.getRawOne();
      if (fila) {
        return {
          encontrado: true,
          tipoCoincidencia: 'EXACTA',
          codigoEncontrado: fila.codigo,
          descripcion: fila.descripcion,
          valorOficial: Number(fila.valor_aplicable_usd),
          fuente: 'TARIFARIO',
          versionId: versionActiva,
          confianza: 'ALTA',
        };
      }
      return { ...SIN_MATCH, fuente: 'TARIFARIO' };
    }

    // --- Fallback legacy: tabla `tarifas` (la que ya funciona hoy) ---
    const legacy = await this.dataSource
      .createQueryBuilder()
      .select('*')
      .from('tarifas', 'tf')
      .where('tf.codigo_tpsns = :codigo', { codigo })
      .andWhere('tf.nivel = :nivel', { nivel })
      .getRawOne();

    if (legacy) {
      return {
        encontrado: true,
        tipoCoincidencia: 'EXACTA',
        codigoEncontrado: legacy.codigo_tpsns,
        descripcion: legacy.descripcion,
        valorOficial: Number(legacy.valor_oficial),
        fuente: 'TARIFAS_LEGACY',
        versionId: null,
        confianza: 'ALTA',
      };
    }

    return { ...SIN_MATCH, fuente: 'TARIFAS_LEGACY' };
  }

  /**
   * Busca un medicamento/insumo por codigo AS400. Orden de intento
   * (nunca inventa, nunca usa fuzzy matching para autocompletar):
   *   1. Coincidencia EXACTA contra el codigo tal cual viene.
   *   2. Si no hay exacta y el codigo tiene 13 digitos terminados en
   *      "001", se normaliza a 10 digitos y se busca ESE — si hay
   *      exactamente UNA coincidencia -> NORMALIZADA_UNICA (se puede
   *      autocompletar). Si hay MAS DE UNA con descripciones
   *      incompatibles -> AMBIGUA (nunca autocompleta, va a auditoria).
   *   3. Si nada de lo anterior -> NO_ENCONTRADO.
   */
  async buscarMedicamento(codigoOriginal: string): Promise<ResultadoMatch> {
    const versionActiva = await this.obtenerVersionActiva('MEDICAMENTOS');
    const tabla = versionActiva ? 'medicamentos_insumos' : 'medicamentos_insumos';
    // (misma tabla fisica en ambos casos -- la diferencia es que con
    // version activa filtramos por version_id, sin ella usamos el
    // universo legacy completo con codigo_as400 tal cual)

    // --- 1. Coincidencia EXACTA ---
    const exacta = await this.buscarPorCodigoAS400Exacto(codigoOriginal, versionActiva);
    if (exacta) return exacta;

    // --- 2. Normalizacion 13->10 ---
    const base = normalizarCodigoAS400(codigoOriginal);
    if (!base) {
      return { ...SIN_MATCH, fuente: versionActiva ? 'MEDICAMENTOS' : 'MEDICAMENTOS_LEGACY' };
    }

    const qbCandidatos = this.dataSource
      .createQueryBuilder()
      .select('*')
      .from('medicamentos_insumos', 'm')
      .where('(m.codigo_as400_normalizado = :base OR m.codigo_as400 = :base)', { base });

    if (versionActiva) {
      qbCandidatos.andWhere('m.version_id = :versionId', { versionId: versionActiva });
    } else {
      qbCandidatos.andWhere('m.version_id IS NULL');
    }

    const candidatos = await qbCandidatos.getRawMany();

    if (candidatos.length === 0) {
      return { ...SIN_MATCH, fuente: versionActiva ? 'MEDICAMENTOS' : 'MEDICAMENTOS_LEGACY' };
    }

    if (candidatos.length === 1) {
      const c = candidatos[0];
      return {
        encontrado: true,
        tipoCoincidencia: 'NORMALIZADA_UNICA',
        codigoEncontrado: c.codigo_as400,
        descripcion: c.descripcion,
        valorOficial: c.precio_oficial !== null ? Number(c.precio_oficial) : null,
        fuente: versionActiva ? 'MEDICAMENTOS' : 'MEDICAMENTOS_LEGACY',
        versionId: versionActiva,
        confianza: 'MEDIA',
      };
    }

    // Mas de un candidato con el mismo codigo base -- verificar si las
    // descripciones son compatibles (mismo producto) o no.
    const descripciones = new Set(candidatos.map((c) => (c.descripcion ?? '').trim().toUpperCase()));
    if (descripciones.size === 1) {
      // Mismo producto, varias filas historicas -- se puede tomar la
      // primera como representativa, sigue siendo NORMALIZADA_UNICA.
      const c = candidatos[0];
      return {
        encontrado: true,
        tipoCoincidencia: 'NORMALIZADA_UNICA',
        codigoEncontrado: c.codigo_as400,
        descripcion: c.descripcion,
        valorOficial: c.precio_oficial !== null ? Number(c.precio_oficial) : null,
        fuente: versionActiva ? 'MEDICAMENTOS' : 'MEDICAMENTOS_LEGACY',
        versionId: versionActiva,
        confianza: 'MEDIA',
      };
    }

    // Descripciones incompatibles -> AMBIGUA, nunca autocompletar.
    this.logger.warn(
      `Código ${codigoOriginal} (base ${base}) es AMBIGUO: ${candidatos.length} candidatos con descripciones distintas. Requiere auditoría manual.`,
    );
    return {
      encontrado: false,
      tipoCoincidencia: 'AMBIGUA',
      codigoEncontrado: null,
      descripcion: null,
      valorOficial: null,
      fuente: versionActiva ? 'MEDICAMENTOS' : 'MEDICAMENTOS_LEGACY',
      versionId: versionActiva,
      confianza: 'BAJA',
    };
  }

  private async buscarPorCodigoAS400Exacto(
    codigo: string,
    versionActiva: number | null,
  ): Promise<ResultadoMatch | null> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('*')
      .from('medicamentos_insumos', 'm')
      .where('m.codigo_as400 = :codigo', { codigo });

    // FIX: antes no filtraba por version_id -- buscaba en TODA la tabla
    // sin importar si el catálogo estaba ACTIVO o no, usando sin querer
    // datos BORRADOR de Fase 1 (aún no revisados por Facturación) como
    // si fueran legacy aprobado. Ahora: sin versión activa, solo mira
    // filas legacy verdaderas (version_id NULL); con versión activa,
    // solo mira esa versión específica.
    if (versionActiva) {
      qb.andWhere('m.version_id = :versionId', { versionId: versionActiva });
    } else {
      qb.andWhere('m.version_id IS NULL');
    }

    const fila = await qb.getRawOne();
    if (!fila) return null;

    return {
      encontrado: true,
      tipoCoincidencia: 'EXACTA',
      codigoEncontrado: fila.codigo_as400,
      descripcion: fila.descripcion,
      valorOficial: fila.precio_oficial !== null ? Number(fila.precio_oficial) : null,
      fuente: versionActiva ? 'MEDICAMENTOS' : 'MEDICAMENTOS_LEGACY',
      versionId: versionActiva,
      confianza: 'ALTA',
    };
  }

  private async obtenerVersionActiva(tipoCatalogo: string): Promise<number | null> {
    const fila = await this.dataSource
      .createQueryBuilder()
      .select('id')
      .from('catalogo_versiones', 'cv')
      .where('cv.tipo_catalogo = :tipo', { tipo: tipoCatalogo })
      .andWhere("cv.estado = 'ACTIVO'")
      .getRawOne();
    return fila ? fila.id : null;
  }

  /**
   * Registra el resultado de la busqueda en detalle_match_catalogo
   * (seccion 13 de la especificacion) -- trazabilidad de que se buscó,
   * qué se encontró, con qué confianza.
   */
  /**
   * Rastro auditable POR CAMPO (sección 14 de la especificación): qué
   * campo cambió, de qué valor a qué valor, con qué fuente/versión.
   * Solo se llama cuando REALMENTE se completó algo que faltaba (nunca
   * cuando el dato ya venía en la MATRIZ).
   */
  async registrarAutocompletado(
    queryRunner: QueryRunner,
    detalleServicioId: number,
    campo: string,
    valorOriginal: string | null,
    valorNuevo: string | null,
    resultado: ResultadoMatch,
  ): Promise<void> {
    await queryRunner.query(
      `INSERT INTO autocompletados_campos
       (detalle_servicio_id, campo, valor_original, valor_nuevo, fuente, version_fuente, tipo_match, origen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'SISTEMA')`,
      [
        detalleServicioId,
        campo,
        valorOriginal,
        valorNuevo,
        resultado.fuente,
        resultado.versionId,
        resultado.tipoCoincidencia,
      ],
    );
  }

  async registrarMatch(
    queryRunner: QueryRunner,
    detalleServicioId: number,
    codigoRecibido: string,
    resultado: ResultadoMatch,
  ): Promise<void> {
    await queryRunner.query(
      `INSERT INTO detalle_match_catalogo
       (detalle_servicio_id, codigo_recibido, codigo_encontrado, tipo_coincidencia, fuente, version_id, confianza)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        detalleServicioId,
        codigoRecibido,
        resultado.codigoEncontrado,
        resultado.tipoCoincidencia,
        resultado.fuente,
        resultado.versionId,
        resultado.confianza,
      ],
    );
  }

}
