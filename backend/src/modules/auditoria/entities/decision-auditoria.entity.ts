import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { DetalleServicio } from '../../detalles/entities/detalle-servicio.entity';
import { User } from '../../users/entities/user.entity';
import { DecisionAuditoria } from '../../../common/enums';
import { MotivoObjecion } from '../../motivos-objecion/entities/motivo-objecion.entity';

// Nombre de clase con sufijo "Entity" para no colisionar con el enum DecisionAuditoria.
@Entity('decisiones_auditoria')
export class DecisionAuditoriaEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DetalleServicio, (d) => d.decisiones, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'detalle_servicio_id' })
  detalleServicio: DetalleServicio;

  // NULL cuando la decisión es automática (código no encontrado en catálogo).
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'auditor_id' })
  auditor: User | null;

  @Column({
    type: 'enum',
    enum: DecisionAuditoria,
    enumName: 'decision_auditoria_enum',
  })
  decision: DecisionAuditoria;

  @Column({ name: 'motivo_glosa', type: 'text', nullable: true })
  motivoGlosa: string | null;

  @CreateDateColumn({ name: 'fecha_decision', type: 'timestamp' })
  fechaDecision: Date;
  @ManyToOne(() => MotivoObjecion, { nullable: true })
  @JoinColumn({ name: 'motivo_objecion_id' })
  motivoObjecion: MotivoObjecion | null;

}
