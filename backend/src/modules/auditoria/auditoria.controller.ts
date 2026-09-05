import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiExtraModels,
} from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';
import { DecidirAuditoriaDto } from './dto/decidir-auditoria.dto';
import { QueryAuditoriaDto } from './dto/query-auditoria.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { User } from '../users/entities/user.entity';

@ApiTags('auditoria')
@ApiBearerAuth()
@ApiExtraModels(QueryAuditoriaDto)
@ApiExtraModels(DecidirAuditoriaDto)
@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AUDITOR, UserRole.ADMIN)
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  // GET /auditoria/pendientes?estado=RECHAZADO&tramiteId=5&page=1&limit=20
  @Get('pendientes')
  @ApiOperation({
    summary: 'Listar pendientes de auditoría',
    description:
      'Obtiene una lista de filas pendientes de auditoría (por defecto PENDIENTE y RECHAZADO), ' +
      'enriquecida con el nivel de riesgo más reciente de cada línea. ' +
      'Se puede filtrar por estado, trámite, y paginar. Requiere rol AUDITOR o ADMIN.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista de filas obtenida correctamente' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autenticado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'No tiene permisos (rol AUDITOR o ADMIN requerido)' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Parámetros inválidos' })
  async listarPendientes(@Query() query: QueryAuditoriaDto) {
    return this.auditoriaService.listarPendientes(query);
  }

  // GET /auditoria/motivos-objecion
  @Get('motivos-objecion')
  @ApiOperation({
    summary: 'Lista los motivos de objeción disponibles (CMT/LQD/REV)',
    description: 'Para poblar el selector del auditor al rechazar una línea.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista de motivos obtenida correctamente' })
  async motivosObjecion() {
    return this.auditoriaService.listarMotivosObjecion();
  }

  // GET /auditoria/:detalleId/contexto
  @Get(':detalleId/contexto')
  @ApiOperation({
    summary: 'Contexto completo de un registro',
    description:
      'planilla→trámite→expediente→detalle→predicción, para navegación directa desde "Revisar/Corregir" en Revisar Riesgo.',
  })
  @ApiParam({ name: 'detalleId', type: Number, example: 123 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Contexto obtenido correctamente' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Detalle no encontrado' })
  async contexto(@Param('detalleId', ParseIntPipe) detalleId: number) {
    return this.auditoriaService.obtenerContextoCompleto(detalleId);
  }

  // POST /auditoria/:detalleId/decidir
  @Post(':detalleId/decidir')
  @ApiOperation({
    summary: 'Decidir sobre una fila de auditoría',
    description:
      'Permite al auditor tomar una decisión (APROBADO, RECHAZADO, PARCIAL) sobre una fila específica. ' +
      'Si se rechaza o se aprueba parcialmente, es obligatorio enviar motivoGlosa. ' +
      'Al rechazar, opcionalmente se puede indicar motivoObjecionId (CMT/LQD/REV). ' +
      'Adicionalmente, se pueden proporcionar valorUnitarioOficial y valorSolicitado en ciertos casos.',
  })
  @ApiParam({ name: 'detalleId', type: Number, description: 'ID del detalle de la fila a auditar', example: 123 })
  @ApiBody({ type: DecidirAuditoriaDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Decisión registrada exitosamente' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos inválidos (ej. motivoGlosa faltante cuando es necesario)' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autenticado' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'No tiene permisos (rol AUDITOR o ADMIN requerido)' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Detalle no encontrado' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'La fila ya fue auditada' })
  async decidir(
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @Body() dto: DecidirAuditoriaDto,
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Req() request: Request,
  ) {
    return this.auditoriaService.decidir(detalleId, dto, {
      usuarioId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }
}
