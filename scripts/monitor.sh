#!/bin/bash

# OWU Palace HRMS - System Monitoring Script
# This script monitors the health of all Docker containers and system resources

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/logs/monitor.log"
ALERT_LOG="$PROJECT_DIR/logs/alerts.log"

# Containers to monitor
CONTAINERS=("owu-hrms-db-prod" "owu-hrms-backend-prod" "owu-hrms-frontend-prod" "owu-hrms-nginx")

# Thresholds
DISK_THRESHOLD=80
MEMORY_THRESHOLD=80
CPU_THRESHOLD=80

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Alert function
alert() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - ALERT: $1" | tee -a "$ALERT_LOG"
    log "${RED}ALERT: $1${NC}"
    
    # Optional: Send notification (uncomment and configure as needed)
    # send_alert_notification "$1"
}

# Success function
success() {
    log "${GREEN}✅ $1${NC}"
}

# Warning function
warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Info function
info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# Create necessary directories
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$ALERT_LOG")"

info "Starting system monitoring check..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    alert "Docker is not running or not accessible"
    exit 1
fi

# Check container health
info "Checking container health..."
ALL_CONTAINERS_HEALTHY=true

for container in "${CONTAINERS[@]}"; do
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container.*Up"; then
        # Container is running, check health status
        HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
        
        if [[ "$HEALTH_STATUS" == "healthy" ]] || [[ "$HEALTH_STATUS" == "no-healthcheck" ]]; then
            success "Container $container is running and healthy"
        elif [[ "$HEALTH_STATUS" == "unhealthy" ]]; then
            alert "Container $container is running but unhealthy"
            ALL_CONTAINERS_HEALTHY=false
        elif [[ "$HEALTH_STATUS" == "starting" ]]; then
            warning "Container $container is starting up"
        else
            warning "Container $container health status: $HEALTH_STATUS"
        fi
    else
        alert "Container $container is not running!"
        ALL_CONTAINERS_HEALTHY=false
    fi
done

if $ALL_CONTAINERS_HEALTHY; then
    success "All containers are healthy"
fi

# Check disk space
info "Checking disk space..."
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [[ $DISK_USAGE -gt $DISK_THRESHOLD ]]; then
    alert "Disk usage is ${DISK_USAGE}% (threshold: ${DISK_THRESHOLD}%)"
else
    success "Disk usage is ${DISK_USAGE}% (healthy)"
fi

# Check memory usage
info "Checking memory usage..."
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [[ $MEMORY_USAGE -gt $MEMORY_THRESHOLD ]]; then
    alert "Memory usage is ${MEMORY_USAGE}% (threshold: ${MEMORY_THRESHOLD}%)"
else
    success "Memory usage is ${MEMORY_USAGE}% (healthy)"
fi

# Check CPU usage (5-minute average)
info "Checking CPU usage..."
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
if (( $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc -l) )); then
    alert "CPU usage is ${CPU_USAGE}% (threshold: ${CPU_THRESHOLD}%)"
else
    success "CPU usage is ${CPU_USAGE}% (healthy)"
fi

# Check Docker container resource usage
info "Checking container resource usage..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | while read line; do
    if [[ "$line" != *"CONTAINER"* ]]; then
        log "Container stats: $line"
    fi
done

# Check database connectivity
info "Checking database connectivity..."
if docker exec owu-hrms-db-prod pg_isready -U postgres > /dev/null 2>&1; then
    success "Database is accepting connections"
else
    alert "Database is not accepting connections"
fi

# Check backend API health
info "Checking backend API health..."
if docker exec owu-hrms-backend-prod curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    success "Backend API is responding"
else
    alert "Backend API is not responding"
fi

# Check nginx configuration
info "Checking nginx configuration..."
if docker exec owu-hrms-nginx nginx -t > /dev/null 2>&1; then
    success "Nginx configuration is valid"
else
    alert "Nginx configuration has errors"
fi

# Check SSL certificate expiry (if SSL is configured)
if [[ -f "$PROJECT_DIR/nginx/ssl/fullchain.pem" ]]; then
    info "Checking SSL certificate expiry..."
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in "$PROJECT_DIR/nginx/ssl/fullchain.pem" | cut -d= -f2)
    CERT_EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s)
    CURRENT_EPOCH=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (CERT_EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
    
    if [[ $DAYS_UNTIL_EXPIRY -lt 30 ]]; then
        alert "SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
    elif [[ $DAYS_UNTIL_EXPIRY -lt 60 ]]; then
        warning "SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
    else
        success "SSL certificate is valid for $DAYS_UNTIL_EXPIRY days"
    fi
fi

# Check log file sizes
info "Checking log file sizes..."
LOG_DIR="$PROJECT_DIR/logs"
if [[ -d "$LOG_DIR" ]]; then
    find "$LOG_DIR" -name "*.log" -size +100M | while read large_log; do
        warning "Large log file detected: $large_log ($(du -h "$large_log" | cut -f1))"
    done
fi

# Check backup status
info "Checking backup status..."
BACKUP_DIR="$PROJECT_DIR/backups"
if [[ -d "$BACKUP_DIR" ]]; then
    LATEST_BACKUP=$(find "$BACKUP_DIR" -name "hrms_backup_*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    if [[ -n "$LATEST_BACKUP" ]]; then
        BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 86400 ))
        if [[ $BACKUP_AGE -gt 1 ]]; then
            warning "Latest backup is $BACKUP_AGE days old"
        else
            success "Latest backup is recent ($(basename "$LATEST_BACKUP"))"
        fi
    else
        warning "No backups found"
    fi
fi

# System uptime
UPTIME=$(uptime -p)
info "System uptime: $UPTIME"

# Docker system info
DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
info "Docker version: $DOCKER_VERSION"

info "Monitoring check completed"

# Optional: Send notification function
# send_alert_notification() {
#     local message="$1"
#     
#     # Example: Send email notification
#     # echo "HRMS Alert: $message" | mail -s "HRMS System Alert" admin@yourdomain.com
#     
#     # Example: Send Slack notification
#     # curl -X POST -H 'Content-type: application/json' \
#     #   --data "{\"text\":\"🚨 HRMS Alert: $message\"}" \
#     #   YOUR_SLACK_WEBHOOK_URL
#     
#     # Example: Send Discord notification
#     # curl -H "Content-Type: application/json" \
#     #   -d "{\"content\":\"🚨 HRMS Alert: $message\"}" \
#     #   YOUR_DISCORD_WEBHOOK_URL
# }

exit 0