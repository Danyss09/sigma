import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanillasController } from './planillas.controller';
import { PlantillasController } from './plantillas.controller';
import { PlanillasService } from './planillas.service';
import { ExportadorExcelService } from './services/exportador-excel.service';
import { ExportadorPdfService } from './services/exportador-pdf.service';
import { GestionPlantillasService } from './services/gestion-plantillas.service';
import { GeneradorIndividualesService } from './services/generador-individuales.service';
import { GeneradorConsolidadasService } from './services/generador-consolidadas.service';
import { Planilla } from './entities/planilla.entity';
import { ResultadoPlanilla } from './entities/resultado-planilla.entity';
import { MatchingModule } from '../matching/matching.module';
import { Plantilla } from './entities/plantilla.entity';
import { Tramite } from '../tramites/entities/tramite.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { DetalleServicio } from '../detalles/entities/detalle-servicio.entity';
import { Tarifa } from '../tarifas/entities/tarifa.entity';
import { MedicamentoInsumo } from '../medicamentos/entities/medicamento-insumo.entity';
import { DecisionAuditoriaEntity } from '../auditoria/entities/decision-auditoria.entity';
import { AuditLog } from '../audit-log/entities/audit-log.entity';
import { MinioModule } from '../minio/minio.module';
import { ExportadorLibreOfficeService } from './services/exportador-libreoffice.service';
import { ResponsablesService } from '../responsables/responsables.service';
import { ResponsablesModule } from '../responsables/responsables.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Planilla,
      Tramite,
      Expediente,
      DetalleServicio,
      Tarifa,
      MedicamentoInsumo,
      DecisionAuditoriaEntity,
      AuditLog,
      ResultadoPlanilla,
      Plantilla,
      
    ]),
  MatchingModule,
      MinioModule, 
      ResponsablesModule,
    
  ],
  
  controllers: [PlanillasController, PlantillasController],
  providers: [
    PlanillasService,
    ExportadorExcelService,
    ExportadorPdfService,
    GestionPlantillasService,
    GeneradorIndividualesService,
    GeneradorConsolidadasService,
    ExportadorLibreOfficeService,
  ],
  exports: [PlanillasService],
})
export class PlanillasModule {}
