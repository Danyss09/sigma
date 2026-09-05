import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Planilla } from '../../planillas/entities/planilla.entity';
import { ResponsableFirma } from './responsable-firma.entity';

@Entity('planilla_responsables_snapshot')
export class PlanillaResponsableSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Planilla, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planilla_id' })
  planilla: Planilla;

  @Column({ type: 'varchar', length: 30 })
  tipo: string;

  @Column({ name: 'nombre_completo', type: 'varchar', length: 200 })
  nombreCompleto: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  identificacion: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  cargo: string | null;

  @Column({ name: 'firma_path', type: 'varchar', length: 300, nullable: true })
  firmaPath: string | null;

  @Column({ type: 'int', nullable: true })
  orden: number | null;

  @ManyToOne(() => ResponsableFirma, { nullable: true })
  @JoinColumn({ name: 'responsable_origen_id' })
  responsableOrigen: ResponsableFirma | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
