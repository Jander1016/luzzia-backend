import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppBootstrapService } from './shared/config/app-bootstrap.service';

async function bootstrap() {
  // Crear la aplicación NestJS
  const app = await NestFactory.create(AppModule);

  // Obtener el servicio de bootstrap que maneja toda la configuración
  const bootstrapService = app.get(AppBootstrapService);

  // Configurar la aplicación usando el servicio dedicado
  await bootstrapService.configureApp(app);

  // Iniciar la aplicación
  await bootstrapService.startApp(app);
}

// Manejo de errores global
bootstrap().catch((error) => {
  console.error('❌ Error starting application:', error);
  process.exit(1);
});
