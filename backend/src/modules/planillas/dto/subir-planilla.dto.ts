import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class SubirPlanillaDto {
  @IsString()
  @IsNotEmpty()
  hospital: string;

  // Mismo formato que ya usa planillas.periodo en el resto del sistema
  // (ej. "04-2025"), confirmado contra tu seed y tus pruebas reales.
  @IsString()
  @Matches(/^\d{2}-\d{4}$/, { message: 'periodo debe tener formato MM-YYYY, ej. "04-2025"' })
  periodo: string;
}
