import { Controller, Get, Post, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CatalogosService } from './catalogos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('catalogos')
@ApiBearerAuth()
@Controller('catalogos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get('versiones')
  @ApiOperation({ summary: 'Lista todas las versiones de catálogos (tarifario, medicamentos, CPC/VAE, motivos, etc.)' })
  async listarVersiones() {
    return this.catalogosService.listarVersiones();
  }

  @Post(':id/activar')
  @ApiOperation({ summary: 'Activa una versión de catálogo (desactiva automáticamente cualquier otra activa del mismo tipo)' })
  async activar(@Param('id', ParseIntPipe) id: number) {
    await this.catalogosService.activarVersion(id);
    return { ok: true };
  }

  @Post(':id/desactivar')
  @ApiOperation({ summary: 'Desactiva una versión de catálogo (pasa a HISTORICO)' })
  async desactivar(@Param('id', ParseIntPipe) id: number) {
    await this.catalogosService.desactivarVersion(id);
    return { ok: true };
  }
}
