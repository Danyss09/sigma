import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { EstadoFila } from '../../../common/enums';

export class QueryAuditoriaDto {
  @ApiPropertyOptional({
    description:
      'Filtra por estado de la fila. Si no se envía, se listan PENDIENTE y RECHAZADO (según lógica de AuditoriaService).',
    enum: EstadoFila,
    example: EstadoFila.AUDITADO,
  })
  @IsOptional()
  @IsEnum(EstadoFila, { message: 'estado inválido' })
  estado?: EstadoFila;

  @ApiPropertyOptional({
    description: 'ID del trámite (filtra por un trámite específico)',
    example: 123,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  tramiteId?: number;

  @ApiPropertyOptional({
    description: 'ID de la planilla (filtra solo las líneas pendientes de ESA planilla)',
    example: 11,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  planillaId?: number;

  @ApiPropertyOptional({
    description: 'Número de página (mínimo 1)',
    example: 1,
    default: 1,
    minimum: 1,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de registros por página (mínimo 1, máximo 100)',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
