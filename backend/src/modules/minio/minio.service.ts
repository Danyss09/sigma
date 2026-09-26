import { Injectable, Logger, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Minio.Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET') ?? 'sigma-planillas';

    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') ?? 'localhost',
      port: Number(this.configService.get<string>('MINIO_PORT') ?? 9000),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') ?? '',
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') ?? '',
    });
  }

  // Antes esto lo hacia un contenedor aparte ("minio-init" con la imagen "mc"), pero quay.io
  // le cerro el acceso anonimo a las imagenes de MinIO. Crear el bucket aqui, al arrancar el
  // backend, elimina esa dependencia fragil por completo.
  async onModuleInit(): Promise<void> {
    const intentosMax = 10;
    for (let intento = 1; intento <= intentosMax; intento++) {
      try {
        const existe = await this.client.bucketExists(this.bucket);
        if (!existe) {
          await this.client.makeBucket(this.bucket);
          this.logger.log(`Bucket de MinIO creado: ${this.bucket}`);
        }
        try {
          await this.client.setBucketVersioning(this.bucket, { Status: 'Enabled' });
        } catch (error) {
          this.logger.warn(`No se pudo habilitar el versionado del bucket: ${(error as Error).message}`);
        }
        return;
      } catch (error) {
        this.logger.warn(
          `MinIO no esta listo todavia (intento ${intento}/${intentosMax}): ${(error as Error).message}`,
        );
        await new Promise((resolver) => setTimeout(resolver, 3000));
      }
    }
    this.logger.error(
      'No se pudo verificar/crear el bucket de MinIO tras varios intentos. ' +
        'El backend seguira arrancando, pero subir archivos fallara hasta que MinIO este disponible.',
    );
  }

  async uploadFile(
    buffer: Buffer,
    objectName: string,
    metadata: Record<string, string> = {},
  ): Promise<void> {
    try {
      await this.client.putObject(this.bucket, objectName, buffer, buffer.length, metadata);
      this.logger.log(`Subido a MinIO: ${objectName}`);
    } catch (error) {
      this.logger.error(`Error subiendo ${objectName} a MinIO: ${(error as Error).message}`);
      throw new InternalServerErrorException('No se pudo guardar el archivo en el almacenamiento (MinIO)');
    }
  }

  async getPresignedUrl(objectName: string, expirySegundos = 3600): Promise<string> {
    try {
      return await this.client.presignedGetObject(this.bucket, objectName, expirySegundos);
    } catch (error) {
      this.logger.error(`Error generando URL firmada para ${objectName}: ${(error as Error).message}`);
      throw new InternalServerErrorException('No se pudo generar el link de descarga');
    }
  }

  async fileExists(objectName: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, objectName);
      return true;
    } catch {
      return false;
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, objectName);
    } catch (error) {
      this.logger.error(`Error eliminando ${objectName} de MinIO: ${(error as Error).message}`);
      throw new InternalServerErrorException('No se pudo eliminar el archivo del almacenamiento');
    }
  }
  
}
