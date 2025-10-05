# 🌟 Luzzia Backend

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" />
  <img src="https://img.shields.io/badge/NestJS-10.x-red.svg" />
  <img src="https://img.shields.io/badge/MongoDB-8.x-green.svg" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue.svg" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" />
</div>

## 📖 Descripción

**Luzzia Backend** es una API REST robusta desarrollada con **NestJS** que proporciona acceso a datos de precios de electricidad en tiempo real en España. La aplicación obtiene, procesa y almacena datos de precios horarios desde la API oficial de Red Eléctrica de España (REE), ofreciendo estadísticas inteligentes y recomendaciones para optimización del consumo energético.

### ✨ Características Principales

- 🔌 **Precios en Tiempo Real**: Obtención automática de precios horarios de electricidad
- 📊 **Dashboard Inteligente**: Estadísticas avanzadas y métricas de ahorro
- 🤖 **Recomendaciones IA**: Sugerencias inteligentes para uso óptimo de electrodomésticos
- 🔄 **WebSocket**: Actualizaciones en tiempo real via WebSocket
- ⏰ **Automatización**: Cron jobs para sincronización automática de datos
- 📚 **Documentación API**: Swagger UI integrado
- 🐳 **Dockerizado**: Despliegue simplificado con Docker

---

## 🏗️ Arquitectura

```
src/
├── modules/
│   ├── prices/           # Módulo principal de precios
│   │   ├── dto/         # Data Transfer Objects
│   │   ├── entities/    # Entidades MongoDB
│   │   ├── prices.controller.ts
│   │   ├── prices.service.ts
│   │   ├── prices.gateway.ts    # WebSocket Gateway
│   │   └── prices.module.ts
│   └── contacts/        # Módulo de contactos
├── shared/
│   ├── config/         # Configuración centralizada
│   ├── common/         # Utilidades compartidas
│   └── cron/          # Tareas programadas
└── main.ts            # Punto de entrada
```

---

## 🚀 Inicio Rápido

### Prerrequisitos

- **Node.js** v18+ ([Descargar](https://nodejs.org/))
- **pnpm** o npm ([Instalar pnpm](https://pnpm.io/installation))
- **MongoDB Atlas** o instancia local ([Configurar](https://www.mongodb.com/atlas))

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/Jander1016/luzzia-backend.git
cd luzzia-backend

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones
```

### Configuración Ambiental

```env
# Servidor
PORT=4000

# Base de Datos
DB_URI=mongodb+srv://user:password@cluster.mongodb.net/luzzia

# API Externa
REE_API_URL=https://api.esios.ree.es/archives/70/download_json?locale=es

# Tareas Programadas
CRON_SCHEDULE="15 20 * * *"
TZ="Europe/Madrid"

# Configuración de Reintentos
FALLBACK_RETRY_DELAY=30
MAX_RETRIES=2
```

### Ejecución

```bash
# Desarrollo
pnpm run start:dev

# Producción
pnpm run build
pnpm run start:prod

# Docker
docker build -t luzzia-backend .
docker run -p 4000:4000 luzzia-backend
```

---

## 📡 API Endpoints

### 🏠 Dashboard y Estadísticas

#### `GET /api/v1/prices/dashboard-stats`
Obtiene estadísticas principales para el dashboard.

**Respuesta:**
```json
{
  "currentPrice": 0.12,
  "nextHourPrice": 0.15,
  "priceChangePercentage": 25.0,
  "monthlySavings": 15.5,
  "comparisonType": "tarifa fija",
  "lastUpdated": "2025-10-01T12:00:00Z"
}
```

#### `GET /api/v1/prices/hourly?period=today|week|month`
Obtiene precios por horas según período.

**Parámetros:**
- `period`: `today`, `week`, `month` (default: `today`)

**Respuesta:**
```json
{
  "prices": [
    {
      "timestamp": "2025-10-01T00:00:00Z",
      "hour": "00",
      "price": 0.08,
      "level": "bajo",
      "currency": "EUR"
    }
  ],
  "average": 0.125,
  "min": 0.05,
  "max": 0.25
}
```

### 🤖 Recomendaciones Inteligentes

#### `GET /api/v1/prices/recommendations`
Obtiene recomendaciones para uso óptimo de electrodomésticos.

**Respuesta:**
```json
{
  "recommendations": [
    {
      "type": "ideal",
      "title": "Momento ideal",
      "description": "Pon la lavadora ahora",
      "timeRange": "Próximas 2 horas",
      "percentage": "40%",
      "appliance": "lavadora",
      "savingsPercentage": 25
    }
  ],
  "dailyTip": "Los precios más baratos serán entre las 14:00 y 16:00"
}
```

### 📊 Endpoints Adicionales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/v1/prices/today` | Precios de hoy |
| `GET` | `/api/v1/prices/history?days=7` | Histórico de precios |
| `GET` | `/api/v1/prices/stats?days=30` | Estadísticas agregadas |
| `POST` | `/api/v1/prices/fetch` | Actualización manual |
| `GET` | `/api/v1/contacts` | Lista de contactos |
| `POST` | `/api/v1/contacts` | Crear contacto |

---

## 🔄 WebSocket Real-time

### Conexión
```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:4000/prices');

socket.on('price_update', (data) => {
  console.log('Actualización de precio:', data);
  // { type: 'price_update', data: { currentPrice: 0.12, timestamp: '...', level: 'medio' } }
});
```

### Eventos Disponibles
- `price_update`: Actualizaciones de precios cada minuto
- `connection`: Confirmación de conexión
- `disconnect`: Notificación de desconexión

---

## ⚙️ Automatización

### Cron Jobs

| Horario | Descripción |
|---------|-------------|
| `20:15` | Obtención principal de precios diarios |
| `23:15` | Reintento en caso de fallo |

### Lógica de Fallback
1. **20:15**: Intento principal desde API de REE
2. **23:15**: Reintento automático si el primero falló
3. **Fallback**: Uso de datos del día anterior como último recurso

---

## 📚 Documentación

### Swagger UI
Accede a la documentación interactiva:
```
http://localhost:4000/api/v1/documentation
```

### Recursos Adicionales
- [Documentación NestJS](https://docs.nestjs.com/)
- [API REE España](https://www.esios.ree.es/)
- [MongoDB Atlas](https://docs.atlas.mongodb.com/)

---

## 🧪 Testing

```bash
# Tests unitarios
pnpm run test

# Tests con coverage
pnpm run test:cov

# Tests e2e
pnpm run test:e2e

# Watch mode
pnpm run test:watch
```

---

## � Docker

### Dockerfile Optimizado
```dockerfile
# Multi-stage build para optimización
FROM node:lts-alpine AS builder
# ... build stage

FROM node:lts-alpine AS runner
# ... production stage
```

### Docker Compose
```yaml
version: '3.8'
services:
  luzzia-backend:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
    depends_on:
      - mongodb
```

---

## 🛡️ Seguridad

### Implementado
- ✅ Validación de inputs con class-validator
- ✅ CORS configurado
- ✅ Sanitización básica de datos
- ✅ Variables de entorno protegidas

### Recomendado para Producción
- 🔒 Rate limiting
- 🔒 Helmet para headers de seguridad  
- 🔒 Autenticación JWT
- 🔒 Logs de auditoría

---

## 📈 Performance

### Optimizaciones Actuales
- Índices MongoDB optimizados
- Conexión pool configurada
- Caché de configuración

### Mejoras Sugeridas
- Redis para caché de sesión
- Paginación en endpoints
- Compresión gzip
- CDN para assets estáticos

---

## 🤝 Contribución

### Flujo de Trabajo
1. **Fork** el repositorio
2. **Crea** una rama feature (`git checkout -b feature/amazing-feature`)
3. **Commit** tus cambios (`git commit -m 'Add: amazing feature'`)
4. **Push** a la rama (`git push origin feature/amazing-feature`)
5. **Abre** un Pull Request

### Estándares de Código
- **ESLint** + **Prettier** configurados
- **Conventional Commits** preferidos
- **Tests** requeridos para nuevas features
- **TypeScript** estricto

---

## 📞 Soporte

### Contacto
- **Email**: [jandergb.30@gmail.com](mailto:jandergb.30@gmail.com)
- **LinkedIn**: [Jander Gomez](https://www.linkedin.com/in/jandergomezbarrueta)
- **GitHub**: [@Jander1016](https://github.com/Jander1016)

### Issues y Bug Reports
Por favor, utiliza las [GitHub Issues](https://github.com/Jander1016/luzzia-backend/issues) para reportar bugs o solicitar features.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

## ⚠️ Aviso Legal

Este proyecto es de carácter **educativo** y **no comercial**. No está afiliado ni respaldado por Red Eléctrica de España (REE). 

**Descargo de responsabilidad**: El uso de los datos obtenidos a través de esta API es bajo la responsabilidad del usuario. Se recomienda verificar la exactitud y actualidad de los datos directamente con REE para cualquier aplicación crítica o comercial.

---

<div align="center">
  <p>⭐ Si este proyecto te resulta útil, ¡considera darle una estrella!</p>
  <p>Desarrollado con ❤️ por <a href="https://github.com/Jander1016">Jander Gomez</a></p>
</div> 


