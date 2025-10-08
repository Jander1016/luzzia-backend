# ⚡ Luzzia Backend - Smart Energy API# Luzzia Backend ⚡



<div align="center">API desarrollada con [NestJS](https://nestjs.com/) que obtiene, procesa y almacena los precios horarios de la luz en España.  

Los datos provienen de la API oficial de Red Eléctrica de España (REE) y son expuestos mediante endpoints REST que consumirá el frontend.

[![NestJS](https://img.shields.io/badge/NestJS-10.0-red?style=for-the-badge&logo=nestjs)](https://nestjs.com/)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)---

[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)

[![Railway](https://img.shields.io/badge/Railway-Production-purple?style=for-the-badge&logo=railway)](https://railway.app/)## 🚀 Requisitos previos



**API robusta para el monitoreo en tiempo real del mercado eléctrico español**- [Node.js](https://nodejs.org/) v18+

- [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)

[🚀 API en Vivo](https://luzzia-backend-production.up.railway.app/api/v1/documentation) • [📊 Frontend](https://luzzia.es) • [🐛 Reportar Bug](https://github.com/Jander1016/luzzia-backend/issues)- [MongoDB Atlas](https://www.mongodb.com/atlas) o una instancia local de MongoDB



</div>---



---## 📂 Instalación



## 📋 Tabla de ContenidosClonar el repositorio:



- [🎯 Características](#-características)```bash

- [🏗️ Arquitectura](#️-arquitectura)git clone https://github.com/Jander1016/luzzia-backend.git

- [⚡ Instalación Rápida](#-instalación-rápida)cd luzzia-backend

- [🔧 Configuración](#-configuración)pnpm o npm install

- [🚀 Desarrollo](#-desarrollo)```

- [📡 API Endpoints](#-api-endpoints)Crear un archivo `.env` basado en el `.env.example` y configurar las variables de entorno:

- [🕐 Sistema de Cron](#-sistema-de-cron)

- [📊 Base de Datos](#-base-de-datos)```

- [🔒 Seguridad](#-seguridad)PORT=4000

- [🚀 Despliegue](#-despliegue)DB_URI=mongodb+srv://...

- [📈 Monitoreo](#-monitoreo)REE_API_URL=https://api.esios.ree.es/archives/70/download_json?locale=es

CRON_SCHEDULE="15 20 * * *"

---FALLBACK_RETRY_DELAY=30

MAX_RETRIES=2

## 🎯 CaracterísticasTZ="Europe/Madrid"

```

### ⚡ Funcionalidades Core- `PORT`: Puerto en el que se ejecutará el servidor (por defecto 4000).

- **📈 Datos en Tiempo Real**: Integración con API oficial de Red Eléctrica de España (REE)- `DB_URI`: URI de conexión a MongoDB.

- **🕐 Automatización**: Sistema de cron jobs para actualización automática de precios- `REE_API_URL`: URL de la API de Red Eléctrica de España (REE).

- **📊 Almacenamiento Inteligente**: Base de datos MongoDB optimizada para series temporales- `CRON_SCHEDULE`: Horario en formato cron para la tarea programada que obtiene los precios (por defecto "15 20 * * *" para las 20:15h).

- **🔄 Fallback System**: Múltiples estrategias de recuperación ante fallos- `FALLBACK_RETRY_DELAY`: Tiempo en segundos entre reintentos si la obtención de datos falla (por defecto 30 segundos).

- **📡 API REST**: Endpoints documentados con Swagger/OpenAPI- `MAX_RETRIES`: Número máximo de reintentos si la obtención de datos falla (por defecto 2).

- **🛡️ Validación**: Validación robusta de datos con class-validator- `TZ`: Zona horaria para la tarea programada (por defecto "Europe/Madrid").

- **🔍 Logging**: Sistema de logs estructurado para debugging y monitoreo

- **🚀 Performance**: Caché inteligente y optimizaciones de consultas## 📂 Pruevas y Documentación



### 🌟 Valor Técnico  //end point documentación

- **Escalabilidad**: Diseño modular preparado para crecimientoLa API incluye documentación automática generada con Swagger.

- **Confiabilidad**: Sistema de retry y fallback automáticoUna vez que el servidor esté en funcionamiento, se puede acceder a la documentación en:

- **Mantenibilidad**: Código limpio con arquitectura hexagonal```

- **Observabilidad**: Logs detallados y métricas de performancehttp://localhost:4000/api/v1/documentation

```

---## ▶️ Ejecución

Iniciar el servidor en modo desarrollo con recarga automática:

## 🏗️ Arquitectura```bash

pnpm run start:dev

### Stack Tecnológico```

- **[NestJS 10.x](https://nestjs.com/)** - Framework Node.js enterprise-gradeIniciar el servidor en modo producción:

- **[TypeScript](https://www.typescriptlang.org/)** - Tipado estático para JavaScript```bash

- **[MongoDB](https://www.mongodb.com/)** - Base de datos NoSQL para series temporalespnpm run build

- **[Mongoose](https://mongoosejs.com/)** - ODM para MongoDBpnpm run start:prod

- **[@nestjs/schedule](https://docs.nestjs.com/techniques/task-scheduling)** - Sistema de cron jobs```

- **[@nestjs/swagger](https://docs.nestjs.com/openapi/introduction)** - Documentación automática de APIEl servidor estará disponible en `http://localhost:4000` (o el puerto configurado).



### Módulos Principales## 🛠️ Endpoints principales

```- `GET /api/v1/prices/today`: Obtiene los precios horarios de la luz para hoy.

backend/- `GET /api/v1/prices/tomorrow`: Obtiene los precios horarios de la luz para mañana.

├── 📁 src/- `GET /api/v1/prices/history`: Obtiene los datos de la base de datos

│   ├── 📁 modules/- `GET /api/v1/prices/stats`: 

│   │   ├── 📁 prices/          # Gestión de precios eléctricos  - Obtiene estadísticas de precios (mínimo, máximo, promedio) para un rango de fechas.

│   │   ├── 📁 contacts/        # Gestión de contactos  - Parámetros opcionales: `days` (lista según los últimos {days})

│   │   └── 📁 health/          # Health checks del sistema- `POST /api/v1/prices/fethc`: 

│   │  - Fuerza la obtención manual de los precios horarios de la luz desde la API de REE.

│   ├── 📁 shared/  - Útil para pruebas o para actualizar los datos fuera del horario programado.

│   │   ├── 📁 config/          # Configuraciones centralizadas

│   │   ├── 📁 cron/            # Tareas programadas- `POST /api/v1/contacts`: Añade un nuevo contacto a la base de datos

│   │   ├── 📁 common/          # Utilidades comunes- `GET /api/v1/contacts`: Obtiene los datos de los subscritos

│   │   └── 📁 providers/       # Proveedores de servicios

│   │

│   └── 📄 main.ts              # Punto de entrada de la aplicación

```## 🔄 Tarea programada

La aplicación incluye una tarea programada que obtiene automáticamente los precios horarios de la luz todos los días a las 20:15h (configurable mediante la variable `CRON_SCHEDULE`).

---Esta tarea utiliza la librería `node-cron` y se encarga de:

- Obtener los datos de la API de REE.

## ⚡ Instalación Rápida- Procesar y almacenar los datos en MongoDB.

- Manejar errores y reintentos en caso de fallos.

### Prerrequisitos- Registrar logs de las operaciones realizadas.

```bash

node >= 18.0.0## 🌟 Contribuciones

pnpm >= 8.0.0  # Recomendado¡Las contribuciones son bienvenidas! Si deseas contribuir, por favor sigue estos pasos:

mongodb >= 7.0  # Atlas o local1. Haz un fork del repositorio.

```2. Crea una rama para tu feature o bugfix (`git checkout -b feature/nueva-feature`).

3. Realiza tus cambios y haz commit (`git commit -m 'Agrega nueva feature'`).

### 1. Clonar el repositorio4. Haz push a tu rama (`git push origin feature/nueva-feature`).

```bash5. Abre un Pull Request en este repositorio.

git clone https://github.com/Jander1016/luzzia-backend.git

cd luzzia-backend## 🤝 Contacto

```Para cualquier duda o sugerencia, puedes contactarme en:

- Email: jandergb.30@gmail.com

### 2. Instalar dependencias- Instagram: [Jander Gomez](https://www.linkedin.com/in/jandergomezbarrueta)

```bash---

pnpm install

```## ⚠️ Aviso Legal

Este proyecto es de carácter educativo y no está afiliado ni respaldado por Red Eléctrica de España (REE).

### 3. Configurar variables de entornoEl uso de los datos obtenidos a través de esta API es bajo la responsabilidad del usuario. Se recomienda verificar la exactitud y actualidad de los datos directamente con REE para cualquier aplicación crítica o comercial. 

```bash

cp .env.example .env

```

### 4. Ejecutar en desarrollo
```bash
pnpm run start:dev
```

🎉 **¡API funcionando!** Abre [http://localhost:4000/api/v1/documentation](http://localhost:4000/api/v1/documentation)

---

## 🔧 Configuración

### Variables de Entorno Principales

```env
# Servidor
PORT=4000
NODE_ENV=development

# Base de Datos
DB_URI=mongodb+srv://user:password@cluster.mongodb.net/luzziadb

# APIs Externas
REE_API_URL=https://api.esios.ree.es/archives/70/download_json?locale=es
REE_API_KEY=
REE_BEARER_TOKEN=

# CORS y Seguridad
ALLOWED_ORIGINS=http://localhost:3000,https://luzzia.es

# Cron Jobs
CRON_SCHEDULE="15 20 * * *"        # Ejecución principal: 20:15 diario
CRON_RETRY_SCHEDULE="15 23 * * *"  # Retry: 23:15 si falla
TZ="Europe/Madrid"                 # Zona horaria

# Configuraciones
CACHE_TTL_HOURS=1
LOG_LEVEL=info
MAX_RETRIES=3
```

### Configuración de MongoDB

```javascript
// Esquema de precios optimizado
{
  _id: ObjectId,
  date: Date,        // Fecha del precio (00:00:00)
  hour: Number,      // Hora (0-23)
  price: Number,     // Precio en €/kWh
  isFallback: Boolean, // Si es dato de fallback
  timestamp: Date    // Cuándo se guardó el dato
}

// Índices para performance
db.prices.createIndex({ "date": 1, "hour": 1 }, { unique: true })
db.prices.createIndex({ "timestamp": -1 })
```

---

## 🚀 Desarrollo

### Comandos Disponibles

```bash
# Desarrollo
pnpm start:dev        # Servidor con hot reload
pnpm start:debug      # Modo debug
pnpm start:prod       # Modo producción

# Build
pnpm build           # Compilar TypeScript
pnpm test            # Tests unitarios
pnpm test:e2e        # Tests end-to-end
pnpm lint            # ESLint

# Utilidades
pnpm format          # Prettier formatting
```

### Estructura de Desarrollo
1. **Módulos**: Cada funcionalidad en su módulo independiente
2. **DTOs**: Validación de entrada con class-validator
3. **Entities**: Modelos de datos con Mongoose
4. **Services**: Lógica de negocio
5. **Controllers**: Endpoints REST con documentación Swagger

---

## 📡 API Endpoints

### 📊 Precios (`/api/v1/prices`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/today` | Precios del día actual (24 horas) |
| `GET` | `/tomorrow` | Precios del día siguiente |
| `GET` | `/history?days=7` | Histórico de precios |
| `GET` | `/stats?days=30` | Estadísticas de precios |
| `GET` | `/dashboard-stats` | Métricas para dashboard |
| `GET` | `/hourly?period=today` | Precios agrupados por período |
| `GET` | `/recommendations` | Recomendaciones de uso |
| `POST` | `/fetch` | Forzar actualización manual |
| `GET` | `/health` | Estado del sistema de precios |

### 📝 Contactos (`/api/v1/contacts`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/` | Crear nuevo contacto |
| `GET` | `/` | Listar contactos (admin) |

### 🔍 Documentación
- **Swagger UI**: `/api/v1/documentation`
- **JSON Schema**: `/api/v1/documentation-json`

---

## 🕐 Sistema de Cron

### Programación Automática

```typescript
// Configuración de tareas programadas
{
  mainSchedule: "15 20 * * *",      // 20:15 diario (hora principal)
  retrySchedule: "15 23 * * *",     // 23:15 si no hay datos
  resetSchedule: "0 0 * * *",       // 00:00 reset diario
  timezone: "Europe/Madrid"
}
```

### Estrategias de Fallback
1. **Retry Automático**: Si falla a las 20:15, reintenta a las 23:15
2. **Datos Anteriores**: Si no hay datos nuevos, usa el día anterior
3. **Logging Detallado**: Registro completo de todas las operaciones
4. **Flags de Estado**: Control de ejecución para evitar duplicados

### Monitoreo de Cron
```bash
# Logs del sistema de cron
tail -f logs/cron.log

# Estado actual
curl https://luzzia-backend-production.up.railway.app/api/v1/prices/health
```

---

## 📊 Base de Datos

### Esquema de Datos

```typescript
// Price Entity
interface Price {
  _id: ObjectId;
  date: Date;           // Fecha base (00:00:00)
  hour: number;         // Hora específica (0-23)  
  price: number;        // Precio en €/kWh
  isFallback: boolean;  // Indicador de datos de fallback
  timestamp: Date;      // Timestamp de inserción
}

// Contact Entity  
interface Contact {
  _id: ObjectId;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
}
```

### Optimizaciones de Performance
- **Índices Compuestos**: `{date: 1, hour: 1}` para consultas rápidas
- **TTL Indexes**: Limpieza automática de datos antiguos
- **Agregaciones**: Pipelines optimizados para estadísticas
- **Conexión Pooling**: Reutilización eficiente de conexiones

---

## 🔒 Seguridad

### Configuraciones CORS
```typescript
// Desarrollo: todos los origins permitidos
// Producción: origins específicos validados
allowedOrigins: [
  'https://luzzia.es',
  'https://luzzia-frontend.vercel.app',
  'http://localhost:3000'
]
```

### Validación de Datos
- **Class Validator**: Validación automática de DTOs
- **Transform Pipes**: Transformación segura de datos
- **Global Exception Filter**: Manejo consistente de errores

### Headers de Seguridad
- Rate limiting por IP
- Helmet.js para headers seguros
- Validación estricta de tipos

---

## 🚀 Despliegue

### Railway (Producción Actual)
```bash
# Deploy automático con GitHub
# 1. Conectar repositorio en railway.app
# 2. Configurar variables de entorno
# 3. Deploy automático en cada push a main
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install --only=production
COPY . .
RUN pnpm build
EXPOSE 4000
CMD ["pnpm", "start:prod"]
```

### Variables de Producción
```env
NODE_ENV=production
PORT=4000
DB_URI=mongodb+srv://prod-cluster...
ALLOWED_ORIGINS=https://luzzia.es,https://luzzia-frontend.vercel.app
LOG_LEVEL=warn
```

---

## 📈 Monitoreo

### Health Checks
```bash
# Estado general de la API
GET /api/v1/health

# Estado específico del sistema de precios
GET /api/v1/prices/health

# Respuesta esperada
{
  "status": "healthy",
  "timestamp": "2025-10-08T10:15:00.000Z",
  "timezone": "Europe/Madrid",
  "cronSchedule": "15 20 * * *",
  "data": {
    "today": { "count": 24, "hasData": true },
    "yesterday": { "count": 24, "hasData": true }
  }
}
```

### Logs Estructurados
- **Niveles**: error, warn, info, debug
- **Contexto**: Módulo, función, timestamp
- **Performance**: Tiempo de respuesta de APIs
- **Errores**: Stack traces completos

### Métricas Clave
- **Uptime**: Disponibilidad del servicio
- **Response Time**: Latencia de endpoints
- **Error Rate**: Tasa de errores por endpoint
- **Cron Success Rate**: Éxito de tareas programadas

---

## 🤝 Contribución

### Flujo de Desarrollo
1. **Fork** del repositorio
2. **Feature branch**: `git checkout -b feature/nueva-funcionalidad`
3. **Desarrollo** con tests incluidos
4. **Testing**: `pnpm test` y `pnpm test:e2e`
5. **Pull Request** con descripción detallada

### Estándares de Código
- **TypeScript estricto**: Tipado completo
- **ESLint + Prettier**: Formateo consistente
- **Convenciones NestJS**: Arquitectura modular
- **Testing**: Cobertura mínima 80%

---

## 📄 Licencia

Licenciado bajo **MIT License**.

```
Copyright (c) 2025 Jander Gomez

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software")...
```

---

## 🙏 Agradecimientos

- **⚡ Red Eléctrica de España**: Por la API pública de datos energéticos
- **🚀 NestJS Team**: Por el framework excepcional
- **🍃 MongoDB**: Por la base de datos flexible y potente
- **🚂 Railway**: Por el hosting confiable y fácil despliegue

---

<div align="center">

**¿Te parece útil este proyecto? ¡Dale una ⭐ en GitHub!**

[🌐 API Documentation](https://luzzia-backend-production.up.railway.app/api/v1/documentation) • [📊 Frontend](https://luzzia.es) • [📧 Contacto](https://luzzia.es/contact)

Desarrollado con ❤️ en España 🇪🇸

</div>