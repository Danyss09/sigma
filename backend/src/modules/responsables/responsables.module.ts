import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponsablesController } from './responsables.controller';
import { ResponsablesService } from './responsables.service';
import { ResponsableFirma } from './entities/responsable-firma.entity';
import { PlanillaResponsableSnapshot } from './entities/planilla-responsable-snapshot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ResponsableFirma, PlanillaResponsableSnapshot])],
  controllers: [ResponsablesController],
  providers: [ResponsablesService],
  exports: [ResponsablesService],
})
export class ResponsablesModule {}
