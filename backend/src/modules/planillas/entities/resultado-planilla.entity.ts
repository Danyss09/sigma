import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Planilla } from './planilla.entity';
import { TipoResultado, FormatoArchivo } from '../../../common/enums';

// Un registro por CADA archivo generado (una corrida de "generar
// individuales" para un trámite produce típicamente 2 filas: una xlsx
// y una pdf). Así, /planillas/:id/resultados puede listar todo lo
// generado para esa planilla sin ambigüedad.
@Entity('resultados_planilla')
export class ResultadoPlanilla {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Planilla, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'planilla_id' })
  planilla: Planilla;

  @Column({
    type: 'enum',
    enum: TipoResultado,
    enumName: 'tipo_resultado_enum',
  })
  tipo: TipoResultado;

  // Nombre del servicio (= tramites.tipo_servicio), ej. "TRASPLANTE".
  @Column({ type: 'varchar', length: 100 })
  servicio: string;

  // Solo aplica a INDIVIDUAL (una consolidada agrupa varios trámites).
  @Column({ name: 'tramite', type: 'varchar', length: 50, nullable: true })
  tramite: string | null;

  // Ruta RELATIVA (ej. "uploads/individuales/TRASPLANTE/2/planilla.xlsx"),
  // nunca absoluta, para poder mover la carpeta uploads/ sin romper la BD.
  @Column({ name: 'ruta_archivo', type: 'text' })
  rutaArchivo: string;

  @Column({
    type: 'enum',
    enum: FormatoArchivo,
    enumName: 'formato_archivo_enum',
  })
  formato: FormatoArchivo;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 255 })
  nombreArchivo: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
