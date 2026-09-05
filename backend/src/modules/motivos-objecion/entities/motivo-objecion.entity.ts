import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('motivos_objecion')
export class MotivoObjecion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'version_id', type: 'int', nullable: true })
  versionId: number | null;

  @Column({ type: 'varchar', length: 30 })
  grupo: string;

  @Column({ name: 'codigo_original', type: 'varchar', length: 20 })
  codigoOriginal: string;

  @Column({ name: 'codigo_canonico', type: 'varchar', length: 20 })
  codigoCanonico: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'respaldo_normativo', type: 'varchar', length: 200, nullable: true })
  respaldoNormativo: string | null;

  @Column({ name: 'estado_validacion', type: 'varchar', length: 40, nullable: true })
  estadoValidacion: string | null;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;
}
