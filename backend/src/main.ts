import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Detras de Caddy (proxy inverso) la IP real del cliente llega en X-Forwarded-For.
  // Con TRUST_PROXY=1 (docker-compose.prod.yml) request.ip pasa a ser la IP real, y asi la
  // trazabilidad LOPDP (audit-log, sesiones) no registra la IP interna del proxy.
  // En desarrollo (sin la variable) el comportamiento no cambia.
  if (process.env.TRUST_PROXY) {
    app.getHttpAdapter().getInstance().set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
  }

const config = new DocumentBuilder()
  .setTitle('Sigma Backend API')
  .setDescription('Documentación interactiva para probar los endpoints')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
    const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`SIGMA backend corriendo en el puerto ${port}`);
}

bootstrap();
