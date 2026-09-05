import { IsString, IsOptional, IsEnum, IsInt } from 'class-validator';
import { TipoResponsable } from '../entities/responsable-firma.entity';

export class CrearResponsableDto {
  @IsEnum(TipoResponsable)
  tipo: TipoResponsable;

  @IsString()
  nombreCompleto: string;

  @IsOptional()
  @IsString()
  identificacion?: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsInt()
  orden?: number;
}
