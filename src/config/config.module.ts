export default ()=>({
  PORT: parseInt(process.env.PORT, 10) || 3002,
  DB_URI: process.env.DB_URI || '',
  DB_ADAPTER: process.env.DB_ADAPTER || 'mongoose',
  CRON_TIME: process.env.CRON_TIME || '0 0 * * *',
  TZ: process.env.TZ || 'UTC',
})