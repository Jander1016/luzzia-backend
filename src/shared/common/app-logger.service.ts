import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogContext {
  module?: string;
  method?: string;
  userId?: string;
  requestId?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class AppLogger extends Logger {
  private logLevel: LogLevel;

  constructor(
    private readonly configService: ConfigService,
    context?: string,
  ) {
    super(context);
    const level = this.configService.get<string>('logging.level', 'info');
    this.logLevel = this.getLogLevel(level);
  }

  private getLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  logApiCall(method: string, url: string, status: number, duration: number, context?: LogContext) {
    if (this.logLevel >= LogLevel.INFO) {
      const message = `🌐 API ${method} ${url} - ${status} (${duration}ms)`;
      this.log(message, { ...context, type: 'api_call', method, url, status, duration });
    }
  }

  logCronJob(jobName: string, success: boolean, duration: number, details?: any) {
    if (this.logLevel >= LogLevel.INFO) {
      const icon = success ? '✅' : '❌';
      const message = `${icon} CRON ${jobName} - ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`;
      this.log(message, { type: 'cron_job', jobName, success, duration, details });
    }
  }

  logDataSync(operation: string, count: number, source: string, details?: any) {
    if (this.logLevel >= LogLevel.INFO) {
      const message = `📊 DATA ${operation} - ${count} records from ${source}`;
      this.log(message, { type: 'data_sync', operation, count, source, details });
    }
  }

  logError(error: Error, context?: LogContext) {
    const message = `❌ ERROR: ${error.message}`;
    this.error(message, error.stack, { ...context, type: 'error', errorName: error.name });
  }

  logBusinessEvent(event: string, data?: any, context?: LogContext) {
    if (this.logLevel >= LogLevel.INFO) {
      const message = `🔔 EVENT: ${event}`;
      this.log(message, { ...context, type: 'business_event', event, data });
    }
  }

  logPerformance(operation: string, duration: number, details?: any) {
    if (this.logLevel >= LogLevel.DEBUG) {
      const message = `⚡ PERF: ${operation} took ${duration}ms`;
      this.debug(message, { type: 'performance', operation, duration, details });
    }
  }
}