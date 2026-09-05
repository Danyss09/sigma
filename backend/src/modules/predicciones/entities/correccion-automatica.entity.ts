import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { DetalleServicio } from '../../detalles/entities/detalle-servicio.entity';
import { PrediccionRiesgo } from './prediccion-riesgo.entity';
import { NivelRiesgo } from '../../../common/enums';


@Entity('correcciones_automaticas')
export class CorreccionAutomatica {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DetalleServicio, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'detalle_servicio_id' })
  detalleServicio: DetalleServicio;

  @ManyToOne(() => PrediccionRiesgo, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'prediccion_id' })
  prediccion: PrediccionRiesgo | null;

  @Column({ name: 'valor_anterior', type: 'numeric', precision: 12, scale: 2 })
  valorAnterior: number;

  @Column({ name: 'valor_corregido', type: 'numeric', precision: 12, scale: 2 })
  valorCorregido: number;

  @Column({
    name: 'nivel_riesgo',
    type: 'enum',
    enum: NivelRiesgo,
    enumName: 'nivel_riesgo_enum',
  })
  nivelRiesgo: NivelRiesgo;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  puntaje: number;

  @Column({ type: 'text' })
  motivo: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
