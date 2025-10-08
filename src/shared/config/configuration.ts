import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(4000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DB_URI: Joi.string().required(),
  
  // APIs principales
  REE_API_URL: Joi.string().uri().required(),
  REE_API_KEY: Joi.string().optional(),
  REE_BEARER_TOKEN: Joi.string().optional(),
  
  // APIs alternativas
  ALTERNATIVE_API_URL: Joi.string().uri().optional(),
  ALTERNATIVE_API_KEY: Joi.string().optional(),
  ALTERNATIVE_API_BEARER_TOKEN: Joi.string().optional(),
  
  // Configuración de cron
  CRON_SCHEDULE: Joi.string().default('15 20 * * *'),
  CRON_RETRY_SCHEDULE: Joi.string().default('15 23 * * *'),
  FALLBACK_RETRY_DELAY: Joi.number().default(30),
  MAX_RETRIES: Joi.number().default(3),
  TZ: Joi.string().default('Europe/Madrid'),
  
  // CORS
  ALLOWED_ORIGINS: Joi.string().required(),
  
  // Cache y performance
  CACHE_TTL_HOURS: Joi.number().default(1),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
});

export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  dbUri: process.env.DB_URI,
  
  // Compatibilidad hacia atrás
  reeApiUrl: process.env.REE_API_URL,
  
  apis: {
    ree: {
      url: process.env.REE_API_URL,
      apiKey: process.env.REE_API_KEY,
      bearerToken: process.env.REE_BEARER_TOKEN,
    },
    alternative: {
      url: process.env.ALTERNATIVE_API_URL,
      apiKey: process.env.ALTERNATIVE_API_KEY,
      bearerToken: process.env.ALTERNATIVE_API_BEARER_TOKEN,
    },
  },
  
  cron: {
    mainSchedule: process.env.CRON_SCHEDULE || '15 20 * * *',
    retrySchedule: process.env.CRON_RETRY_SCHEDULE || '15 23 * * *',
    timezone: process.env.TZ || 'Europe/Madrid',
  },
  
  fallbackRetryDelay: parseInt(process.env.FALLBACK_RETRY_DELAY, 10) || 30,
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001', 'https://luzzia-backend-production.up.railway.app'],
  maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
  
  cache: {
    ttlHours: parseInt(process.env.CACHE_TTL_HOURS, 10) || 1,
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
});
  