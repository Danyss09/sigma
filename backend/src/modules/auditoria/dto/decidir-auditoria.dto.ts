import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  ValidateIf,
  Min,
  IsInt,
} from 'class-validator';
import { DecisionAuditoria } from '../../../common/enums';

export class DecidirAuditoriaDto {
  @ApiProperty({
    description: 'Decisión del auditor sobre la planilla o línea',
    enum: DecisionAuditoria,
    //enumName: 'DecisionAuditoria',
    example: DecisionAuditoria.APROBADO,
    required: true,
  })
  @IsEnum(DecisionAuditoria, {
    message: 'decision debe ser APROBADO, RECHAZADO o PARCIAL',
  })
  decision: DecisionAuditoria;

  @ApiPropertyOptional({
    description:
      'Motivo o glosa (obligatorio cuando decision es RECHAZADO o PARCIAL)',
    example: 'Precio no coincide con el catálogo oficial',
    required: false, // Se muestra como opcional en Swagger, pero la validación condicional está en ValidateIf
  })
  @ValidateIf(
    (dto: DecidirAuditoriaDto) =>
      dto.decision === DecisionAuditoria.RECHAZADO ||
      dto.decision === DecisionAuditoria.PARCIAL,
  )
  @IsString()
  @IsOptional()
  motivoGlosa?: string;

  @ApiPropertyOptional({
    description:
      'Valor unitario oficial (solo aplica cuando se aprueba total o parcialmente una línea que fue rechazada automáticamente por no estar en catálogo)',
    example: 150.00,
    minimum: 0,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'valorUnitarioOficial debe ser numérico' })
  @Min(0)
  valorUnitarioOficial?: number;

  @ApiPropertyOptional({
    description:
      'Valor solicitado originalmente (opcional, puede usarse como referencia)',
    example: 180.00,
    minimum: 0,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'valorSolicitado debe ser numérico' })
  @Min(0)
  valorSolicitado?: number;
  @IsOptional()
  @IsInt()
  motivoObjecionId?: number;

}