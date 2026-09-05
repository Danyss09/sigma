import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tramite } from '../../tramites/entities/tramite.entity';
import { Factura } from '../../facturas/entities/factura.entity';
import { PlanillaEstado } from '../../../common/enums';

@Entity('planillas')
export class Planilla {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 255 })
  nombreArchivo: string;

  @Column({ name: 'minio_path', type: 'text' })
  minioPath: string;

  @Column({ name: 'hash_sha256', type: 'varchar', length: 64, unique: true })
  hashSha256: string;

  @Column({ type: 'varchar', length: 150 })
  hospital: string;

  @Column({ type: 'varchar', length: 20 })
  periodo: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'subido_por' })
  subidoPor: User;

  @Column({
    type: 'enum',
    enum: PlanillaEstado,
    enumName: 'planilla_estado_enum',
    default: PlanillaEstado.SUBIDA,
  })
  estado: PlanillaEstado;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // --- Firma de revisión ---
  @Column({ name: 'revisado_nombre', type: 'varchar', length: 200, nullable: true })
  revisadoNombre: string | null;

  @Column({ name: 'revisado_identificacion', type: 'varchar', length: 50, nullable: true })
  revisadoIdentificacion: string | null;

  @Column({
    name: 'revisado_cargo',
    type: 'varchar',
    length: 100,
    default: 'ANALISTA - FACTURACIÓN',
  })
  revisadoCargo: string;

  @Column({ name: 'revisado_sello', type: 'boolean', default: false })
  revisadoSello: boolean;

  // --- Firma de aprobación ---
  @Column({ name: 'aprobado_nombre', type: 'varchar', length: 200, nullable: true })
  aprobadoNombre: string | null;

  @Column({ name: 'aprobado_identificacion', type: 'varchar', length: 50, nullable: true })
  aprobadoIdentificacion: string | null;

  @Column({
    name: 'aprobado_cargo',
    type: 'varchar',
    length: 100,
    default: 'DIRECTOR ADMINISTRATIVO',
  })
  aprobadoCargo: string;

  @Column({ name: 'aprobado_sello', type: 'boolean', default: false })
  aprobadoSello: boolean;

  @Column({ name: 'fecha_emision_reporte', type: 'date', nullable: true })
  fechaEmisionReporte: string | null;

  @OneToMany(() => Tramite, (t) => t.planilla)
  tramites: Tramite[];

  @OneToMany(() => Factura, (f) => f.planilla)
  facturas: Factura[];
}
