import { Controller, Post, Get, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrediccionesService } from './predicciones.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('predicciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.AUDITOR)
@Controller('planillas')
export class PrediccionesController {
  constructor(private readonly prediccionesService: PrediccionesService) {}

  @Post(':id/evaluar-riesgo')
  @ApiOperation({
    summary:
      'Evalúa riesgo con IA de TODAS las líneas de la planilla (ya no excluye sin-catálogo, las marca con motivo explícito).',
  })
  async evaluarRiesgo(@Param('id', ParseIntPipe) planillaId: number) {
    return this.prediccionesService.evaluarPlanilla(planillaId);
  }

  @Post('detalles/:detalleId/evaluar-riesgo')
  @ApiOperation({ summary: 'Evalúa riesgo de una sola línea (para reevaluar tras una corrección manual)' })
  async evaluarUnaLinea(@Param('detalleId', ParseIntPipe) detalleId: number) {
    return this.prediccionesService.evaluarDetalle(detalleId);
  }

  @Get(':id/riesgo-detalle')
  @ApiOperation({ summary: 'Vista combinada: cada línea con validación de catálogo, riesgo IA, y motivo si no fue evaluable' })
  async riesgoDetalle(@Param('id', ParseIntPipe) planillaId: number) {
    return this.prediccionesService.obtenerVistaRiesgo(planillaId);
  }

  @Get('correcciones')
  @ApiOperation({ summary: 'Lista TODAS las correcciones automáticas (todas las planillas), con búsqueda opcional' })
  async todasLasCorrecciones(@Query('q') q?: string) {
    return this.prediccionesService.listarTodasLasCorrecciones(q);
  }

  @Get(':id/correcciones')
  @ApiOperation({ summary: 'Lista las correcciones automáticas hechas por la IA en esta planilla específica' })
  async correccionesDePlanilla(@Param('id', ParseIntPipe) planillaId: number) {
    return this.prediccionesService.listarCorreccionesDePlanilla(planillaId);
  }
}
