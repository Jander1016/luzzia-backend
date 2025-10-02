#!/bin/bash
# ============================================
# 🚀 LUZZIA DEVELOPMENT SCRIPTS
# Scripts para facilitar el desarrollo
# ============================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 🏁 START DEVELOPMENT STACK
# ============================================
start_dev() {
    echo -e "${BLUE}🚀 Iniciando stack de desarrollo Luzzia...${NC}"
    
    # Verificar que Docker esté corriendo
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker no está corriendo. Por favor inicia Docker primero.${NC}"
        exit 1
    fi
    
    # Crear network si no existe
    docker network create luzzia-development 2>/dev/null || true
    
    # Levantar servicios
    echo -e "${YELLOW}📦 Levantando servicios...${NC}"
    docker-compose up -d --build
    
    echo -e "${GREEN}✅ Stack de desarrollo iniciado!${NC}"
    echo -e "${BLUE}📊 URLs disponibles:${NC}"
    echo -e "  🚀 Backend API: http://localhost:4000/api/v1"
    echo -e "  📚 Documentación: http://localhost:4000/api/v1/documentation"
    echo -e "  🏥 Health Check: http://localhost:4000/api/v1/health"
    echo -e "  📈 Prometheus: http://localhost:9090"
    echo -e "  📊 Grafana: http://localhost:3001 (admin/luzzia-grafana)"
    echo -e "  🍃 MongoDB UI: http://localhost:8081 (admin/luzzia-mongo)"
    echo -e "  🔴 Redis UI: http://localhost:8082 (admin/luzzia-redis)"
    echo -e "  🌐 Traefik Dashboard: http://localhost:8080"
}

# ============================================
# 🛑 STOP DEVELOPMENT STACK
# ============================================
stop_dev() {
    echo -e "${YELLOW}🛑 Deteniendo stack de desarrollo...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ Stack detenido!${NC}"
}

# ============================================
# 🔄 RESTART DEVELOPMENT STACK
# ============================================
restart_dev() {
    echo -e "${YELLOW}🔄 Reiniciando stack de desarrollo...${NC}"
    docker-compose down
    docker-compose up -d --build
    echo -e "${GREEN}✅ Stack reiniciado!${NC}"
}

# ============================================
# 📊 SHOW STATUS
# ============================================
status() {
    echo -e "${BLUE}📊 Estado del stack Luzzia:${NC}"
    docker-compose ps
    echo ""
    echo -e "${BLUE}🌐 Servicios de red:${NC}"
    docker network ls | grep luzzia
    echo ""
    echo -e "${BLUE}💾 Volúmenes:${NC}"
    docker volume ls | grep luzzia
}

# ============================================
# 📋 SHOW LOGS
# ============================================
logs() {
    service=${1:-luzzia-backend}
    echo -e "${BLUE}📋 Logs de ${service}:${NC}"
    docker-compose logs -f $service
}

# ============================================
# 🧹 CLEANUP
# ============================================
cleanup() {
    echo -e "${YELLOW}🧹 Limpiando recursos de desarrollo...${NC}"
    
    read -p "¿Estás seguro de que quieres eliminar todos los datos? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v --remove-orphans
        docker system prune -f
        echo -e "${GREEN}✅ Limpieza completada!${NC}"
    else
        echo -e "${YELLOW}⚠️  Limpieza cancelada${NC}"
    fi
}

# ============================================
# 💾 BACKUP DATA
# ============================================
backup() {
    echo -e "${BLUE}💾 Creando backup de datos...${NC}"
    timestamp=$(date +"%Y%m%d_%H%M%S")
    backup_dir="./backups/${timestamp}"
    
    mkdir -p $backup_dir
    
    # Backup MongoDB
    echo -e "${YELLOW}📦 Backing up MongoDB...${NC}"
    docker exec luzzia-mongodb-dev mongodump --out /tmp/backup
    docker cp luzzia-mongodb-dev:/tmp/backup $backup_dir/mongodb
    
    # Backup Redis
    echo -e "${YELLOW}📦 Backing up Redis...${NC}"
    docker exec luzzia-redis-dev redis-cli BGSAVE
    docker cp luzzia-redis-dev:/data/dump.rdb $backup_dir/redis/
    
    echo -e "${GREEN}✅ Backup creado en: ${backup_dir}${NC}"
}

# ============================================
# 🔧 MAIN SCRIPT LOGIC
# ============================================
case "$1" in
    "start")
        start_dev
        ;;
    "stop")
        stop_dev
        ;;
    "restart")
        restart_dev
        ;;
    "status")
        status
        ;;
    "logs")
        logs $2
        ;;
    "cleanup")
        cleanup
        ;;
    "backup")
        backup
        ;;
    *)
        echo -e "${BLUE}🐳 Luzzia Development Scripts${NC}"
        echo ""
        echo -e "${YELLOW}Uso: $0 {start|stop|restart|status|logs|cleanup|backup}${NC}"
        echo ""
        echo -e "  ${GREEN}start${NC}    - Iniciar stack de desarrollo"
        echo -e "  ${GREEN}stop${NC}     - Detener stack de desarrollo"
        echo -e "  ${GREEN}restart${NC}  - Reiniciar stack de desarrollo"
        echo -e "  ${GREEN}status${NC}   - Mostrar estado de servicios"
        echo -e "  ${GREEN}logs${NC}     - Mostrar logs (opcional: nombre del servicio)"
        echo -e "  ${GREEN}cleanup${NC}  - Limpiar todos los recursos"
        echo -e "  ${GREEN}backup${NC}   - Crear backup de datos"
        echo ""
        echo -e "${BLUE}Ejemplos:${NC}"
        echo -e "  $0 start                    # Iniciar todo"
        echo -e "  $0 logs luzzia-backend      # Ver logs del backend"
        echo -e "  $0 logs redis               # Ver logs de Redis"
        ;;
esac