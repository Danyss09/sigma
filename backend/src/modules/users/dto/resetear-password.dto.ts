import { IsString, MinLength } from 'class-validator';

export class ResetearPasswordDto {
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  nuevaPassword: string;
}
