import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TipoResponsable {
  DIRECTOR_ADMINISTRATIVO = 'DIRECTOR_ADMINISTRATIVO',
  REVISOR = 'REVISOR',
}

@Entity('responsables_firma')
export class ResponsableFirma {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30 })
  tipo: TipoResponsable;

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

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'nunca_usado', type: 'boolean', default: true })
  nuncaUsado: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
