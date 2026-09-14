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
   *
   * FIX: `celda.numFmt = X` (asignación directa) no siempre "despega"
   * la celda de un objeto de estilo COMPARTIDO -- muy común en bloques
   * de filas repetidas clonadas de la misma celda de plantilla (ej. las
   * 41 filas de detalle, todas con la misma celda A de origen). El
   * resultado es que el numFmt nuevo se pierde silenciosamente porque
   * termina mutando (o siendo sobreescrito por) un estilo que comparten
   * varias celdas. Reasignar `celda.style` completo con spread crea un
   * objeto de estilo NUEVO y propio para esa celda, evitando el problema.
   * Confirmado con evidencia real: funcionaba en celdas únicas
   * (CELDA_DESDE/CELDA_HASTA) pero fallaba en el bloque repetido de
   * detalle -- exactamente el patrón de este bug conocido de ExcelJS.
   */
  escribirFila(hoja: ExcelJS.Worksheet, fila: number, valores: CeldaValor[]): void {
    for (const { columna, valor, numFmt } of valores) {
      const celda = hoja.getCell(`${columna}${fila}`);
      celda.value = valor;
      if (numFmt) {
        celda.style = { ...celda.style, numFmt };
      }
    }
  }

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
