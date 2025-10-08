import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

@Injectable()
export class CorsConfigService {
  private readonly logger = new Logger(CorsConfigService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Genera la configuración CORS basada en las variables de entorno
   * @returns CorsOptions configuradas
   */
  getCorsOptions(): CorsOptions {
    const allowedOrigins = this.configService.get<string[]>('allowedOrigins');
    const isDevelopment = process.env.NODE_ENV === 'development';

    return {
      origin: this.createOriginHandler(allowedOrigins, isDevelopment),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
      ],
      credentials: true,
      optionsSuccessStatus: 200, // Para soportar navegadores legacy
    };
  }

  /**
   * Crea el handler para validar origins
   * @param allowedOrigins Array de origins permitidos
   * @param isDevelopment Si está en modo desarrollo
   * @returns Function para validar origins
   */
  private createOriginHandler(
    allowedOrigins: string[],
    isDevelopment: boolean
  ): (origin: string, callback: (err: Error | null, allow?: boolean) => void) => void {
    return (origin, callback) => {
      // Permitir requests sin origin (apps móviles, Postman)
      if (!origin) return callback(null, true);

      // Verificar si el origin está permitido
      if (allowedOrigins && allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        this.logger.debug(`🔒 CORS check for origin: ${allowedOrigins}`);
        this.logger.warn(`🚫 CORS blocked origin: ${origin}`);
        
        // En desarrollo, permitir todos los origins
        if (isDevelopment) {
          this.logger.debug(`🔧 Development mode: allowing origin ${origin}`);
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      }
    };
  }

  /**
   * Registra información sobre la configuración CORS
   */
  logCorsConfiguration(): void {
    const allowedOrigins = this.configService.get<string[]>('allowedOrigins');
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      this.logger.log('🔒 CORS enabled in development mode - all origins allowed');
    } else {
      this.logger.log(`🔒 CORS enabled for origins: ${allowedOrigins ? allowedOrigins.join(', ') : 'none'}`);
    }
  }
}