import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrediccionesController } from './predicciones.controller';
import { PrediccionesService } from './predicciones.service';
import { PrediccionRiesgo } from './entities/prediccion-riesgo.entity';
import { CorreccionAutomatica } from './entities/correccion-automatica.entity';
import { DetalleServicio } from '../detalles/entities/detalle-servicio.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PrediccionRiesgo,
      CorreccionAutomatica,
      DetalleServicio,
    ]),
  ],
  controllers: [PrediccionesController],
  providers: [PrediccionesService],
  exports: [PrediccionesService],
})
export class PrediccionesModule {}
