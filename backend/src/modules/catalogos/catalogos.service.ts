import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class CatalogosService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listarVersiones() {
    return this.dataSource.query(
      `SELECT id, tipo_catalogo, nombre, version, estado, total_registros,
              vigencia_desde, vigencia_hasta, fecha_carga, observacion
       FROM catalogo_versiones
       ORDER BY tipo_catalogo, fecha_carga DESC`,
    );
  }

  /**
   * Activa una versión de catálogo -- y automáticamente pasa a HISTORICO
   * cualquier otra versión ACTIVA del mismo tipo (nunca puede haber 2
   * versiones activas del mismo catálogo al mismo tiempo).
   */
  async activarVersion(id: number): Promise<void> {
    const version = await this.dataSource.query(
      `SELECT id, tipo_catalogo FROM catalogo_versiones WHERE id = $1`,
      [id],
    );
    if (!version[0]) {
      throw new NotFoundException(`Versión de catálogo ${id} no encontrada`);
    }

    await this.dataSource.query(
      `UPDATE catalogo_versiones SET estado = 'HISTORICO'
       WHERE tipo_catalogo = $1 AND estado = 'ACTIVO' AND id != $2`,
      [version[0].tipo_catalogo, id],
    );

    await this.dataSource.query(
      `UPDATE catalogo_versiones SET estado = 'ACTIVO' WHERE id = $1`,
      [id],
    );
  }

  async desactivarVersion(id: number): Promise<void> {
    const resultado = await this.dataSource.query(
      `UPDATE catalogo_versiones SET estado = 'HISTORICO' WHERE id = $1 RETURNING id`,
      [id],
    );
    if (resultado.length === 0) {
      throw new NotFoundException(`Versión de catálogo ${id} no encontrada`);
    }
  }
}
