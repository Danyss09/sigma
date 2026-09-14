import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { DetalleServicio } from '../../detalles/entities/detalle-servicio.entity';
import { NivelRiesgo } from '../../../common/enums';

@Entity('predicciones_riesgo')
export class PrediccionRiesgo {
  @PrimaryGeneratedColumn()
  id: number;

  // Ligado a la LÍNEA (no al expediente completo) — el riesgo se evalúa
  // por código+valor específico, un mismo paciente puede tener una línea
  // normal y otra anómala en el mismo trámite.
  @ManyToOne(() => DetalleServicio, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'detalle_servicio_id' })
  detalleServicio: DetalleServicio;

  @Column({
    name: 'nivel_riesgo',
    type: 'enum',
    enum: NivelRiesgo,
    enumName: 'nivel_riesgo_enum',
  })
  nivelRiesgo: NivelRiesgo;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  puntaje: number;

  @Column({ name: 'explicacion_shap', type: 'jsonb', nullable: true })
  explicacionShap: Record<string, number> | null;

  @CreateDateColumn({ name: 'fecha_prediccion', type: 'timestamp' })
  fechaPrediccion: Date;
  
  @Column({ name: 'base_value', type: 'numeric', precision: 6, scale: 4, nullable: true })
  baseValue: number | null;
}
