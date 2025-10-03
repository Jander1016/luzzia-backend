# 🐳 Docker Deployment Guide - Luzzia Backend Enterprise

## 📋 Tabla de Contenidos

- [🚀 Inicio Rápido](#-inicio-rápido)
- [🏗️ Desarrollo Local](#️-desarrollo-local)
- [🌟 Producción](#-producción)
- [📊 Monitoreo](#-monitoreo)
- [🔧 Configuración](#-configuración)
- [🛠️ Troubleshooting](#️-troubleshooting)

---

## 🚀 Inicio Rápido

### **Prerequisitos**
- **Docker** v20+ ([Instalar](https://docs.docker.com/get-docker/))
- **Docker Compose** v2+ ([Instalar](https://docs.docker.com/compose/install/))
- **4GB RAM** mínimo para el stack completo
- **Puertos disponibles**: 4000, 3001, 6379, 27017, 8080, 8081, 8082, 9090

### **Clonar y Configurar**

```bash
# Clonar repositorio
git clone https://github.com/Jander1016/luzzia-backend.git
cd luzzia-backend

# Copiar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Hacer ejecutable el script de desarrollo (Linux/Mac)
chmod +x scripts/dev.sh
```

---

## 🏗️ Desarrollo Local

### **Stack Completo de Desarrollo**

```bash
# Iniciar todo el stack
docker-compose up -d --build

# O usar el script helper
./scripts/dev.sh start
```

### **Servicios Disponibles**

| Servicio | URL | Credenciales | Descripción |
|----------|-----|--------------|-------------|
| 🚀 **Backend API** | http://localhost:4000/api/v1 | - | API principal |
| 📚 **Swagger Docs** | http://localhost:4000/api/v1/documentation | - | Documentación interactiva |
| 🏥 **Health Check** | http://localhost:4000/api/v1/health | - | Estado del sistema |
| 📊 **Grafana** | http://localhost:3001 | admin/luzzia-grafana | Dashboards |
| 📈 **Prometheus** | http://localhost:9090 | - | Métricas |
| 🍃 **MongoDB UI** | http://localhost:8081 | admin/luzzia-mongo | Base de datos |
| 🔴 **Redis UI** | http://localhost:8082 | admin/luzzia-redis | Cache |
| 🌐 **Traefik** | http://localhost:8080 | - | Proxy dashboard |

### **Comandos de Desarrollo**

```bash
# Ver estado de servicios
docker-compose ps
./scripts/dev.sh status

# Ver logs
docker-compose logs -f luzzia-backend
./scripts/dev.sh logs luzzia-backend

# Reiniciar servicios
docker-compose restart
./scripts/dev.sh restart

# Detener todo
docker-compose down
./scripts/dev.sh stop

# Limpiar todo (⚠️ elimina datos)
./scripts/dev.sh cleanup
```

### **Desarrollo con Hot Reload**

Para desarrollo con recarga automática, montar volúmenes:

```yaml
# En docker-compose.override.yml
services:
  luzzia-backend:
    volumes:
      - ./src:/app/src:ro
      - ./dist:/app/dist
    command: npm run start:dev
```

---

## 🌟 Producción

### **Configuración de Producción**

```bash
# Copiar configuración de producción
cp .env.production .env.prod

# Editar variables críticas
nano .env.prod
```

### **Variables Críticas de Producción**

```bash
# Base de datos (MongoDB Atlas recomendado)
DB_URI=mongodb+srv://user:pass@cluster.mongodb.net/luzzia-prod

# Redis cache
REDIS_PASSWORD=tu-password-redis-super-seguro

# Dominios
API_DOMAIN=api.tu-dominio.com
ALLOWED_ORIGINS=https://tu-app.com,https://www.tu-app.com

# SSL (Cloudflare)
CLOUDFLARE_EMAIL=tu-email@domain.com
CLOUDFLARE_API_KEY=tu-api-key

# Autenticación Traefik
TRAEFIK_AUTH=admin:$$2y$$10$$...hash-password...
```

### **Despliegue en Producción**

```bash
# Construir imagen de producción
docker build -t luzzia/backend:latest .

# Desplegar con compose de producción
docker-compose -f docker-compose.prod.yml up -d

# Verificar servicios
docker-compose -f docker-compose.prod.yml ps
curl https://api.tu-dominio.com/api/v1/health
```

### **Despliegue con Docker Swarm**

```bash
# Inicializar swarm
docker swarm init

# Crear secrets
echo "tu-db-uri" | docker secret create db_uri -
echo "tu-redis-password" | docker secret create redis_password -

# Desplegar stack
docker stack deploy -c docker-compose.prod.yml luzzia

# Escalar servicios
docker service scale luzzia_luzzia-backend=3
```

---

## 📊 Monitoreo

### **Métricas Disponibles**

**Endpoint**: `http://localhost:4000/api/v1/metrics`

```bash
# Métricas de aplicación
curl http://localhost:4000/api/v1/metrics

# Health checks
curl http://localhost:4000/api/v1/health
curl http://localhost:4000/api/v1/health/readiness
curl http://localhost:4000/api/v1/health/liveness
```

### **Dashboards de Grafana**

Importar dashboards predefinidos:

1. **Node.js Application Metrics** (ID: 11159)
2. **Redis Dashboard** (ID: 763)
3. **MongoDB Dashboard** (ID: 2583)
4. **Docker Container Metrics** (ID: 193)

### **Alertas de Prometheus**

Configurar alertas en `docker/prometheus/alerts.yml`:

```yaml
groups:
  - name: luzzia.rules
    rules:
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 500000000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
```

---

## 🔧 Configuración

### **Variables de Entorno Completas**

| Variable | Desarrollo | Producción | Descripción |
|----------|------------|------------|-------------|
| `NODE_ENV` | development | production | Entorno de ejecución |
| `PORT` | 4000 | 4000 | Puerto de la aplicación |
| `DB_URI` | mongodb://mongodb:27017/luzzia-dev | mongodb+srv://... | URI de MongoDB |
| `REDIS_HOST` | redis | redis | Host de Redis |
| `REDIS_PASSWORD` | luzzia-cache-secret | *** | Password de Redis |
| `ALLOWED_ORIGINS` | http://localhost:3000 | https://tu-app.com | CORS origins |

### **Configuración de Performance**

```yaml
# En docker-compose.yml
services:
  luzzia-backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### **Configuración de Seguridad**

```yaml
# Seguridad en producción
security_opt:
  - no-new-privileges:true
read_only: true
tmpfs:
  - /tmp
user: "1001:1001"
```

---

## 🛠️ Troubleshooting

### **Problemas Comunes**

#### **Error de Conexión a MongoDB**

```bash
# Verificar conectividad
docker exec luzzia-backend-dev curl -f http://mongodb:27017

# Ver logs de MongoDB
docker-compose logs mongodb

# Reiniciar MongoDB
docker-compose restart mongodb
```

#### **Error de Conexión a Redis**

```bash
# Verificar Redis
docker exec luzzia-redis-dev redis-cli ping

# Ver configuración
docker exec luzzia-redis-dev cat /usr/local/etc/redis/redis.conf

# Limpiar cache
docker exec luzzia-redis-dev redis-cli FLUSHALL
```

#### **Problemas de Performance**

```bash
# Ver uso de recursos
docker stats

# Analizar logs de aplicación
docker-compose logs -f luzzia-backend | grep -E "(ERROR|WARN|SLOW)"

# Verificar health checks
curl http://localhost:4000/api/v1/health
```

### **Comandos de Debugging**

```bash
# Entrar al contenedor
docker exec -it luzzia-backend-dev sh

# Ver variables de entorno
docker exec luzzia-backend-dev env

# Ver procesos
docker exec luzzia-backend-dev ps aux

# Ver uso de memoria
docker exec luzzia-backend-dev cat /proc/meminfo

# Verificar conectividad de red
docker network ls
docker network inspect luzzia-development
```

### **Logs Estructurados**

```bash
# Logs con timestamps
docker-compose logs -t luzzia-backend

# Logs en tiempo real con filtros
docker-compose logs -f luzzia-backend | jq -r '.level + ": " + .message'

# Logs de errores únicamente
docker-compose logs luzzia-backend | grep -E "(ERROR|FATAL)"
```

### **Backup y Restore**

```bash
# Backup automático
./scripts/dev.sh backup

# Backup manual de MongoDB
docker exec luzzia-mongodb-dev mongodump --out /tmp/backup
docker cp luzzia-mongodb-dev:/tmp/backup ./backups/

# Restore MongoDB
docker cp ./backups/backup luzzia-mongodb-dev:/tmp/
docker exec luzzia-mongodb-dev mongorestore /tmp/backup
```

---

## 🚨 Monitoreo de Producción

### **Health Checks Automáticos**

```bash
# Script de monitoreo
#!/bin/bash
while true; do
  if ! curl -f http://localhost:4000/api/v1/health; then
    echo "❌ Health check failed at $(date)"
    # Enviar alerta
  fi
  sleep 30
done
```

### **Métricas Críticas**

- **Response Time**: < 200ms promedio
- **Memory Usage**: < 512MB
- **CPU Usage**: < 50%
- **Error Rate**: < 1%
- **Uptime**: > 99.9%

---

## 📞 Soporte

- 📧 **Email**: jandergb.30@gmail.com
- 💼 **LinkedIn**: [Jander Gomez](https://www.linkedin.com/in/jandergomezbarrueta)
- 🐙 **GitHub Issues**: [Reportar problema](https://github.com/Jander1016/luzzia-backend/issues)

---

<div align="center">
  <h3>🐳 Docker Enterprise Ready</h3>
  <p>Desarrollado con ❤️ para <strong>escalabilidad</strong> y <strong>performance</strong></p>
</div>