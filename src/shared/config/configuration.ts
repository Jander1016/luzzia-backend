import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number(),
  DB_URI: Joi.string().required(),
  REE_API_URL: Joi.string().uri().required(),
  CRON_SCHEDULE: Joi.string(),
  FALLBACK_RETRY_DELAY: Joi.number().default(30), 
  ALLOWED_ORIGINS: Joi.string().required(),
  MAX_RETRIES: Joi.number().default(2), 
  TZ: Joi.string(),
});

export default () => ({
  port: parseInt(process.env.PORT, 10) || 4001,
  dbUri: process.env.DB_URI,
  reeApiUrl: process.env.REE_API_URL,
  cronSchedule: process.env.CRON_SCHEDULE || '15 20 * * *',
  fallbackRetryDelay: parseInt(process.env.FALLBACK_RETRY_DELAY, 10) || 30,
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'],
  maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 2,
  timeZone: process.env.TZ || 'Europe/Madrid',
});
  