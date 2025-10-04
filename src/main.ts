import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');
  const allowedOrigins = configService.get<string[]>('ALLOWED_ORIGINS');
  
  const logger = new Logger('Bootstrap');

  // Configurar CORS
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1/');

  const config = new DocumentBuilder()
    .setTitle('Luzzia API')
    .setDescription('Luzzia API description')
    .setVersion('1.0')
    .addTag('prices')
    .addTag('contacts')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/documentation', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )

  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/v1/documentation`);
}
bootstrap();
