import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

export interface CeldaValor {
  columna: string;
  valor: string | number | Date | null;
  // Formato explícito de celda (ej. '0.00', '0.00%'). Necesario cuando la
  // plantilla trae la celda pre-formateada como fecha/otra cosa distinta
  // al tipo de dato real que estamos escribiendo — si no se fuerza,
  // Excel muestra el número como si fuera una fecha (día N de 1900).
  numFmt?: string;
}


@Injectable()
export class ExportadorExcelService {
  private readonly logger = new Logger(ExportadorExcelService.name);

  /**
   * Carga un archivo .xlsx desde disco como Workbook editable.
   * @param rutaAbsoluta ruta absoluta al archivo de plantilla.
   */
  async cargarPlantilla(rutaAbsoluta: string): Promise<ExcelJS.Workbook> {
    if (!fs.existsSync(rutaAbsoluta)) {
      throw new InternalServerErrorException(
        `Plantilla no encontrada en el sistema de archivos: ${rutaAbsoluta}`,
      );
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(rutaAbsoluta);
    return workbook;
  }

  /**
   * Escribe una fila de valores en una hoja, a partir de una fila y un
   * mapeo columna->valor. No asume ningún layout fijo: cada generador
   * decide qué van en cada columna.
   */
  escribirFila(hoja: ExcelJS.Worksheet, fila: number, valores: CeldaValor[]): void {
    for (const { columna, valor, numFmt } of valores) {
      const celda = hoja.getCell(`${columna}${fila}`);
      celda.value = valor;
      if (numFmt) {
        celda.numFmt = numFmt;
      }
    }
  }

  /**
   * Guarda el workbook en disco, creando la carpeta destino si no existe.
   * Retorna la ruta ABSOLUTA donde quedó guardado.
   */
  async guardar(
    workbook: ExcelJS.Workbook,
    nombreArchivo: string,
    carpetaDestinoAbsoluta: string,
  ): Promise<string> {
    try {
      fs.mkdirSync(carpetaDestinoAbsoluta, { recursive: true });
      const rutaCompleta = path.join(carpetaDestinoAbsoluta, nombreArchivo);
      await workbook.xlsx.writeFile(rutaCompleta);
      return rutaCompleta;
    } catch (error) {
      this.logger.error(`Error guardando Excel: ${(error as Error).message}`);
      throw new InternalServerErrorException('No se pudo guardar el archivo Excel generado');
    }
  }
}
