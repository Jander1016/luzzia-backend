import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';

export interface ApiProvider {
  name: string;
  url: string;
  headers?: Record<string, string>;
  transform: (data: any) => any[];
}

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);
  
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private getApiProviders(): ApiProvider[] {
    return [
      {
        name: 'REE',
        url: this.configService.get<string>('reeApiUrl'),
        headers: this.getHeaders('REE'),
        transform: this.transformREEData,
      },
      {
        name: 'ALTERNATIVE_API', // Futura API alternativa
        url: this.configService.get<string>('alternativeApiUrl'),
        headers: this.getHeaders('ALTERNATIVE_API'),
        transform: this.transformAlternativeData,
      }
    ];
  }

  private getHeaders(provider: string): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'Luzzia-App/1.0',
    };

    // Soporte para diferentes tipos de autenticación
    const apiKey = this.configService.get<string>(`${provider.toLowerCase()}ApiKey`);
    const bearerToken = this.configService.get<string>(`${provider.toLowerCase()}BearerToken`);
    
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    
    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }

    return headers;
  }

  async fetchPriceData(): Promise<any[]> {
    const providers = this.getApiProviders();
    const primaryProvider = providers[0]; // REE por defecto
    
    try {
      this.logger.log(`🔄 Fetching from primary provider: ${primaryProvider.name}`);
      return await this.fetchFromProvider(primaryProvider);
    } catch (error) {
      this.logger.error(`❌ Primary provider failed: ${error.message}`);
      
      // Intentar con providers alternativos
      for (let i = 1; i < providers.length; i++) {
        try {
          this.logger.log(`🔄 Trying fallback provider: ${providers[i].name}`);
          return await this.fetchFromProvider(providers[i]);
        } catch (fallbackError) {
          this.logger.error(`❌ Fallback provider ${providers[i].name} failed: ${fallbackError.message}`);
        }
      }
      
      throw new Error('All API providers failed');
    }
  }

  private async fetchFromProvider(provider: ApiProvider): Promise<any[]> {
    if (!provider.url) {
      throw new Error(`No URL configured for provider ${provider.name}`);
    }

    const { data } = await firstValueFrom(
      this.httpService.get(provider.url, { headers: provider.headers }).pipe(
        catchError((error) => {
          throw new Error(`${provider.name} API error: ${error.message}`);
        }),
      ),
    );

    return provider.transform(data);
  }

  private transformREEData = (reeData: any): any[] => {
    if (!reeData?.PVPC) {
      throw new Error('Invalid REE data format');
    }

    return reeData.PVPC.map((item: any) => {
      const [dd, mm, yyyy] = item.Dia.split('/');
      const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
      const hour = parseInt(item.Hora.split('-')[0], 10);
      const price = parseFloat(item.PCB) / 1000;

      if (!date || isNaN(hour) || isNaN(price)) {
        throw new Error(`Invalid data item: ${JSON.stringify(item)}`);
      }

      return { date, hour, price };
    }).filter(Boolean);
  };

  private transformAlternativeData = (data: any): any[] => {
    // Implementar cuando tengas una API alternativa
    // return data.prices.map(...)
    return [];
  };
}