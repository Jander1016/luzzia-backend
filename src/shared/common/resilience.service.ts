import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

@Injectable()
export class ResilienceService {
  private readonly logger = new Logger(ResilienceService.name);
  private circuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private readonly configService: ConfigService) {}

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: Partial<RetryOptions>,
  ): Promise<T> {
    const config: RetryOptions = {
      maxRetries: this.configService.get<number>('maxRetries', 3),
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryCondition: (error) => this.isRetryableError(error),
      ...options,
    };

    let lastError: Error;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt, config);
          this.logger.log(
            `🔄 Retry attempt ${attempt}/${config.maxRetries} after ${delay}ms`,
          );
          await this.sleep(delay);
        }

        const result = await this.executeWithCircuitBreaker(operation);

        if (attempt > 0) {
          this.logger.log(`✅ Operation succeeded after ${attempt} retries`);
        }

        return result;
      } catch (error) {
        lastError = error;

        if (!config.retryCondition(error)) {
          this.logger.error(`❌ Non-retryable error: ${error.message}`);
          throw error;
        }

        if (attempt === config.maxRetries) {
          this.logger.error(`❌ Max retries (${config.maxRetries}) exceeded`);
          break;
        }

        this.logger.warn(`⚠️ Attempt ${attempt + 1} failed: ${error.message}`);
      }
    }

    throw lastError;
  }

  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    options?: Partial<CircuitBreakerOptions>,
  ): Promise<T> {
    const config: CircuitBreakerOptions = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minuto
      monitoringPeriod: 300000, // 5 minutos
      ...options,
    };

    // Verificar estado del circuit breaker
    if (this.circuitState === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime < config.recoveryTimeout) {
        throw new Error('Circuit breaker is OPEN - operation blocked');
      } else {
        this.circuitState = CircuitState.HALF_OPEN;
        this.logger.log('🔄 Circuit breaker moving to HALF_OPEN state');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(config);
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 2) {
        // Requerir 2 éxitos consecutivos
        this.circuitState = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.logger.log('✅ Circuit breaker CLOSED - normal operation resumed');
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(config: CircuitBreakerOptions): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failureCount >= config.failureThreshold) {
      this.circuitState = CircuitState.OPEN;
      this.logger.error(
        `🚨 Circuit breaker OPEN - ${this.failureCount} failures detected`,
      );
    }
  }

  private calculateDelay(attempt: number, config: RetryOptions): number {
    const exponentialDelay =
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    const jitteredDelay = exponentialDelay + Math.random() * 1000; // Añadir jitter
    return Math.min(jitteredDelay, config.maxDelay);
  }

  private isRetryableError(error: any): boolean {
    // Errores retryables típicos
    const retryableErrors = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'EAI_AGAIN',
    ];

    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];

    return (
      retryableErrors.some((code) => error.code === code) ||
      retryableStatusCodes.includes(error.response?.status) ||
      error.message?.includes('timeout') ||
      error.message?.includes('network')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getCircuitBreakerStatus() {
    return {
      state: this.circuitState,
      failureCount: this.failureCount,
      lastFailureTime: new Date(this.lastFailureTime).toISOString(),
      successCount: this.successCount,
    };
  }
}
