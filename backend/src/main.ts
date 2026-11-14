import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. Cabeceras de seguridad con Helmet
  app.use(helmet());

  // 2. Límites de tamaño de body (100 kb) para prevenir ataques de denegación de servicio
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // 3. CORS seguro restringido a lista blanca leída de CORS_ORIGINS
  const rawCors =
    process.env.CORS_ORIGINS ||
    'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173';
  const allowedOrigins = rawCors
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  app.enableCors({
    origin: (origin, callback) => {
      // Peticiones sin origen (mismo servidor, scripts locales, mobile o health checks)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com')
      ) {
        return callback(null, true);
      }

      logger.warn(`Origen bloqueado por política CORS: ${origin}`);
      return callback(new Error(`Origen CORS no permitido: ${origin}`), false);
    },
    credentials: true,
  });

  // 4. Pipes globales con forbidNonWhitelisted: true
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // 5. Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API Sistema de Gestión Clínica')
    .setDescription(
      'Documentación oficial de los endpoints REST para gestión de citas, roles de usuario, disponibilidad, seguridad 2FA y auditoría.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Validación de variables críticas en producción
  if (process.env.NODE_ENV === 'production' && !process.env.TURNSTILE_SECRET_KEY) {
    logger.error('ERROR CRÍTICO: TURNSTILE_SECRET_KEY no está configurada en producción.');
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Servidor Backend ejecutándose en el puerto ${port}`);
  logger.log(`Documentación Swagger disponible en /docs`);
}

bootstrap();
