import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

// Rutas típicas donde queda instalado LibreOffice en Windows, por si
// "soffice" no está en el PATH del sistema (lo más común).
const RUTAS_WINDOWS_COMUNES = [
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
];

@Injectable()
export class ExportadorLibreOfficeService {
  private readonly logger = new Logger(ExportadorLibreOfficeService.name);
  private comandoSoffice: string | null = null;

  private async resolverComandoSoffice(): Promise<string> {
    if (this.comandoSoffice) return this.comandoSoffice;

    // 1. Probar si "soffice" está en el PATH
    try {
      await execFileAsync('soffice', ['--version'], { timeout: 10000 });
      this.comandoSoffice = 'soffice';
      return this.comandoSoffice;
    } catch {
      // sigue abajo
    }

    // 2. Probar rutas típicas de instalación en Windows
    if (process.platform === 'win32') {
      for (const ruta of RUTAS_WINDOWS_COMUNES) {
        if (fs.existsSync(ruta)) {
          this.comandoSoffice = ruta;
          return this.comandoSoffice;
        }
      }
    }

    throw new InternalServerErrorException(
      'LibreOffice (soffice) no está instalado o no se encuentra. ' +
        'Instálalo desde https://www.libreoffice.org/download/ y asegúrate de que ' +
        '"soffice" esté en el PATH, o que esté en una de las rutas típicas de Windows.',
    );
  }

  /**
   * Convierte un .xlsx ya generado a PDF usando LibreOffice en modo
   * headless — el resultado es una conversión real del archivo, byte a
   * byte fiel a como se ve el Excel (logo, firmas, merges, todo), a
   * diferencia del PDF genérico armado a mano con pdfmake.
   *
   * @returns la ruta absoluta del PDF generado.
   */
  async convertirXlsxAPdf(rutaXlsxAbsoluta: string, carpetaDestino: string): Promise<string> {
    const comando = await this.resolverComandoSoffice();

    try {
      fs.mkdirSync(carpetaDestino, { recursive: true });

      await execFileAsync(
        comando,
        ['--headless', '--convert-to', 'pdf', '--outdir', carpetaDestino, rutaXlsxAbsoluta],
        { timeout: 60000 },
      );

      const nombreBase = path.basename(rutaXlsxAbsoluta, path.extname(rutaXlsxAbsoluta));
      const rutaPdfEsperada = path.join(carpetaDestino, `${nombreBase}.pdf`);

      if (!fs.existsSync(rutaPdfEsperada)) {
        throw new Error(
          `LibreOffice no reportó error pero no se encontró el PDF esperado en ${rutaPdfEsperada}`,
        );
      }

      this.logger.log(`Convertido a PDF con LibreOffice: ${rutaPdfEsperada}`);
      return rutaPdfEsperada;
    } catch (error) {
      this.logger.error(`Error convirtiendo ${rutaXlsxAbsoluta} a PDF: ${(error as Error).message}`);
      throw new InternalServerErrorException(
        `No se pudo convertir el archivo a PDF con LibreOffice: ${(error as Error).message}`,
      );
    }
  }
}
