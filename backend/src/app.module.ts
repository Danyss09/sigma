import { Module, Controller, Get } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PlanillasModule } from './modules/planillas/planillas.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { Plantilla } from './modules/planillas/entities/plantilla.entity';

import { ResultadoPlanilla } from './modules/planillas/entities/resultado-planilla.entity';
// Se listan TODAS las entidades explícitamente (en vez de confiar solo en
// autoLoadEntities). Motivo: autoLoadEntities únicamente registra las
// entidades que aparecen en algún TypeOrmModule.forFeature([...]) de un
// módulo importado. PrediccionRiesgo y Factura todavía no tienen su propio
// módulo (los construimos en un paso posterior), pero Expediente y
// Planilla ya tienen relaciones (@OneToOne / futuras) hacia ellas, y
// TypeORM necesita conocer TODAS las entidades relacionadas al construir
// los metadatos, o falla con "Entity metadata for X was not found".
import { User } from './modules/users/entities/user.entity';
import { UserSession } from './modules/auth/entities/user-session.entity';
import { Tarifa } from './modules/tarifas/entities/tarifa.entity';
import { MedicamentoInsumo } from './modules/medicamentos/entities/medicamento-insumo.entity';
import { Planilla } from './modules/planillas/entities/planilla.entity';
import { Tramite } from './modules/tramites/entities/tramite.entity';
import { Expediente } from './modules/expedientes/entities/expediente.entity';
import { DetalleServicio } from './modules/detalles/entities/detalle-servicio.entity';
import { DecisionAuditoriaEntity } from './modules/auditoria/entities/decision-auditoria.entity';
import { Factura } from './modules/facturas/entities/factura.entity';
import { PrediccionRiesgo } from './modules/predicciones/entities/prediccion-riesgo.entity';
import { AuditLog } from './modules/audit-log/entities/audit-log.entity';

const ALL_ENTITIES = [
  User,
  UserSession,
  Tarifa,
  MedicamentoInsumo,
  Planilla,
  Tramite,
  Expediente,
  DetalleServicio,
  DecisionAuditoriaEntity,
  Factura,
  PrediccionRiesgo,
  Plantilla,
  ResultadoPlanilla,
  AuditLog,
];

// Health check mínimo para verificar que la app y la conexión a la BD
// están arriba. Se amplía en el PASO 6 del Módulo 1 (TAREA FULL-01).
@Controller('health')
class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('POSTGRES_HOST'),
        port: config.get<number>('POSTGRES_PORT'),
        username: config.get<string>('POSTGRES_USER'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB'),
        entities: ALL_ENTITIES,
        // El esquema se crea a mano con los .sql de la carpeta /sql,
        // NUNCA con synchronize:true (borraría/alteraría tablas reales).
        synchronize: false,
      }),
    }),
    UsersModule,
    AuthModule,
    PlanillasModule,
    AuditoriaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
