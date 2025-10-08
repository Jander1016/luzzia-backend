import { Injectable, Logger, ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CorsConfigService } from './cors.config';
import { SwaggerConfigService } from './swagger.config';

@Injectable()
export class AppBootstrapService {
  private readonly logger = new Logger(AppBootstrapService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly corsConfig: CorsConfigService,
    private readonly swaggerConfig: SwaggerConfigService,
  ) {}

  /**
   * Configura completamente la aplicación
   * @param app Instancia de la aplicación NestJS
   */
  async configureApp(app: INestApplication): Promise<void> {
    // Configurar CORS
    this.setupCors(app);

    // Configurar prefijo global
    this.setupGlobalPrefix(app);

    // Configurar validación global
    this.setupGlobalValidation(app);

    // Configurar Swagger
    this.setupSwagger(app);

    // Log de configuración
    this.logConfiguration();
  }

  /**
   * Inicia la aplicación en el puerto configurado
   * @param app Instancia de la aplicación NestJS
   */
  async startApp(app: INestApplication): Promise<void> {
    const port = this.configService.get<number>('port');

    await app.listen(port);

    this.logStartupInfo(port);
  }

  /**
   * Configura CORS usando el servicio dedicado
   * @param app Instancia de la aplicación
   */
  private setupCors(app: INestApplication): void {
    const corsOptions = this.corsConfig.getCorsOptions();
    app.enableCors(corsOptions);
  }

  /**
   * Configura el prefijo global de la API
   * @param app Instancia de la aplicación
   */
  private setupGlobalPrefix(app: INestApplication): void {
    app.setGlobalPrefix('api/v1/');
  }

  /**
   * Configura la validación global
   * @param app Instancia de la aplicación
   */
  private setupGlobalValidation(app: INestApplication): void {
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true, // Mejor seguridad
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
  }

  /**
   * Configura Swagger usando el servicio dedicado
   * @param app Instancia de la aplicación
   */
  private setupSwagger(app: INestApplication): void {
    this.swaggerConfig.setupSwagger(app);
  }

  /**
   * Registra información de configuración
   */
  private logConfiguration(): void {
    this.corsConfig.logCorsConfiguration();
    this.logger.log('✅ Global validation pipes configured');
    this.logger.log('✅ API prefix set to: api/v1/');
  }

  /**
   * Registra información de inicio de la aplicación
   * @param port Puerto en el que se ejecuta la aplicación
   */
  private logStartupInfo(port: number): void {
    const apiUrl = `http://localhost:${port}/api/v1`;
    const docsUrl = this.swaggerConfig.getDocsUrl();

    this.logger.log(`🚀 Application is running on: ${apiUrl}`);
    this.logger.log(`📚 Swagger docs available at: ${docsUrl}`);
    this.logger.log('🎉 Application successfully bootstrapped!');
  }
}
