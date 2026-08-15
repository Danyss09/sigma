import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';

export class ActualizarPlanillaDto {
  @IsOptional()
  @IsString()
  hospital?: string;

  @IsOptional()
  @Matches(/^\d{2}-\d{4}$/, { message: 'periodo debe tener formato MM-YYYY, ej. "04-2025"' })
  periodo?: string;

  @IsOptional()
  @IsString()
  revisadoNombre?: string;

  @IsOptional()
  @IsString()
  revisadoIdentificacion?: string;

  @IsOptional()
  @IsString()
  revisadoCargo?: string;

  @IsOptional()
  @IsBoolean()
  revisadoSello?: boolean;

  @IsOptional()
  @IsString()
  aprobadoNombre?: string;

  @IsOptional()
  @IsString()
  aprobadoIdentificacion?: string;

  @IsOptional()
  @IsString()
  aprobadoCargo?: string;

  @IsOptional()
  @IsBoolean()
  aprobadoSello?: boolean;
}
