# 🚀 Luzzia Backend - Guía de Despliegue

## ✅ Estado del Build

El proyecto **está listo para despliegue** con las siguientes verificaciones completadas:

- ✅ **Build de TypeScript**: `pnpm run build` exitoso
- ✅ **Verificación de tipos**: Sin errores de TypeScript
- ✅ **Linting**: Código limpio sin errores de ESLint
- ✅ **Estructura de proyecto**: Archivos compilados en `/dist`
- ✅ **Dockerfiles optimizados**: Producción y desarrollo

## 🔧 Requisitos para Despliegue

### Variables de Entorno Obligatorias

Crear archivo `.env` basado en `.env.example`:

```bash
PORT=4000
DB_URI=mongodb://localhost:27017/luzzia
REE_API_URL=https://api.esios.ree.es/archives/70/download_json?locale=es
CRON_SCHEDULE="15 20 * * *"
FALLBACK_RETRY_DELAY=300
MAX_RETRIES=22
TZ="Europe/Madrid"
```

### Dependencias de Sistema

- Node.js 20+ 
- MongoDB (local o remoto)
- pnpm (recomendado) o npm

## 🐳 Despliegue con Docker

### Desarrollo
```bash
docker-compose up --build
```

### Producción
```bash
# Build de imagen
docker build -t luzzia-backend:latest .

# Ejecutar con variables de entorno
docker run -p 4000:4000 \
  -e DB_URI=mongodb://mongo:27017/luzzia \
  -e REE_API_URL=https://api.esios.ree.es/archives/70/download_json?locale=es \
  luzzia-backend:latest
```

## 📦 Despliegue Tradicional

```bash
# 1. Instalar dependencias
pnpm install

# 2. Build del proyecto
pnpm run build

# 3. Ejecutar en producción
NODE_ENV=production pnpm run start:prod
```

## 🔍 Health Check

La aplicación incluye health check en:
- **Endpoint**: `GET /api/health`
- **Puerto**: 4000 (configurable via PORT)

## 🎯 URLs de Producción

- **API Base**: `http://localhost:4000/api`
- **Health Check**: `http://localhost:4000/api/health`
- **Swagger Docs**: `http://localhost:4000/api/docs` (si habilitado)

## ⚠️ Notas Importantes

1. **MongoDB**: Debe estar disponible antes de iniciar la aplicación
2. **Puerto**: Por defecto 4000, configurable via variable PORT
3. **Timezone**: Configurado para Europe/Madrid
4. **CORS**: Configurado para localhost:3000, 3001, 3002

## 🚨 Troubleshooting

### Error: Cannot connect to MongoDB
- Verificar que MongoDB esté ejecutándose
- Verificar la variable DB_URI
- Verificar conectividad de red

### Error: Port already in use
- Cambiar variable PORT
- Verificar que no hay otra instancia ejecutándose
- `netstat -tlnp | grep :4000`

---

✅ **El proyecto está listo para producción**