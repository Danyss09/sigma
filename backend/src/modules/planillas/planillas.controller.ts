import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { SubirPlanillaDto } from './dto/subir-planilla.dto';
import { Tramite } from '../tramites/entities/tramite.entity';
import { PlanillasService } from './planillas.service';
import { ProcesarPlanillaDto } from './dto/procesar-planilla.dto';
import { GenerarIndividualesDto } from './dto/generar-individuales.dto';
import { GenerarConsolidadasDto } from './dto/generar-consolidadas.dto';
import { ConsultarResultadosDto } from './dto/consultar-resultados.dto';
import { ActualizarPlanillaDto } from './dto/actualizar-planilla.dto';
import { Planilla } from './entities/planilla.entity';
import { GeneradorIndividualesService } from './services/generador-individuales.service';
import { GeneradorConsolidadasService } from './services/generador-consolidadas.service';
import { ResultadoPlanilla } from './entities/resultado-planilla.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { Patch, Delete, HttpCode, HttpStatus,  Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

interface RequestConUsuario extends Request {
  user: { id: number };
}

@ApiTags('planillas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('planillas')
export class PlanillasController {
  constructor(
    private readonly planillasService: PlanillasService,
    private readonly generadorIndividuales: GeneradorIndividualesService,
    private readonly generadorConsolidadas: GeneradorConsolidadasService,
    @InjectRepository(ResultadoPlanilla)
    private readonly resultadosRepository: Repository<ResultadoPlanilla>,
    @InjectRepository(Planilla)
    private readonly planillasRepository: Repository<Planilla>,
    @InjectRepository(Tramite) 
    private readonly tramitesRepository: Repository<Tramite>,

  ) {}
@Post('subir')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['hospital', 'periodo', 'file'],
      properties: {
        hospital: { type: 'string', example: 'Hospital del Día Chimbacalle' },
        periodo: { type: 'string', example: '04-2025' },
        file: { type: 'string', format: 'binary', description: 'Archivo .xlsx o .xlsm de la matriz' },
      },
    },
  })
  @ApiOperation({ summary: 'Sube el archivo a MinIO y crea la fila planillas (reemplaza el INSERT manual por SQL)' })
  async subir(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SubirPlanillaDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.planillasService.subirYRegistrar(file, dto, req.user.id);
  }
  /**
   * Recibe el .xlsm ya subido (planilla_id debe existir previamente, creado
   * por el endpoint de subida a MinIO que no se detalla aquí) y dispara el
   * parseo completo dentro de una transacción.
   */
  @Post('procesar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['planillaId', 'file'],
      properties: {
        planillaId: { type: 'integer', example: 1 },
        file: { type: 'string', format: 'binary', description: 'Archivo .xlsm de la matriz' },
        revisadoNombre: { type: 'string', example: 'Ana Torres' },
        revisadoIdentificacion: { type: 'string', example: '1712345678' },
        revisadoCargo: { type: 'string', example: 'MÉDICO AUDITOR' },
        revisadoSello: { type: 'boolean', example: false },
        aprobadoNombre: { type: 'string', example: 'Carlos Vega' },
        aprobadoIdentificacion: { type: 'string', example: '1798765432' },
        aprobadoCargo: { type: 'string', example: 'SUBDIRECTOR MÉDICO' },
        aprobadoSello: { type: 'boolean', example: false },
      },
    },
  })
  @ApiOperation({ summary: 'Procesa un archivo .xlsm de matriz y guarda trámites/expedientes/detalles' })
  async procesar(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ProcesarPlanillaDto,
    @Req() req: RequestConUsuario,
  ) {

    return this.planillasService.procesarMatriz(file.buffer, dto, {
      usuarioId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post(':id/generar-individuales')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Genera las planillas individuales (Excel + PDF) por trámite y servicio' })
  @ApiResponse({ status: 201, description: 'Lista de archivos generados, con errores y advertencias si hubo' })
  async generarIndividuales(
    @Param('id', ParseIntPipe) planillaId: number,
    @Body() dto: GenerarIndividualesDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.generadorIndividuales.generar(planillaId, dto, { usuarioId: req.user.id });
  }

  @Post(':id/generar-consolidadas')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Genera las planillas consolidadas (Excel + PDF) por servicio' })
  @ApiResponse({ status: 201, description: 'Lista de archivos generados, con errores y advertencias si hubo' })
  async generarConsolidadas(
    @Param('id', ParseIntPipe) planillaId: number,
    @Body() dto: GenerarConsolidadasDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.generadorConsolidadas.generar(planillaId, dto, { usuarioId: req.user.id });
  }

  @Get(':id/resultados')
  @ApiOperation({ summary: 'Lista los archivos (individuales/consolidadas) ya generados para una planilla' })
  async resultados(
    @Param('id', ParseIntPipe) planillaId: number,
    @Query() query: ConsultarResultadosDto,
  ) {
    return this.resultadosRepository.find({
      where: query.tipo ? { planilla: { id: planillaId }, tipo: query.tipo } : { planilla: { id: planillaId } },
      order: { createdAt: 'DESC' },
    });
  }
    @Get('resultados/:id/descargar')
  @ApiOperation({ summary: 'Descarga el archivo generado (individual/consolidada, xlsx o pdf)' })
  async descargarResultado(
    @Param('id', ParseIntPipe) resultadoId: number,
    @Res() res: Response,
  ): Promise<void> {
    const resultado = await this.resultadosRepository.findOne({ where: { id: resultadoId } });
    if (!resultado) {
      throw new NotFoundException(`Resultado ${resultadoId} no encontrado`);
    }

    const rutaAbsoluta = path.join(process.cwd(), resultado.rutaArchivo);
    if (!fs.existsSync(rutaAbsoluta)) {
      throw new NotFoundException(
        `El archivo ya no existe en el sistema de archivos (${resultado.rutaArchivo}). ` +
          'Puede que se haya movido/borrado la carpeta uploads/, o que el backend se esté ' +
          'ejecutando desde un directorio distinto al que se usó para generarlo.',
      );
    }

    res.download(rutaAbsoluta, resultado.nombreArchivo);
  }

    @Get(':id/servicios')
  @ApiOperation({ summary: 'Lista los servicios distintos (tipo_servicio) presentes en esta planilla' })
  async servicios(@Param('id', ParseIntPipe) planillaId: number): Promise<string[]> {
    const filas = await this.tramitesRepository
      .createQueryBuilder('tramite')
      .select('DISTINCT tramite.tipoServicio', 'tipoServicio')
      .where('tramite.planilla = :planillaId', { planillaId })
      .orderBy('tramite.tipoServicio', 'ASC')
      .getRawMany<{ tipoServicio: string }>();

    return filas.map((f) => f.tipoServicio);
  }
  @Get()
  @ApiOperation({ summary: 'Lista todas las planillas subidas, con filtros opcionales' })
  async listar(
    @Query('periodo') periodo?: string,
    @Query('estado') estado?: string,
    @Query('hospital') hospital?: string,
  ) {
    const qb = this.planillasRepository
      .createQueryBuilder('planilla')
      .leftJoinAndSelect('planilla.subidoPor', 'usuario')
      .orderBy('planilla.createdAt', 'DESC');

    if (periodo) qb.andWhere('planilla.periodo = :periodo', { periodo });
    if (estado) qb.andWhere('planilla.estado = :estado', { estado });
    if (hospital) qb.andWhere('planilla.hospital ILIKE :hospital', { hospital: `%${hospital}%` });

    return qb.getMany();
  }

  @Get(':id/detalle')
  @ApiOperation({ summary: 'Detalle completo de una planilla (para saber "cuál es cuál" antes de operar)' })
  async detalle(@Param('id', ParseIntPipe) id: number) {
    const planilla = await this.planillasRepository.findOne({
      where: { id },
      relations: ['subidoPor', 'tramites'],
    });
    if (!planilla) {
      throw new NotFoundException(`Planilla ${id} no encontrada`);
    }
    return planilla;
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Edita metadatos de una planilla (hospital, periodo, firmas)' })
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPlanillaDto,
  ) {
    const planilla = await this.planillasRepository.findOne({ where: { id } });
    if (!planilla) {
      throw new NotFoundException(`Planilla ${id} no encontrada`);
    }
    Object.assign(planilla, dto);
    return this.planillasRepository.save(planilla);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Elimina una planilla. OJO: no borra en cascada trámites/detalles ya procesados (quedan con planilla_id en null), solo la fila de planillas.',
  })
  async eliminar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const resultado = await this.planillasRepository.delete(id);
    if (resultado.affected === 0) {
      throw new NotFoundException(`Planilla ${id} no encontrada`);
    }
  }

}

