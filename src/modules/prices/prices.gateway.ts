import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PricesService } from './prices.service';
import { PriceUpdateDto } from './dto/price-update.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/prices'
})
export class PricesGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('PricesGateway');
  private priceCheckInterval: NodeJS.Timeout;

  constructor(private readonly pricesService: PricesService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    this.startPriceUpdates();
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    // Enviar precio actual inmediatamente al conectarse
    this.sendCurrentPrice(client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private startPriceUpdates() {
    // Verificar cada minuto si hay cambios de precio
    this.priceCheckInterval = setInterval(async () => {
      await this.checkAndBroadcastPriceUpdate();
    }, 60000); // 1 minuto
  }

  private async sendCurrentPrice(client: Socket) {
    try {
      const dashboardStats = await this.pricesService.getDashboardStats();
      const priceUpdate: PriceUpdateDto = {
        type: 'price_update',
        data: {
          currentPrice: dashboardStats.currentPrice,
          timestamp: dashboardStats.lastUpdated,
          level: this.getPriceLevel(dashboardStats.currentPrice)
        }
      };
      
      client.emit('price_update', priceUpdate);
    } catch (error) {
      this.logger.error('Error sending current price to client', error);
    }
  }

  private async checkAndBroadcastPriceUpdate() {
    try {
      const dashboardStats = await this.pricesService.getDashboardStats();
      const priceUpdate: PriceUpdateDto = {
        type: 'price_update',
        data: {
          currentPrice: dashboardStats.currentPrice,
          timestamp: dashboardStats.lastUpdated,
          level: this.getPriceLevel(dashboardStats.currentPrice)
        }
      };

      // Broadcast a todos los clientes conectados
      this.server.emit('price_update', priceUpdate);
      this.logger.log(`Price update broadcasted: ${dashboardStats.currentPrice} €/kWh`);
    } catch (error) {
      this.logger.error('Error broadcasting price update', error);
    }
  }

  private getPriceLevel(price: number): string {
    // Lógica simple para determinar el nivel de precio
    // Esto debería ajustarse según los rangos reales de precios
    if (price < 0.10) return 'bajo';
    if (price < 0.15) return 'medio';
    if (price < 0.20) return 'alto';
    return 'muy-alto';
  }

  onModuleDestroy() {
    if (this.priceCheckInterval) {
      clearInterval(this.priceCheckInterval);
    }
  }
}