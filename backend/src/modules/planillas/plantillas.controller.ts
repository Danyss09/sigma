import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ActualizarPlanillaDto } from './dto/actualizar-planilla.dto';
import { Planilla } from './entities/planilla.entity';
import { GestionPlantillasService } from './services/gestion-plantillas.service';
import { CrearPlantillaDto } from './dto/crear-plantilla.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, TipoPlantilla } from '../../common/enums';

@ApiTags('plantillas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('plantillas')
export class PlantillasController {
  constructor(private readonly plantillasService: GestionPlantillasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las plantillas activas (opcionalmente filtradas por tipo)' })
  async listar(@Query('tipo') tipo?: TipoPlantilla) {
    return this.plantillasService.listarActivas(tipo);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('archivo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        tipo: { type: 'string', enum: Object.values(TipoPlantilla) },
        archivo: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Sube una nueva plantilla .xlsx (desactiva la anterior del mismo tipo)' })
  async subir(@Body() dto: CrearPlantillaDto, @UploadedFile() archivo: Express.Multer.File) {
    return this.plantillasService.subir(dto.nombre, dto.tipo, archivo);
  }
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactiva una plantilla (no la borra del disco)' })
  async desactivar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.plantillasService.desactivar(id);
  }
}
