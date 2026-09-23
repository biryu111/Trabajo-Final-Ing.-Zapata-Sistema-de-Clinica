import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Pipes y Filtros globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API Sistema de Gestión Clínica')
    .setDescription(
      'Documentación oficial de los endpoints REST para gestión de citas, roles de usuario, disponibilidad y panel administrativo.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Servidor Backend ejecutándose en el puerto ${port}`);
  logger.log(`Documentación Swagger disponible en /docs`);
}

bootstrap();
