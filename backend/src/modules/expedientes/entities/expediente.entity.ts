import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Tramite } from '../../tramites/entities/tramite.entity';
import { DetalleServicio } from '../../detalles/entities/detalle-servicio.entity';
import { PrediccionRiesgo } from '../../predicciones/entities/prediccion-riesgo.entity';

@Entity('expedientes')
export class Expediente {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tramite, (t) => t.expedientes, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'tramite_id' })
  tramite: Tramite;

  @Column({ name: 'nombre_paciente', type: 'varchar', length: 200 })
  nombrePaciente: string;

  @Column({ name: 'codigo_validacion', type: 'varchar', length: 50, nullable: true })
  codigoValidacion: string | null;

  // Cédula en texto plano: se necesita para mostrarla en reportes, pero
  // el acceso a este campo debe restringirse por rol a nivel de servicio.
  @Column({ type: 'varchar', length: 50 })
  identificacion: string;

  // SHA256 de la cédula, calculado en el servicio antes de insertar (ver 8. REQUISITOS NO FUNCIONALES).
  @Column({ name: 'identificacion_hash', type: 'varchar', length: 64 })
  identificacionHash: string;

  @Column({ name: 'cie10_codigo', type: 'varchar', length: 10 })
  cie10Codigo: string;

  @Column({
    name: 'honorario_servicio_institucional',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  honorarioServicioInstitucional: string | null;

  @OneToMany(() => DetalleServicio, (d) => d.expediente)
  detalles: DetalleServicio[];

  @OneToOne(() => PrediccionRiesgo, (pr) => pr.expediente)
  prediccionRiesgo: PrediccionRiesgo;
}
