import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ResponsablesService } from './responsables.service';
import { CrearResponsableDto } from './dto/crear-responsable.dto';
import { ActualizarResponsableDto } from './dto/actualizar-responsable.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('responsables')
@ApiBearerAuth()
@Controller('responsables')
@UseGuards(JwtAuthGuard)
export class ResponsablesController {
  constructor(private readonly responsablesService: ResponsablesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista Director Administrativo y Revisores (cualquier usuario autenticado puede consultar)' })
  async listar() {
    return this.responsablesService.listar();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crea un nuevo responsable (solo ADMIN)' })
  async crear(@Body() dto: CrearResponsableDto) {
    return this.responsablesService.crear(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Edita/activa/desactiva un responsable (solo ADMIN)' })
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarResponsableDto) {
    return this.responsablesService.actualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Elimina físicamente un responsable NUNCA usado en documentos (solo ADMIN)' })
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    await this.responsablesService.eliminar(id);
    return { ok: true };
  }

  @Get('planilla/:planillaId/snapshot')
  @ApiOperation({ summary: 'Obtiene los responsables (snapshot histórico) usados en una planilla específica' })
  async snapshotDePlanilla(@Param('planillaId', ParseIntPipe) planillaId: number) {
    return this.responsablesService.obtenerSnapshotDePlanilla(planillaId);
  }
}
