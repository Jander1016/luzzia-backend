# ============================================
# 🏗️ MULTI-STAGE DOCKERFILE ENTERPRISE
# Optimizado para producción con seguridad y performance
# ============================================

# ============================================
# 📦 BUILDER STAGE - Construcción optimizada
# ============================================
FROM node:lts-alpine AS builder

# Metadata
LABEL maintainer="Jander Gomez <jandergb.30@gmail.com>"
LABEL description="Luzzia Backend Enterprise - Builder Stage"
LABEL version="2.0.0"

# Security: Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Configurar directorio de trabajo
WORKDIR /app

# Security: Actualizar sistema y instalar dependencias de sistema
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        dumb-init \
        curl \
        && rm -rf /var/cache/apk/*

# Instalar pnpm globalmente
RUN npm install -g pnpm@latest

# Copiar archivos de dependencias primero (mejor cache de Docker)
COPY package.json pnpm-lock.yaml* ./

# Instalar dependencias (incluidas dev dependencies para build)
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Build de la aplicación
RUN pnpm run build

# Limpiar dependencias de desarrollo
RUN pnpm prune --prod

# ============================================
# 🚀 PRODUCTION STAGE - Runtime optimizado
# ============================================
FROM node:alpine3.21 AS production

# Metadata
LABEL maintainer="Jander Gomez <jandergb.30@gmail.com>"
LABEL description="Luzzia Backend Enterprise - Production Runtime"
LABEL version="2.0.0"

# Variables de entorno de producción
ENV NODE_ENV=production
ENV PORT=4000
ENV TZ=Europe/Madrid

# Security: Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Security: Actualizar sistema
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        dumb-init \
        curl \
        tzdata \
        && rm -rf /var/cache/apk/*

# Configurar timezone
RUN cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

# Configurar directorio de trabajo
WORKDIR /app

# Instalar pnpm globalmente (como root)
RUN npm install -g pnpm@latest

# Cambiar ownership del directorio a usuario nodejs
RUN chown -R nestjs:nodejs /app

# Cambiar a usuario no-root
USER nestjs

# Copiar archivos de dependencias
COPY --chown=nestjs:nodejs package.json pnpm-lock.yaml* ./

# Instalar solo dependencias de producción
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune

# Copiar código compilado desde builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4000/api/v1/health || exit 1

# Exponer puerto
EXPOSE 4000

# Security: Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicio
CMD ["node", "dist/main.js"]
