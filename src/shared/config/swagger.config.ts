import { Injectable } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class SwaggerConfigService {

  constructor(private readonly configService: ConfigService) {}

  /**
   * Configura y monta Swagger en la aplicación
   * @param app Instancia de la aplicación NestJS
   */
  setupSwagger(app: INestApplication): void {
    const config = this.createSwaggerConfig();
    const document = SwaggerModule.createDocument(app, config);
    
    const docsPath = 'api/v1/documentation';
    SwaggerModule.setup(docsPath, app, document);
  }

  /**
   * Crea la configuración base de Swagger
   * @returns DocumentBuilder configurado
   */
  private createSwaggerConfig() {
    return new DocumentBuilder()
      .setTitle('Luzzia API')
      .setDescription('API para gestión de precios de electricidad y contactos')
      .setVersion('1.0')
      .addTag('Prices', 'Operaciones relacionadas con precios de electricidad')
      .addTag('Contacts', 'Operaciones de gestión de contactos')
      .addBearerAuth() // Soporte para autenticación Bearer si se necesita en el futuro
      .addServer('http://localhost:4000', 'Desarrollo')
      .addServer('https://luzzia-backend-production.up.railway.app', 'Producción') // Ajustar según tu dominio
      .build();
  }

  /**
   * Obtiene la URL completa de la documentación
   * @returns URL de la documentación Swagger
   */
  getDocsUrl(): string {
    const port = this.configService.get<number>('port');
    return `http://localhost:${port}/api/v1/documentation`;
  }
}
