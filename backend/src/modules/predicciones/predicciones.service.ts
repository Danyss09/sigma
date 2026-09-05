import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { DetalleServicio } from '../detalles/entities/detalle-servicio.entity';
import { DecisionAuditoriaEntity } from '../auditoria/entities/decision-auditoria.entity';
import { PrediccionRiesgo } from './entities/prediccion-riesgo.entity';
import { CorreccionAutomatica } from './entities/correccion-automatica.entity';
import { RespuestaPrediccionML } from './dto/respuesta-prediccion-ml.interface';
import {
  EstadoFila,
  DecisionAuditoria,
  NivelRiesgo,
} from '../../common/enums';

const TOLERANCIA_VALOR = 0.01;

interface ResultadoEvaluacion {
  detalleId: number;
  evaluado: boolean;
  motivoNoEvaluado?: string;
  nivelRiesgo?: NivelRiesgo;
  puntaje?: number;
  corregido: boolean;
  valorAnterior?: number;
  valorCorregido?: number;
}

@Injectable()
export class PrediccionesService {
  private readonly logger = new Logger(PrediccionesService.name);
  private readonly fastapiUrl: string;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(PrediccionRiesgo)
    private readonly prediccionesRepository: Repository<PrediccionRiesgo>,

    @InjectRepository(CorreccionAutomatica)
    private readonly correccionesRepository: Repository<CorreccionAutomatica>,

    private readonly configService: ConfigService,
  ) {
    this.fastapiUrl =
      this.configService.get<string>('FASTAPI_URL') ??
      'http://127.0.0.1:8000';
  }

  /**
   * Evalúa todos los detalles pendientes de una planilla.
   */
  async evaluarPlanilla(
    planillaId: number,
  ): Promise<ResultadoEvaluacion[]> {
    const detalles = await this.dataSource
      .getRepository(DetalleServicio)
      .createQueryBuilder('detalle')
      .leftJoinAndSelect('detalle.expediente', 'expediente')
      .leftJoinAndSelect('expediente.tramite', 'tramite')
      .where('tramite.planilla = :planillaId', {
        planillaId,
      })
      .andWhere('detalle.estadoFila = :estado', {
        estado: EstadoFila.PENDIENTE,
      })
      .getMany();

    const resultados: ResultadoEvaluacion[] = [];

    for (const detalle of detalles) {
      try {
        resultados.push(
          await this.evaluarDetalle(
            detalle.id,
            planillaId,
          ),
        );
      } catch (error) {
        this.logger.error(
          `Error evaluando riesgo del detalle ${detalle.id}: ${
            (error as Error).message
          }`,
        );
      }
    }

    return resultados;
  }

  /**
   * Evalúa individualmente un detalle mediante el servicio ML.
   */
  async evaluarDetalle(
    detalleId: number,
    planillaIdConocido?: number,
  ): Promise<ResultadoEvaluacion> {
    const detalle = await this.dataSource
      .getRepository(DetalleServicio)
      .findOne({
        where: {
          id: detalleId,
        },
        relations: [
          'expediente',
          'expediente.tramite',
          'expediente.tramite.planilla',
        ],
      });

    if (!detalle) {
      throw new NotFoundException(
        `Detalle ${detalleId} no encontrado`,
      );
    }

    /**
     * Si no existe valor oficial de catálogo no se puede
     * construir correctamente la feature ratio_valor.
     */
    if (detalle.valorUnitarioOficial === null) {
      return {
        detalleId: detalle.id,
        evaluado: false,
        motivoNoEvaluado:
          'Código sin catálogo (AS-400) — no existe un valor oficial con el cual comparar el ' +
          'monto solicitado, así que no se puede calcular el riesgo. Requiere validación manual ' +
          'de un auditor con el catálogo real de insumos/medicamentos.',
        corregido: false,
      };
    }

    const planillaId =
      planillaIdConocido ??
      detalle.expediente.tramite.planilla?.id;

    if (planillaId === undefined) {
      return {
        detalleId: detalle.id,
        evaluado: false,
        motivoNoEvaluado:
          'Detalle sin planilla asociada; no se puede calcular la repetición del beneficiario.',
        corregido: false,
      };
    }

    const vecesRepetido =
      await this.contarRepeticionesBeneficiario(
        detalle,
        planillaId,
      );

    const ratioValor =
      Number(detalle.valorUnitarioSolicitado) /
      Number(detalle.valorUnitarioOficial);

    /**
     * Llamada al modelo RandomForest/FastAPI.
     */
    const { data } =
      await axios.post<RespuestaPrediccionML>(
        `${this.fastapiUrl}/predecir-riesgo`,
        {
          ratio_valor: ratioValor,
          cantidad: Number(detalle.cantidad),
          veces_repetido_beneficiario:
            vecesRepetido,
        },
      );

    const nivelRiesgo =
      data.label as NivelRiesgo;

    /**
     * Guarda la predicción y los valores SHAP.
     */
    const prediccion =
      this.prediccionesRepository.create({
        detalleServicio: detalle,
        nivelRiesgo,
        puntaje: round2(data.score * 100),
        explicacionShap: data.shap_values,
      });

    await this.prediccionesRepository.save(
      prediccion,
    );

    const esAltoRiesgo =
      nivelRiesgo === NivelRiesgo.ALTO ||
      nivelRiesgo === NivelRiesgo.CRITICO;

    const diferencia = Math.abs(
      Number(detalle.valorUnitarioOficial) -
        Number(
          detalle.valorUnitarioSolicitado,
        ),
    );

    const noCoincideConCatalogo =
      diferencia > TOLERANCIA_VALOR;

    /**
     * Mantiene el comportamiento existente:
     * si hay riesgo alto/crítico y diferencia objetiva
     * con el catálogo, realiza la corrección.
     */
    if (
      esAltoRiesgo &&
      noCoincideConCatalogo
    ) {
      const resultado =
        await this.corregirAutomaticamente(
          detalle,
          prediccion,
        );

      return {
        detalleId: detalle.id,
        evaluado: true,
        nivelRiesgo,
        puntaje: prediccion.puntaje,
        corregido: true,
        valorAnterior:
          resultado.valorAnterior,
        valorCorregido:
          resultado.valorCorregido,
      };
    }

    return {
      detalleId: detalle.id,
      evaluado: true,
      nivelRiesgo,
      puntaje: prediccion.puntaje,
      corregido: false,
    };
  }

  /**
   * Sugiere motivos de objeción compatibles según la CAUSA del riesgo.
   *
   * Es una regla determinística.
   *
   * IMPORTANTE:
   * - RandomForest NO decide el motivo.
   * - SHAP únicamente ayuda a determinar cuál feature influyó.
   * - La sugerencia nunca se selecciona automáticamente.
   * - La decisión final siempre pertenece al auditor.
   */
  private async sugerirGrupoMotivo(
    validacionCatalogo: string | null,
    motivoNoEvaluado: string | null,
    shapValues: Record<
      string,
      number
    > | null,
  ): Promise<string | null> {
    /**
     * 1. Código sin catálogo o problema de matching.
     *
     * Solo debemos enviar motivoNoEvaluado aquí cuando
     * realmente exista un problema de catálogo.
     *
     * No debe utilizarse simplemente porque todavía
     * no se ha ejecutado RandomForest.
     */
    if (motivoNoEvaluado) {
      return 'REVISION_DOCUMENTAL';
    }

    /**
     * 2. Diferencia objetiva respecto al catálogo.
     *
     * Soportamos tanto INCONSISTENTE (especificación)
     * como DIFERENCIA (estado actual del servicio).
     */
    if (
      validacionCatalogo ===
        'INCONSISTENTE' ||
      validacionCatalogo === 'DIFERENCIA'
    ) {
      return 'CONTROL_TARIFAS';
    }

    /**
     * 3. Revisamos qué feature SHAP tuvo mayor
     * impacto absoluto.
     */
    if (shapValues) {
      const featurePrincipal =
        Object.entries(shapValues).sort(
          (a, b) =>
            Math.abs(b[1]) -
            Math.abs(a[1]),
        )[0];

      /**
       * Solo nos interesa si la contribución
       * aumentó el riesgo (> 0).
       */
      if (
        featurePrincipal &&
        featurePrincipal[1] > 0 &&
        (featurePrincipal[0] ===
          'cantidad' ||
          featurePrincipal[0] ===
            'veces_repetido_beneficiario')
      ) {
        return 'PERTINENCIA_MEDICA';
      }
    }

    return null;
  }

  /**
   * Obtiene hasta 5 motivos compatibles
   * con el grupo sugerido.
   *
   * No incluye códigos en estado
   * REQUIERE_VALIDACION.
   */
  private async obtenerMotivosSugeridos(
    grupo: string | null,
  ): Promise<any[]> {
    if (!grupo) {
      return [];
    }

    return this.dataSource.query(
      `
      SELECT
        id,
        grupo,
        codigo_original,
        codigo_canonico,
        descripcion
      FROM motivos_objecion
      WHERE grupo = $1
        AND estado_validacion != 'REQUIERE_VALIDACION'
        AND codigo_original NOT IN ('0', 'SIN OBJECIÓN')
        AND codigo_original ~ '^(CMT|LQD|REV)'
      ORDER BY codigo_original
      LIMIT 5
      `,
      [grupo],
    );
  }

  /**
   * Corrección automática existente.
   */
  private async corregirAutomaticamente(
    detalle: DetalleServicio,
    prediccion: PrediccionRiesgo,
  ): Promise<{
    valorAnterior: number;
    valorCorregido: number;
  }> {
    const queryRunner =
      this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const valorAnterior = Number(
        detalle.valorSolicitado,
      );

      const valorOficial = Number(
        detalle.valorUnitarioOficial,
      );

      const cantidad = Number(
        detalle.cantidad,
      );

      const porcentajeModificador = Number(
        detalle.porcentajeModificador,
      );

         const nuevoSubtotal = round2(
        cantidad * valorOficial,
      );

      const nuevoValorSolicitado =
        round2(
          nuevoSubtotal *
            porcentajeModificador,
        );

      detalle.valorUnitarioSolicitado = valorOficial;
      detalle.subtotal = nuevoSubtotal;
      detalle.valorSolicitado =
        nuevoValorSolicitado;
      detalle.estadoFila =
        EstadoFila.AUDITADO;


      await queryRunner.manager.save(
        DetalleServicio,
        detalle,
      );

      const correccion =
        queryRunner.manager.create(
          CorreccionAutomatica,
          {
            detalleServicio: detalle,
            prediccion,
            valorAnterior,
            valorCorregido:
              nuevoValorSolicitado,
            nivelRiesgo:
              prediccion.nivelRiesgo,
            puntaje: prediccion.puntaje,
            motivo:
              `Corrección automática por IA: riesgo ${prediccion.nivelRiesgo} (${prediccion.puntaje}%). ` +
              `Valor solicitado ($${valorAnterior.toFixed(
                2,
              )}) no coincidía con el oficial de catálogo ` +
              `($${valorOficial.toFixed(
                2,
              )}/unidad) — corregido a $${nuevoValorSolicitado.toFixed(
                2,
              )}. ` +
              `Fuente: catálogo TPSNS oficial. Tipo: automática.`,
          },
        );

      await queryRunner.manager.save(
        CorreccionAutomatica,
        correccion,
      );

      const decisionAutomatica =
        queryRunner.manager.create(
          DecisionAuditoriaEntity,
          {
            detalleServicio: detalle,
            auditor: null,
            decision:
              DecisionAuditoria.APROBADO,
            motivoGlosa:
              correccion.motivo,
          },
        );

      await queryRunner.manager.save(
        DecisionAuditoriaEntity,
        decisionAutomatica,
      );

      await queryRunner.commitTransaction();

      this.logger.warn(
        `Detalle ${detalle.id} corregido automáticamente: ` +
          `$${valorAnterior} -> $${nuevoValorSolicitado} ` +
          `(riesgo ${prediccion.nivelRiesgo} ${prediccion.puntaje}%)`,
      );

      return {
        valorAnterior,
        valorCorregido:
          nuevoValorSolicitado,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cuenta cuántas veces se repite el mismo código
   * para el mismo beneficiario dentro de LA PLANILLA.
   *
   * Importante:
   * ya no cuenta globalmente contra toda la historia.
   */
  private async contarRepeticionesBeneficiario(
    detalle: DetalleServicio,
    planillaId: number,
  ): Promise<number> {
    return this.dataSource
      .getRepository(DetalleServicio)
      .createQueryBuilder('d')
      .innerJoin(
        'd.expediente',
        'e',
      )
      .innerJoin(
        'e.tramite',
        't',
      )
      .where(
        'e.identificacion = :identificacion',
        {
          identificacion:
            detalle.expediente
              .identificacion,
        },
      )
      .andWhere(
        'd.codigoOriginal = :codigo',
        {
          codigo:
            detalle.codigoOriginal,
        },
      )
      .andWhere(
        't.planilla = :planillaId',
        {
          planillaId,
        },
      )
      .getCount();
  }

  /**
   * Lista correcciones de una planilla.
   */
  async listarCorreccionesDePlanilla(
    planillaId: number,
  ): Promise<
    CorreccionAutomatica[]
  > {
    return this.correccionesRepository
      .createQueryBuilder(
        'correccion',
      )
      .leftJoinAndSelect(
        'correccion.detalleServicio',
        'detalle',
      )
      .leftJoinAndSelect(
        'detalle.expediente',
        'expediente',
      )
      .leftJoinAndSelect(
        'expediente.tramite',
        'tramite',
      )
      .where(
        'tramite.planilla = :planillaId',
        {
          planillaId,
        },
      )
      .orderBy(
        'correccion.createdAt',
        'DESC',
      )
      .getMany();
  }

  /**
   * Lista todas las correcciones.
   */
  async listarTodasLasCorrecciones(
    busqueda?: string,
  ) {
    const qb =
      this.correccionesRepository
        .createQueryBuilder(
          'correccion',
        )
        .leftJoinAndSelect(
          'correccion.detalleServicio',
          'detalle',
        )
        .leftJoinAndSelect(
          'detalle.expediente',
          'expediente',
        )
        .leftJoinAndSelect(
          'expediente.tramite',
          'tramite',
        )
        .leftJoinAndSelect(
          'tramite.planilla',
          'planilla',
        )
        .orderBy(
          'correccion.createdAt',
          'DESC',
        );

    if (busqueda) {
      qb.andWhere(
        `
        (
          detalle.codigoOriginal ILIKE :q
          OR detalle.descripcion ILIKE :q
          OR CAST(planilla.id AS TEXT) ILIKE :q
        )
        `,
        {
          q: `%${busqueda}%`,
        },
      );
    }

    return qb.getMany();
  }

  /**
   * Construye la vista completa de riesgo
   * que consume el frontend.
   *
   * Aquí se integra:
   *
   * - validación objetiva de catálogo
   * - predicción RandomForest
   * - SHAP
   * - sugerencias CMT/LQD/REV
   * - correcciones
   */
  async obtenerVistaRiesgo(
    planillaId: number,
  ) {
    const detalles =
      await this.dataSource
        .getRepository(DetalleServicio)
        .createQueryBuilder('detalle')
        .leftJoinAndSelect(
          'detalle.expediente',
          'expediente',
        )
        .leftJoinAndSelect(
          'expediente.tramite',
          'tramite',
        )
        .where(
          'tramite.planilla = :planillaId',
          {
            planillaId,
          },
        )
        .orderBy(
          'detalle.id',
          'ASC',
        )
        .getMany();

    const resultado = [];

    for (const detalle of detalles) {
      /**
       * Última predicción disponible.
       */
      const prediccion =
        await this.prediccionesRepository.findOne(
          {
            where: {
              detalleServicio: {
                id: detalle.id,
              },
            },
            order: {
              fechaPrediccion: 'DESC',
            },
          },
        );

      /**
       * Última corrección disponible.
       */
      const correccion =
        prediccion
          ? await this.correccionesRepository.findOne(
              {
                where: {
                  detalleServicio: {
                    id: detalle.id,
                  },
                },
                order: {
                  createdAt: 'DESC',
                },
              },
            )
          : null;

      /**
       * Valor oficial normalizado.
       */
      const valorOficial =
        detalle.valorUnitarioOficial !==
        null
          ? Number(
              detalle.valorUnitarioOficial,
            )
          : null;

      const tieneCatalogo =
        valorOficial !== null;

      /**
       * Validación objetiva de catálogo.
       */
      let validacionCatalogo:
        | 'CORRECTA'
        | 'DIFERENCIA'
        | 'SIN_CATALOGO';

      let diferencia:
        | number
        | null = null;

      if (!tieneCatalogo) {
        validacionCatalogo =
          'SIN_CATALOGO';
      } else {
        /**
         * Si hubo corrección automática usamos el
         * valor anterior para mostrar cuál fue la
         * inconsistencia original.
         */
        const valorComparar =
          correccion
            ? Number(
                correccion.valorAnterior,
              )
            : Number(
                detalle
                  .valorUnitarioSolicitado,
              );

        diferencia = Math.abs(
          valorOficial -
            valorComparar,
        );

        validacionCatalogo =
          diferencia >
          TOLERANCIA_VALOR
            ? 'DIFERENCIA'
            : 'CORRECTA';
      }

      /**
       * Motivo por el cual el detalle todavía
       * no fue evaluado.
       */
      let motivoNoEvaluado:
        | string
        | null = null;

      if (!tieneCatalogo) {
        motivoNoEvaluado =
          'Código sin catálogo (AS-400) — no hay valor oficial con el cual calcular el riesgo. Requiere validación manual.';
      } else if (!prediccion) {
        motivoNoEvaluado =
          'Aún no evaluado — ejecuta "Ejecutar revisión de riesgo (IA)".';
      }

      /**
       * IMPORTANTE:
       *
       * No enviamos cualquier motivoNoEvaluado
       * a sugerirGrupoMotivo().
       *
       * Si simplemente todavía no se ejecutó
       * RandomForest, NO corresponde sugerir
       * revisión documental.
       *
       * Solo se usa cuando realmente falta
       * catálogo.
       */
      const motivoCatalogoParaSugerencia =
        !tieneCatalogo
          ? motivoNoEvaluado
          : null;

      /**
       * Determina el grupo compatible:
       *
       * REVISION_DOCUMENTAL
       * CONTROL_TARIFAS
       * PERTINENCIA_MEDICA
       *
       * Esto NO selecciona ningún motivo.
       */
      const grupoSugerido =
        await this.sugerirGrupoMotivo(
          valorOficial === null
            ? null
            : diferencia !== null &&
                diferencia <=
                  TOLERANCIA_VALOR
              ? 'CORRECTA'
              : 'INCONSISTENTE',

          motivoCatalogoParaSugerencia,

          (prediccion?.explicacionShap as Record<
            string,
            number
          > | null) ?? null,
        );

      /**
       * Obtiene hasta 5 motivos compatibles
       * del catálogo CMT/LQD/REV.
       */
      const motivosSugeridos =
        await this.obtenerMotivosSugeridos(
          grupoSugerido,
        );

      /**
       * Construcción final de respuesta.
       */
      resultado.push({
        detalleId: detalle.id,

        codigo:
          detalle.codigoOriginal,

        descripcion:
          detalle.descripcion,

        cantidad: Number(
          detalle.cantidad,
        ),

        valorSolicitado: Number(
          detalle.valorSolicitado,
        ),

        valorOficial,

        validacionCatalogo,

        evaluado: !!prediccion,

        motivoNoEvaluado,

        nivelRiesgo:
          prediccion?.nivelRiesgo ??
          null,

        puntaje:
          prediccion?.puntaje !==
            undefined &&
          prediccion?.puntaje !== null
            ? Number(
                prediccion.puntaje,
              )
            : null,

        shapValues:
          prediccion
            ?.explicacionShap ?? null,

        /**
         * NUEVO:
         * sugerencias determinísticas.
         */
        motivosSugeridos,

        corregido: !!correccion,

        valorAnteriorCorreccion:
          correccion?.valorAnterior !==
            undefined &&
          correccion?.valorAnterior !==
            null
            ? Number(
                correccion.valorAnterior,
              )
            : null,

        motivoCorreccion:
          correccion?.motivo ?? null,

        tramite:
          detalle.expediente
            .tramite.numeroTramite,

        servicio:
          detalle.expediente
            .tramite.tipoServicio,

        estadoFila:
          detalle.estadoFila,
      });
    }

    return resultado;
  }
}

/**
 * Redondeo monetario a 2 decimales.
 */
function round2(
  valor: number,
): number {
  return (
    Math.round(
      (valor + Number.EPSILON) *
        100,
    ) / 100
  );
}