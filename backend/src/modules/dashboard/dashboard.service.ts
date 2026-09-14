import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async obtenerResumenGlobal() {
    // 1. Conteo por nivel de riesgo (ultima prediccion vigente de cada detalle)
    const porRiesgo = await this.dataSource.query(`
      SELECT p.nivel_riesgo, COUNT(*) AS total
      FROM predicciones_riesgo p
      INNER JOIN (
        SELECT detalle_servicio_id, MAX(fecha_prediccion) AS max_fecha
        FROM predicciones_riesgo GROUP BY detalle_servicio_id
      ) ultima ON ultima.detalle_servicio_id = p.detalle_servicio_id AND ultima.max_fecha = p.fecha_prediccion
      GROUP BY p.nivel_riesgo
    `);

    // 2. Evaluadas vs sin evaluar (todas las lineas que existen)
    const totalLineas = await this.dataSource.query(`SELECT COUNT(*) AS total FROM detalles_servicios`);
    const lineasEvaluadas = await this.dataSource.query(`
      SELECT COUNT(DISTINCT detalle_servicio_id) AS total FROM predicciones_riesgo
    `);

    // 3. Auditadas vs pendientes (por estado_fila)
    const porEstado = await this.dataSource.query(`
      SELECT estado_fila, COUNT(*) AS total FROM detalles_servicios GROUP BY estado_fila
    `);

    // 4. Objetadas (decisiones de auditoria con RECHAZADO, incluye automaticas)
    const objetadas = await this.dataSource.query(`
      SELECT COUNT(*) AS total FROM decisiones_auditoria WHERE decision = 'RECHAZADO'
    `);

    // 5. Correcciones automaticas totales
    const correcciones = await this.dataSource.query(`
      SELECT COUNT(*) AS total FROM correcciones_automaticas
    `);

    // 6. Tendencia mensual (planillas procesadas por mes, ultimos 12 meses)
    const tendenciaMensual = await this.dataSource.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS mes, COUNT(*) AS total
      FROM planillas
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY 1 ORDER BY 1
    `);

    // 7. Planillas por estado
    const planillasPorEstado = await this.dataSource.query(`
      SELECT estado, COUNT(*) AS total FROM planillas GROUP BY estado
    `);

    return {
      porNivelRiesgo: this._normalizar(porRiesgo, 'nivel_riesgo', ['BAJO', 'MEDIO', 'ALTO', 'CRITICO']),
      lineas: {
        total: Number(totalLineas[0]?.total ?? 0),
        evaluadas: Number(lineasEvaluadas[0]?.total ?? 0),
      },
      porEstadoFila: this._normalizar(porEstado, 'estado_fila', ['PENDIENTE', 'AUDITADO', 'RECHAZADO', 'FACTURADO']),
      totalObjetadas: Number(objetadas[0]?.total ?? 0),
      totalCorrecciones: Number(correcciones[0]?.total ?? 0),
      tendenciaMensual: tendenciaMensual.map((f: any) => ({ mes: f.mes, total: Number(f.total) })),
      planillasPorEstado: this._normalizar(planillasPorEstado, 'estado', ['SUBIDA', 'PROCESANDO', 'COMPLETADA', 'ERROR']),
    };
  }

  private _normalizar(filas: any[], campoClave: string, todasLasClaves: string[]) {
    const mapa = new Map(filas.map((f) => [f[campoClave], Number(f.total)]));
    return todasLasClaves.map((clave) => ({ clave, total: mapa.get(clave) ?? 0 }));
  }
}
